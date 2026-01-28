// Chess game logic and rules

// Initialize standard chess board
export function createInitialBoard() {
  return [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["P", "P", "P", "P", "P", "P", "P", "P"],
    ["R", "N", "B", "Q", "K", "B", "N", "R"],
  ];
}

const DEFAULT_CASTLING_RIGHTS = {
  wKMoved: false,
  wLRookMoved: false,
  wRRookMoved: false,
  bKMoved: false,
  bLRookMoved: false,
  bRRookMoved: false,
};

// Piece utilities
export function isWhitePiece(piece) {
  return piece && piece === piece.toUpperCase();
}

export function isBlackPiece(piece) {
  return piece && piece === piece.toLowerCase();
}

export function getPieceColor(piece) {
  if (!piece) return null;
  return isWhitePiece(piece) ? "white" : "black";
}

export function getPieceType(piece) {
  if (!piece) return null;
  return piece.toLowerCase();
}

// Get all legal moves for a piece

export function getLegalMoves(board, row, col, currentPlayer, castlingRights) {
  const piece = board[row][col];
  if (!piece) return [];

  const pieceColor = getPieceColor(piece);
  if (pieceColor !== currentPlayer) return [];

  const pieceType = getPieceType(piece);
  let moves = [];

  switch (pieceType) {
    case "p": // Pawn
      moves = getPawnMoves(board, row, col, pieceColor);
      break;
    case "r": // Rook
      moves = getRookMoves(board, row, col, pieceColor);
      break;
    case "n": // Knight
      moves = getKnightMoves(board, row, col, pieceColor);
      break;
    case "b": // Bishop
      moves = getBishopMoves(board, row, col, pieceColor);
      break;
    case "q": // Queen
      moves = getQueenMoves(board, row, col, pieceColor);
      break;
    case "k": // King
      moves = getKingMoves(board, row, col, pieceColor, castlingRights);
      break;
  }

  // Filter out moves that would put own king in check
  return moves.filter((move) => {
    const testBoard = simulateMove(board, row, col, move.row, move.col);
    return !isKingInCheck(testBoard, pieceColor);
  });
}

function getPawnMoves(board, row, col, color) {
  const moves = [];
  const direction = color === "white" ? -1 : 1;
  const startRow = color === "white" ? 6 : 1;

  // Move forward one square
  const newRow = row + direction;
  if (isValidSquare(newRow, col) && !board[newRow][col]) {
    moves.push({ row: newRow, col });

    // Move forward two squares from start position
    if (row === startRow) {
      const twoSquares = row + 2 * direction;
      if (!board[twoSquares][col]) {
        moves.push({ row: twoSquares, col });
      }
    }
  }

  // Capture diagonally
  [-1, 1].forEach((dc) => {
    const newCol = col + dc;
    if (isValidSquare(newRow, newCol)) {
      const target = board[newRow][newCol];
      if (target && getPieceColor(target) !== color) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  });

  return moves;
}

function getRookMoves(board, row, col, color) {
  const moves = [];
  const directions = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  directions.forEach(([dr, dc]) => {
    let newRow = row + dr;
    let newCol = col + dc;

    while (isValidSquare(newRow, newCol)) {
      const target = board[newRow][newCol];
      if (!target) {
        moves.push({ row: newRow, col: newCol });
      } else {
        if (getPieceColor(target) !== color) {
          moves.push({ row: newRow, col: newCol });
        }
        break;
      }
      newRow += dr;
      newCol += dc;
    }
  });

  return moves;
}

function getKnightMoves(board, row, col, color) {
  const moves = [];
  const knightMoves = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];

  knightMoves.forEach(([dr, dc]) => {
    const newRow = row + dr;
    const newCol = col + dc;

    if (isValidSquare(newRow, newCol)) {
      const target = board[newRow][newCol];
      if (!target || getPieceColor(target) !== color) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  });

  return moves;
}

function getBishopMoves(board, row, col, color) {
  const moves = [];
  const directions = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  directions.forEach(([dr, dc]) => {
    let newRow = row + dr;
    let newCol = col + dc;

    while (isValidSquare(newRow, newCol)) {
      const target = board[newRow][newCol];
      if (!target) {
        moves.push({ row: newRow, col: newCol });
      } else {
        if (getPieceColor(target) !== color) {
          moves.push({ row: newRow, col: newCol });
        }
        break;
      }
      newRow += dr;
      newCol += dc;
    }
  });

  return moves;
}

function getQueenMoves(board, row, col, color) {
  return [
    ...getRookMoves(board, row, col, color),
    ...getBishopMoves(board, row, col, color),
  ];
}

function getKingMoves(
  board,
  row,
  col,
  color,
  castlingRights = DEFAULT_CASTLING_RIGHTS,
  forAttack = false
) {
  const moves = [];
  const kingMoves = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  // Normal king moves
  kingMoves.forEach(([dr, dc]) => {
    const r = row + dr;
    const c = col + dc;
    if (isValidSquare(r, c)) {
      const target = board[r][c];
      if (!target || getPieceColor(target) !== color) {
        moves.push({ row: r, col: c });
      }
    }
  });

  // ❌ Cannot castle if in check
  if (forAttack) return moves;
  if (isKingInCheck(board, color)) return moves;

  // 🟢 WHITE CASTLING
  if (!forAttack && color === "white" && !castlingRights.wKMoved) {
    // King side (O-O)
    if (
      !castlingRights.wRRookMoved &&
      !board[7][5] &&
      !board[7][6] &&
      !isSquareUnderAttack(board, 7, 5, "black") &&
      !isSquareUnderAttack(board, 7, 6, "black")
    ) {
      moves.push({ row: 7, col: 6 });
    }

    // Queen side (O-O-O)
    if (
      !castlingRights.wLRookMoved &&
      !board[7][1] &&
      !board[7][2] &&
      !board[7][3] &&
      !isSquareUnderAttack(board, 7, 2, "black") &&
      !isSquareUnderAttack(board, 7, 3, "black")
    ) {
      moves.push({ row: 7, col: 2 });
    }
  }

  // 🟢 BLACK CASTLING
  if (!forAttack && color === "black" && !castlingRights.bKMoved) {
    // King side
    if (
      !castlingRights.bRRookMoved &&
      !board[0][5] &&
      !board[0][6] &&
      !isSquareUnderAttack(board, 0, 5, "white") &&
      !isSquareUnderAttack(board, 0, 6, "white")
    ) {
      moves.push({ row: 0, col: 6 });
    }

    // Queen side
    if (
      !castlingRights.bLRookMoved &&
      !board[0][1] &&
      !board[0][2] &&
      !board[0][3] &&
      !isSquareUnderAttack(board, 0, 2, "white") &&
      !isSquareUnderAttack(board, 0, 3, "white")
    ) {
      moves.push({ row: 0, col: 2 });
    }
  }

  return moves;
}

function isValidSquare(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Simulate a move without modifying the original board
export function simulateMove(board, fromRow, fromCol, toRow, toCol) {
  const newBoard = board.map((row) => [...row]);
  const piece = newBoard[fromRow][fromCol];

  // Castling simulation
  if (piece?.toLowerCase() === "k" && Math.abs(toCol - fromCol) === 2) {
    if (toCol === 6) {
      newBoard[toRow][5] = newBoard[toRow][7];
      newBoard[toRow][7] = null;
    }
    if (toCol === 2) {
      newBoard[toRow][3] = newBoard[toRow][0];
      newBoard[toRow][0] = null;
    }
  }

  newBoard[toRow][toCol] = piece;
  newBoard[fromRow][fromCol] = null;
  return newBoard;
}

// Execute a move and return new board + captured piece
export function makeMove(
  board,
  fromRow,
  fromCol,
  toRow,
  toCol,
  promotionPiece = null,
) {
  const newBoard = board.map((row) => [...row]);
  let piece = newBoard[fromRow][fromCol];
  const capturedPiece = newBoard[toRow][toCol];

  // Castling: move rook
  if (piece?.toLowerCase() === "k" && Math.abs(toCol - fromCol) === 2) {
    // King side
    if (toCol === 6) {
      newBoard[toRow][5] = newBoard[toRow][7];
      newBoard[toRow][7] = null;
    }
    // Queen side
    if (toCol === 2) {
      newBoard[toRow][3] = newBoard[toRow][0];
      newBoard[toRow][0] = null;
    }
  }

  // Pawn promotion
  if (piece?.toLowerCase() === "p" && (toRow === 0 || toRow === 7)) {
    piece = promotionPiece || (piece === "P" ? "Q" : "q");
  }

  newBoard[toRow][toCol] = piece;
  newBoard[fromRow][fromCol] = null;

  return { board: newBoard, capturedPiece };
}

// Find king position
export function findKing(board, color) {
  const kingPiece = color === "white" ? "K" : "k";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === kingPiece) {
        return { row, col };
      }
    }
  }
  return null;
}

// Check if a square is under attack
export function isSquareUnderAttack(board, row, col, attackingColor) {
  // Check all opponent pieces to see if they can attack this square
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === attackingColor) {
        const moves = getLegalMovesWithoutCheckValidation(
          board,
          r,
          c,
          attackingColor,
        );
        if (moves.some((move) => move.row === row && move.col === col)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Get legal moves without check validation (to avoid infinite recursion)
function getLegalMovesWithoutCheckValidation(board, row, col, color) {
  const piece = board[row][col];
  if (!piece) return [];

  const pieceType = getPieceType(piece);

  switch (pieceType) {
    case "p":
      return getPawnMoves(board, row, col, color);
    case "r":
      return getRookMoves(board, row, col, color);
    case "n":
      return getKnightMoves(board, row, col, color);
    case "b":
      return getBishopMoves(board, row, col, color);
    case "q":
      return getQueenMoves(board, row, col, color);
    case "k":
      return getKingMoves(board, row, col, color, null, true);
    default:
      return [];
  }
}

// Check if king is in check
export function isKingInCheck(board, color) {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;

  const opponentColor = color === "white" ? "black" : "white";
  return isSquareUnderAttack(board, kingPos.row, kingPos.col, opponentColor);
}

// Check if checkmate
export function isCheckmate(board, color) {
  if (!isKingInCheck(board, color)) return false;

  // Check if any piece can make a legal move
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && getPieceColor(piece) === color) {
        const moves = getLegalMoves(board, row, col, color, DEFAULT_CASTLING_RIGHTS);
        if (moves.length > 0) return false;
      }
    }
  }

  return true;
}

// Check if stalemate
export function isStalemate(board, color) {
  if (isKingInCheck(board, color)) return false;

  // Check if any piece can make a legal move
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && getPieceColor(piece) === color) {
        const moves = getLegalMoves(board, row, col, color, DEFAULT_CASTLING_RIGHTS);
        if (moves.length > 0) return false;
      }
    }
  }

  return true;
}

// Get all possible moves for AI
export function getAllLegalMoves(board, color) {
  const moves = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && getPieceColor(piece) === color) {
        const pieceMoves = getLegalMoves(board, row, col, color);
        pieceMoves.forEach((move) => {
          moves.push({
            from: { row, col },
            to: { row: move.row, col: move.col },
            piece,
          });
        });
      }
    }
  }

  return moves;
}

// Evaluate board position (simple material counting)
export function evaluateBoard(board) {
  const pieceValues = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
    P: -1,
    N: -3,
    B: -3,
    R: -5,
    Q: -9,
    K: 0,
  };

  let score = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        score += pieceValues[piece] || 0;
      }
    }
  }

  return score; // Positive = black ahead, negative = white ahead
}
