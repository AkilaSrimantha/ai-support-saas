const { Type } = require('@google/genai');
const { getGeminiClient, getGeminiModel } = require('../config/gemini');
const { retrieveRelevantContext } = require('./rag.service');

const ANGRY_KEYWORDS = [
  'angry', 'furious', 'terrible', 'horrible', 'worst', 'scam', 'fraud',
  'refund', 'useless', 'stupid', 'hate', 'broken', 'cancel', 'lawsuit',
  'unacceptable', 'ridiculous', 'fed up', 'complaint', 'speak to manager',
  'human', 'agent', 'representative', 'real person', 'support person',
];

const HAPPY_KEYWORDS = [
  'thank', 'thanks', 'awesome', 'great', 'love', 'amazing', 'helpful',
  'perfect', 'excellent', 'nice', 'good', 'appreciate', 'wonderful',
];

function fallbackSentimentAnalysis(text) {
  const lower = (text || '').toLowerCase();
  const angryHits = ANGRY_KEYWORDS.filter((kw) => lower.includes(kw));
  const happyHits = HAPPY_KEYWORDS.filter((kw) => lower.includes(kw));

  const asksForHuman =
    lower.includes('human') ||
    lower.includes('real person') ||
    lower.includes('live agent') ||
    lower.includes('speak to an agent') ||
    lower.includes('talk to someone');

  if (angryHits.length > 0) {
    return {
      sentiment: 'angry',
      sentimentScore: -0.75,
      asksForHuman: asksForHuman || angryHits.length >= 2,
    };
  }
  if (happyHits.length > 0) {
    return {
      sentiment: 'happy',
      sentimentScore: 0.8,
      asksForHuman,
    };
  }
  return {
    sentiment: 'neutral',
    sentimentScore: 0.0,
    asksForHuman,
  };
}

/**
 * Generate an AI support reply grounded in RAG context and perform sentiment & handoff analysis.
 */
async function generateSupportReply({ bot, history = [], userMessage }) {
  const chunks = await retrieveRelevantContext(bot.id, userMessage, 5);
  const contextBlock = chunks.length
    ? chunks
        .map((c, idx) => `[Source ${idx + 1}: ${c.title}${c.url ? ` (${c.url})` : ''}]\n${c.content}`)
        .join('\n\n')
    : 'No website knowledge base has been trained yet.';

  const conversationHistory = history
    .slice(-10)
    .map((m) => `${m.sender_type === 'visitor' ? 'Customer' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const heuristic = fallbackSentimentAnalysis(userMessage);
  const ai = getGeminiClient();

  if (!ai) {
    // Graceful local fallback when GEMINI_API_KEY is not configured yet
    if (heuristic.asksForHuman) {
      return {
        reply:
          "I understand you'd like to speak with a human specialist. I am connecting you to our support team right now — an agent will be with you shortly.",
        sentiment: heuristic.sentiment,
        sentimentScore: heuristic.sentimentScore,
        needsHandoff: true,
        handoffReason:
          heuristic.sentiment === 'angry'
            ? 'Frustrated customer / escalation requested'
            : 'Customer requested human agent',
        usedSources: chunks.map((c) => c.title),
      };
    }

    const snippet = chunks[0]?.content?.slice(0, 320);
    return {
      reply: snippet
        ? `Based on our knowledge base (${chunks[0].title}): ${snippet}${chunks[0].content.length > 320 ? '...' : ''}\n\n*(Tip: Add your GEMINI_API_KEY in server/.env for full conversational Gemini AI replies.)*`
        : "Thanks for reaching out! I don't have trained website content for that question yet. Would you like me to connect you with a human support agent?",
      sentiment: heuristic.sentiment,
      sentimentScore: heuristic.sentimentScore,
      needsHandoff: false,
      handoffReason: null,
      usedSources: chunks.map((c) => c.title),
    };
  }

  const systemInstruction = `
You are "${bot.name}", a helpful, polite, 24/7 AI Customer Support Assistant.
${bot.system_prompt ? `Tenant Custom Instructions: ${bot.system_prompt}` : ''}

Rules:
1. Answer the customer's question accurately using ONLY the provided Knowledge Base Context when possible.
2. Keep replies concise, friendly, and directly actionable.
3. Analyze the customer's message sentiment: "happy", "neutral", or "angry", and give a sentimentScore from -1.0 (very angry) to 1.0 (very happy).
4. Set needsHandoff = true ONLY if:
   - The customer explicitly asks for a human/agent/manager, OR
   - The customer is strongly angry/frustrated and needs human intervention, OR
   - The question cannot be answered from the Knowledge Base Context and requires account-specific or human help (e.g., billing dispute, bug escalation, refund).
5. If needsHandoff is true, warmly tell the customer you are transferring them to a human support agent and creating a ticket if needed.
`;

  const prompt = `
--- KNOWLEDGE BASE CONTEXT ---
${contextBlock}

--- RECENT CONVERSATION ---
${conversationHistory || 'None'}

--- LATEST CUSTOMER MESSAGE ---
${userMessage}
`;

  try {
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            sentiment: { type: Type.STRING, enum: ['happy', 'neutral', 'angry'] },
            sentimentScore: { type: Type.NUMBER },
            needsHandoff: { type: Type.BOOLEAN },
            handoffReason: { type: Type.STRING, nullable: true },
          },
          required: ['reply', 'sentiment', 'sentimentScore', 'needsHandoff'],
        },
      },
    });

    const parsed = JSON.parse(response.text);
    return {
      reply: parsed.reply,
      sentiment: ['happy', 'neutral', 'angry'].includes(parsed.sentiment)
        ? parsed.sentiment
        : heuristic.sentiment,
      sentimentScore:
        typeof parsed.sentimentScore === 'number'
          ? Math.max(-1, Math.min(1, parsed.sentimentScore))
          : heuristic.sentimentScore,
      needsHandoff: Boolean(parsed.needsHandoff),
      handoffReason: parsed.handoffReason || null,
      usedSources: chunks.map((c) => c.title),
    };
  } catch (err) {
    console.error('Gemini API error, using fallback:', err.message);
    return {
      reply: chunks[0]?.content
        ? `Here is what I found in our help center (${chunks[0].title}): ${chunks[0].content.slice(0, 300)}...`
        : "I'm having trouble processing that right now. Let me connect you with a human support agent to help right away.",
      sentiment: heuristic.sentiment,
      sentimentScore: heuristic.sentimentScore,
      needsHandoff: heuristic.asksForHuman || !chunks.length,
      handoffReason: heuristic.asksForHuman ? 'Customer requested human agent' : 'AI service fallback',
      usedSources: chunks.map((c) => c.title),
    };
  }
}

module.exports = {
  generateSupportReply,
};
