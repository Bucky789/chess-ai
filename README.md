# ♟️ Chess.AI

A modern web-based chess application built with React, featuring human vs human play and human vs Stockfish AI.  
Includes full chess rules support such as castling, check/checkmate detection, move history, and pawn promotion.

## ✨ Features

- ♜ Human vs Human
- ♚ Human vs Stockfish AI (Web Worker)
- ♕ Pawn Promotion (Queen, Rook, Bishop, Knight)
- ♖ Castling (King & Queen side)
- ♔ Check, Checkmate & Stalemate detection
- 📜 Move history with navigation
- ♻️ Captured pieces tracking
- 🎨 Clean, modern UI

## 🧠 AI Engine

- Uses **Stockfish.js** (v10) via CDN
- Runs inside a Web Worker (non-blocking)
- Auto-queen promotion for AI (stable & fast)

## 🛠 Tech Stack

- **React**
- **JavaScript (ES6+)**
- **Stockfish.js**
- **Web Workers**
- **CSS (custom styling)**

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn

### Install & Run Locally

```bash
npm install
npm run dev
```

### Build for Production
```npm run build```
### 🌐 Deployment
This app is optimized for static hosting platforms such as:

-Vercel (recommended)

-Netlify

No backend required.

📂 Project Structure

src/

 ├─ App.jsx
 
 ├─ utils/
 
 │   ├─ chessLogic.js
 
 │   └─ ai.js
 
 └─ assets/
 
📌 Notes
AI under-promotion is intentionally simplified to queen promotion for stability.

The chess engine logic is custom-built (no external chess libraries).
