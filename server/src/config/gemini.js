const { GoogleGenAI } = require('@google/genai');

let aiClient = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

module.exports = {
  getGeminiClient,
  getGeminiModel,
};
