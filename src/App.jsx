import React, { useState, useEffect, useRef } from "react";
import {
  createInitialBoard,
  getLegalMoves,
  makeMove,
  isKingInCheck,
  isCheckmate,
  isStalemate,
  getPieceColor,
} from "./utils/chessLogic.js";
import { getBestMove } from "./utils/ai.js";

const PIECE_IMAGES = {
  K: "https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg",
  Q: "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg",
  R: "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg",
  B: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg",
  N: "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg",
  P: "https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg",
  k: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg",
  q: "https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg",
  r: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg",
  b: "https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg",
  n: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg",
  p: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg",
};

const getNotation = (piece, r1, c1, r2, c2, promotionPiece = null) => {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

  // Castling
  if (piece.toLowerCase() === "k" && Math.abs(c2 - c1) === 2) {
    return c2 > c1 ? "O-O" : "O-O-O";
  }

  const toSquare = `${files[c2]}${8 - r2}`;

  // Pawn promotion notation
  if (piece.toLowerCase() === "p" && (r2 === 0 || r2 === 7) && promotionPiece) {
    return `${toSquare}=${promotionPiece.toUpperCase()}`;
  }

  // Normal move
  const pName = piece.toUpperCase() === "P" ? "" : piece.toUpperCase();
  return `${pName}${files[c1]}${8 - r1} → ${toSquare}`;
};

export default function ChessGame() {
  const [pendingPromotion, setPendingPromotion] = useState(null);

  // --- SETUP STATE ---
  const [gameStarted, setGameStarted] = useState(false);
  const [playerNames, setPlayerNames] = useState({
    white: "Player 1",
    black: "Player 2",
  });
  const [tempNames, setTempNames] = useState({ white: "", black: "" });

  // --- GAME STATE ---
  const [history, setHistory] = useState([createInitialBoard()]);
  const [moveList, setMoveList] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [castlingRights, setCastlingRights] = useState({
    wKMoved: false,
    wLRookMoved: false,
    wRRookMoved: false,
    bKMoved: false,
    bLRookMoved: false,
    bRRookMoved: false,
  });

  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState("white");
  const [captured, setCaptured] = useState({ white: [], black: [] });
  const [gameStatus, setGameStatus] = useState("playing");
  const [aiMode, setAiMode] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const board = history[currentStep];
  const isAtLatestMove = currentStep === history.length - 1;
  const scrollRef = useRef(null);

  // Auto-detect Checkmate / Stalemate
  useEffect(() => {
    const latestBoard = history[history.length - 1];
    if (isCheckmate(latestBoard, currentPlayer)) {
      setGameStatus("checkmate");
    } else if (isStalemate(latestBoard, currentPlayer)) {
      setGameStatus("stalemate");
    }
  }, [history, currentPlayer]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [moveList]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        setCurrentStep((prev) => Math.max(0, prev - 1));
        setSelected(null);
        setLegalMoves([]);
      } else if (e.key === "ArrowRight") {
        setCurrentStep((prev) => Math.min(history.length - 1, prev + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history.length]);

  useEffect(() => {
    document.body.style.background = "#0f172a";
    const style = document.createElement("style");
    style.textContent = `
      :root {
        --board-size: min(70vw, 70vh);
        --square-size: calc(var(--board-size) / 8);
      }
      .chess-container { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 100vw; height: 100vh; padding: 0; margin: 0; min-height: 100vh; font-family: 'Inter', sans-serif; color: white; position: relative; }
      .chess-layout { display: flex; gap: 24px; width: 100%; max-width: 1200px; justify-content: center; flex-wrap: wrap; }
      .chess-board { display: grid; grid-template-columns: repeat(8, var(--square-size)); width: var(--board-size); height: var(--board-size); border: 6px solid #334155; border-radius: 8px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); position: relative; }
      .chess-square { width: var(--square-size); height: var(--square-size); display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; }
      .light { background: #cbd5e1; } .dark { background: #475569; }
      .selected { background: #fbbf24 !important; }
      .legal::after { content: ''; width: 20%; height: 20%; background: rgba(34,197,94,0.5); border-radius: 50%; position: absolute; }
      .can-capture { background: rgba(239,68,68,0.35) !important; box-shadow: inset 0 0 15px rgba(239,68,68,0.6); }
      .piece-img { width: 85%; height: 85%; pointer-events: none; filter: drop-shadow(0 4px 2px rgba(0,0,0,0.3)); }
      .sidebar { flex: 1; min-width: 260px; max-width: 320px; display: flex; flex-direction: column; gap: 14px; }
      .player-card, .control-panel { background: rgba(30,41,59,0.8); backdrop-filter: blur(10px); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
      .active-turn { border: 2px solid #3b82f6; box-shadow: 0 0 10px rgba(59,130,246,0.5); }
      .captured-row { display: flex; flex-wrap: wrap; gap: 4px; min-height: 24px; }
      .cap-img { width: 22px; height: 22px; }
      .history-panel { height: 250px; flex-grow: 1; background: rgba(15,23,42,0.6); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; overflow: hidden; min-height: 200px; }
      .history-header { padding: 8px 12px; background: rgba(255,255,255,0.05); font-size: 11px; font-weight: bold; color: #94a3b8; }
      .history-list { overflow-y: auto; padding: 10px; font-family: monospace; font-size: 12px; flex-grow: 1; scrollbar-width: thin; scrollbar-color: #475569 transparent;}
      .history-list::-webkit-scrollbar { width: 6px;}
      .history-list::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 10px;}
      .move-row { display: flex; padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
      .move-num { width: 25px; color: #64748b; }
      .btn { width: 100%; padding: 12px; background: #3b82f6; border: none; border-radius: 6px; color: white; font-weight: bold; cursor: pointer; transition: 0.2s; }
      .btn:hover { background: #2563eb; }

      /* SETUP MODAL */
      .setup-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: #0f172a; display: flex; align-items: center; justify-content: center;
        z-index: 1000; padding: 20px;
      }
      .setup-box {
        background: #1e293b; width: 100%; max-width: 400px;
        padding: 40px; border-radius: 20px; box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.1); text-align: center;
      }
      .setup-box h2 { margin-bottom: 30px; letter-spacing: 2px; }
      .input-group { text-align: left; margin-bottom: 20px; }
      .input-group label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 8px; font-weight: bold; }
      .setup-input {
        width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155;
        border-radius: 8px; color: white; outline: none; transition: 0.3s;
      }
      .setup-input:focus { border-color: #3b82f6; }
      .toggle-row { display: flex; justify-content: space-between; align-items: center; margin: 25px 0; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px; }

      /* GAME OVER MODAL */
      .game-over-overlay {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100; border-radius: 4px;
      }
      .modal-box {
        background: #1e293b; padding: 30px; border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.1); text-align: center;
      }
      .winner-text { font-size: 32px; font-weight: 900; margin-bottom: 8px; color: #fbbf24; }

      .chess-container, .chess-container * { user-select: none; -webkit-user-select: none; }
      .piece-img, .cap-img { -webkit-user-drag: none; pointer-events: none; }

      @media (max-width: 768px) {
  :root {
    --board-size: 92vw;
  }
}

@media (max-width: 768px) {

  .chess-container {
    justify-content: flex-start;
    min-height: 100svh;
  }

  .chess-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .chess-board {
    margin: 0;
    box-shadow: none;
    border-width: 3px;
  }

  .sidebar {
    width: 100%;
    max-width: 100%;
    min-width: unset;
  }

  .history-panel {
    height: 110px;
  }

  h1 {
    font-size: 32px !important;
    margin: 6px 0 10px 0 !important;
  }
}

    `;
    document.head.appendChild(style);
  }, []);

  const handleStartGame = () => {
    setPlayerNames({
      white: tempNames.white || "Player 1",
      black: aiMode ? "Stockfish AI" : tempNames.black || "Player 2",
    });
    setGameStarted(true);
  };

  const executeMove = (fromR, fromC, toR, toC, promotionPiece = null) => {
    if (gameStatus !== "playing") return;
    const latestBoard = history[history.length - 1];
    const piece = latestBoard[fromR][fromC];
    // 🔥 PAWN PROMOTION DETECTION
    if (
      piece?.toLowerCase() === "p" &&
      (toR === 0 || toR === 7) &&
      !promotionPiece
    ) {
      setPendingPromotion({ fromR, fromC, toR, toC, piece });
      return;
    }
    const newRights = { ...castlingRights };
    if (piece === "K") newRights.wKMoved = true;
    if (piece === "k") newRights.bKMoved = true;
    if (piece === "R") {
      if (fromR === 7 && fromC === 0) newRights.wLRookMoved = true;
      if (fromR === 7 && fromC === 7) newRights.wRRookMoved = true;
    }
    if (piece === "r") {
      if (fromR === 0 && fromC === 0) newRights.bLRookMoved = true;
      if (fromR === 0 && fromC === 7) newRights.bRRookMoved = true;
    }
    setCastlingRights(newRights);

    const { board: nextBoard, capturedPiece } = makeMove(
      latestBoard,
      fromR,
      fromC,
      toR,
      toC,
      promotionPiece,
    );

    if (capturedPiece) {
      setCaptured((prev) => ({
        ...prev,
        [currentPlayer]: [...prev[currentPlayer], capturedPiece],
      }));
    }

    const moveStr = getNotation(piece, fromR, fromC, toR, toC, promotionPiece);

    setMoveList([...moveList, moveStr]);

    const newHistory = [...history, nextBoard];
    setHistory(newHistory);
    setCurrentStep(newHistory.length - 1);
    setCurrentPlayer(currentPlayer === "white" ? "black" : "white");
  };

  const handleClick = (r, c) => {
    if (
      !isAtLatestMove ||
      aiThinking ||
      (aiMode && currentPlayer === "black") ||
      gameStatus !== "playing"
    )
      return;

    const move = legalMoves.find((m) => m.row === r && m.col === c);
    if (selected && move) {
      executeMove(selected.row, selected.col, r, c);
      setSelected(null);
      setLegalMoves([]);
    } else {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === currentPlayer) {
        setSelected({ row: r, col: c });
        setLegalMoves(
          getLegalMoves(board, r, c, currentPlayer, castlingRights),
        );
      } else {
        setSelected(null);
        setLegalMoves([]);
      }
    }
  };

  useEffect(() => {
    if (
      !gameStarted ||
      !aiMode ||
      currentPlayer !== "black" ||
      gameStatus !== "playing" ||
      !isAtLatestMove
    )
      return;

    setAiThinking(true);

    const timer = setTimeout(async () => {
      const latestBoard = history[history.length - 1];

      const move = await getBestMove(latestBoard, "black", castlingRights, 10);

      if (move) {
        executeMove(move.from.row, move.from.col, move.to.row, move.to.col);
      }

      setAiThinking(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [currentPlayer, aiMode, isAtLatestMove, gameStatus, gameStarted]);

  const resetGame = () => window.location.reload();

  return (
    <div className="chess-container">
      {/* INITIAL SETUP OVERLAY */}
      {!gameStarted && (
        <div className="setup-overlay">
          <div className="setup-box">
            <h1>WhiteToMove</h1>
            <h2>NEW GAME</h2>
            <div className="input-group">
              <label>PLAYER 1 (WHITE)</label>
              <input
                className="setup-input"
                placeholder="Enter Name"
                value={tempNames.white}
                onChange={(e) =>
                  setTempNames({ ...tempNames, white: e.target.value })
                }
              />
            </div>

            {!aiMode && (
              <div className="input-group">
                <label>PLAYER 2 (BLACK)</label>
                <input
                  className="setup-input"
                  placeholder="Enter Name"
                  value={tempNames.black}
                  onChange={(e) =>
                    setTempNames({ ...tempNames, black: e.target.value })
                  }
                />
              </div>
            )}

            <div className="toggle-row">
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                Play against AI?
              </span>
              <input
                type="checkbox"
                style={{ width: 20, height: 20, cursor: "pointer" }}
                checked={aiMode}
                onChange={() => setAiMode(!aiMode)}
              />
            </div>

            <button className="btn" onClick={handleStartGame}>
              START GAME
            </button>
          </div>
        </div>
      )}

      <h1
        style={{
          letterSpacing: "2px",
          fontSize: "100px",
          marginBottom: "20px",
        }}
      >
        WhiteToMove
      </h1>

      <div className="chess-layout layout-desktop">
        {pendingPromotion && (
          <div className="game-over-overlay">
            <div className="modal-box">
              <h2 style={{ marginBottom: 16 }}>Promote Pawn</h2>
              <div style={{ display: "flex", gap: 12 }}>
                {["Q", "R", "B", "N"].map((p) => {
                  const isWhite = pendingPromotion.piece === "P";
                  const finalPiece = isWhite ? p : p.toLowerCase();
                  return (
                    <button
                      key={p}
                      className="btn"
                      onClick={() => {
                        const { fromR, fromC, toR, toC } = pendingPromotion;
                        setPendingPromotion(null);
                        executeMove(fromR, fromC, toR, toC, finalPiece);
                      }}
                    >
                      <img
                        src={PIECE_IMAGES[finalPiece]}
                        style={{ width: 40, height: 40 }}
                        alt={p}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="chess-board">
          {/* GAME OVER POPUP */}
          {gameStatus !== "playing" && (
            <div className="game-over-overlay">
              <div className="modal-box">
                <div className="winner-text">
                  {gameStatus === "stalemate"
                    ? "DRAW"
                    : currentPlayer === "white"
                      ? "BLACK WINS"
                      : "WHITE WINS"}
                </div>
                <div
                  className="reason-text"
                  style={{ color: "#94a3b8", marginBottom: 20 }}
                >
                  {gameStatus === "checkmate"
                    ? "Victory by Checkmate"
                    : "Game drawn by Stalemate"}
                </div>
                <button className="btn" onClick={resetGame}>
                  Rematch
                </button>
              </div>
            </div>
          )}

          {board.map((row, r) =>
            row.map((piece, c) => {
              const isLegal = legalMoves.some(
                (m) => m.row === r && m.col === c,
              );
              const isCapture =
                isLegal && piece && getPieceColor(piece) !== currentPlayer;
              return (
                <div
                  key={`${r}-${c}`}
                  className={`chess-square ${(r + c) % 2 === 0 ? "light" : "dark"} ${selected?.row === r && selected?.col === c ? "selected" : ""} ${isLegal && !isCapture ? "legal" : ""} ${isCapture ? "can-capture" : ""}`}
                  onClick={() => handleClick(r, c)}
                >
                  {piece && (
                    <img
                      src={PIECE_IMAGES[piece]}
                      className="piece-img"
                      alt="chess piece"
                    />
                  )}
                </div>
              );
            }),
          )}
        </div>

        <div className="sidebar">
          {/* OPPONENT CARD */}
          <div
            className={`player-card ${currentPlayer === "black" ? "active-turn" : ""}`}
          >
            <div
              className="player-info"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: "#475569",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  {aiMode ? "🤖" : "P2"}
                </div>
                <span style={{ fontWeight: "bold" }}>{playerNames.black}</span>
              </div>
              {aiThinking && (
                <span style={{ fontSize: "10px", color: "#3b82f6" }}>
                  THINKING...
                </span>
              )}
            </div>
            <div className="captured-row" style={{ marginTop: "10px" }}>
              {captured.black.map((p, i) => (
                <img
                  key={i}
                  src={PIECE_IMAGES[p]}
                  className="cap-img"
                  alt="captured"
                />
              ))}
            </div>
          </div>

          {/* HISTORY */}
          <div className="history-panel">
            <div className="history-header">MOVE HISTORY</div>
            <div className="history-list" ref={scrollRef}>
              {moveList.map((move, i) => (
                <div key={i} className="move-row">
                  <span className="move-num">{i + 1}.</span>
                  <span className="move-text">
                    {i % 2 === 0 ? "White" : "Black"}: {move}
                  </span>
                </div>
              ))}
              {!isAtLatestMove && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#ef4444",
                    padding: "5px",
                    fontSize: "11px",
                  }}
                >
                  VIEWING PAST
                </div>
              )}
            </div>
          </div>

          {/* PLAYER CARD */}
          <div
            className={`player-card ${currentPlayer === "white" ? "active-turn" : ""}`}
          >
            <div className="player-info">
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: "#475569",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  P1
                </div>
                <span style={{ fontWeight: "bold" }}>{playerNames.white}</span>
              </div>
            </div>
            <div className="captured-row" style={{ marginTop: "10px" }}>
              {captured.white.map((p, i) => (
                <img
                  key={i}
                  src={PIECE_IMAGES[p]}
                  className="cap-img"
                  alt="captured"
                />
              ))}
            </div>
          </div>

          <div className="control-panel">
            <button className="btn" onClick={resetGame}>
              New Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
