# AI-Driven SaaS Customer Support & Ticketing System

A full-stack multi-tenant SaaS customer support platform featuring:
- **2-Line Embeddable Chat Widget** (`widget.js`) isolated inside a **Shadow DOM** so host site styles never collide.
- **Google Gemini AI Support Engine** with RAG over scraped website URLs & manual FAQs.
- **Real-Time Sentiment Analysis** (`😊 Happy`, `😐 Neutral`, `😡 Angry`) with live agent alerts.
- **Seamless Human Handoff & Auto-Ticketing** via Socket.io (`User <-> AI <-> Human Agent`).
- **Admin & Agent Dashboard** built with React, Vite, and Tailwind CSS.

---

## Project Structure

```
ai-support-saas/
├── database/schema.sql     # MySQL schema (users, bots, knowledge_sources, knowledge_chunks, chats, messages, tickets)
├── server/                 # Node.js + Express + Socket.io + MySQL + Gemini API
├── dashboard/              # React + Vite + Tailwind Admin & Agent Dashboard
└── widget/                 # Preact + Vite Shadow DOM Widget -> compiles to dist/widget.js
```

---

## Setup & Running Locally

### 1. MySQL Database
Import `database/schema.sql` into your MySQL server:
```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend Server (`server/`)
Configure `server/.env` with your MySQL credentials and `GEMINI_API_KEY`, then run:
```bash
cd server
npm install
npm run dev
```
Server runs on `http://localhost:5000`.

### 3. Build the Embeddable Widget (`widget/`)
```bash
cd widget
npm install
npm run build
```
This outputs a single bundle `widget/dist/widget.js`, automatically served by the backend at `http://localhost:5000/widget.js`.

### 4. Admin & Agent Dashboard (`dashboard/`)
```bash
cd dashboard
npm install
npm run dev
```
Open `http://localhost:5173`, create a tenant account, copy your 2-line embed code from **Widget & Embed**, or click **Test Live Demo Page** (`http://localhost:5000/demo?botKey=YOUR_KEY`).
