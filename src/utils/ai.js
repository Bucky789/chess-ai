// utils/ai.js
// Stockfish via CDN + Blob Worker
// GUARANTEES: getBestMove NEVER returns null

let sfWorker = null;
let sfReady = false;
let pendingResolve = null;
let readyPromise = null;

// --------------------
// INIT STOCKFISH
// --------------------
async function initStockfish() {
  if (sfWorker) return readyPromise;

  

  readyPromise = new Promise(async (resolve) => {
    const response = await fetch(
      'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js'
    );
    const script = await response.text();

    const blob = new Blob([script], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    sfWorker = new Worker(workerUrl);

    sfWorker.onmessage = (e) => {
      const msg = e.data;
      

      if (msg === 'readyok') {
        sfReady = true;
        
        resolve();
      }

      if (msg.startsWith('bestmove') && pendingResolve) {
        const moveStr = msg.split(' ')[1];
        

        const resolveMove = pendingResolve;
        pendingResolve = null;

        resolveMove(
          moveStr === '(none)' ? null : uciToMove(moveStr)
        );
      }
    };

    sfWorker.postMessage('uci');
    sfWorker.postMessage('isready');
  });

  return readyPromise;
}

// --------------------
// BOARD → FEN
// --------------------
function boardToFen(board, turn, rights) {
  let fen = '';

  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) empty++;
      else {
        if (empty) {
          fen += empty;
          empty = 0;
        }
        fen += p;
      }
    }
    if (empty) fen += empty;
    if (r < 7) fen += '/';
  }

  const active = turn === 'white' ? 'w' : 'b';

  let castling = '';
  if (!rights.wKMoved) {
    if (!rights.wRRookMoved) castling += 'K';
    if (!rights.wLRookMoved) castling += 'Q';
  }
  if (!rights.bKMoved) {
    if (!rights.bRRookMoved) castling += 'k';
    if (!rights.bLRookMoved) castling += 'q';
  }

  return `${fen} ${active} ${castling || '-'} - 0 1`;
}

// --------------------
// UCI → MOVE
// --------------------
function uciToMove(uci) {
  const files = ['a','b','c','d','e','f','g','h'];
  return {
    from: {
      row: 8 - parseInt(uci[1], 10),
      col: files.indexOf(uci[0])
    },
    to: {
      row: 8 - parseInt(uci[3], 10),
      col: files.indexOf(uci[2])
    }
  };
}

// --------------------
// PUBLIC API (SAFE)
// --------------------
export async function getBestMove(board, color, castlingRights, depth = 10) {
  

  // 🔒 HARD GUARANTEE: wait for engine
  await initStockfish();

  // 🔒 HARD GUARANTEE: no overlapping searches
  if (pendingResolve) {
    console.warn('[AI] Search already running, skipping');
    return null;
  }

  const fen = boardToFen(board, color, castlingRights);
  

  return new Promise((resolve) => {
    pendingResolve = resolve;

    sfWorker.postMessage('stop');
    sfWorker.postMessage(`position fen ${fen}`);
    sfWorker.postMessage(`go depth ${depth}`);
  });
}
