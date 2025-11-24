const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Game rooms storage
const rooms = new Map();

// Game logic helper functions
function createInitialGameState(roomCode, players) {
  const colors = ['red', 'blue', 'green', 'yellow'];
  const gameState = {
    roomCode,
    players: players.map((player, index) => ({
      id: player.id,
      name: player.name,
      color: colors[index],
      pawns: [
        { id: 0, position: -1, inHome: true, inGoal: false },
        { id: 1, position: -1, inHome: true, inGoal: false },
        { id: 2, position: -1, inHome: true, inGoal: false },
        { id: 3, position: -1, inHome: true, inGoal: false }
      ],
      goalCount: 0
    })),
    currentPlayerIndex: 0,
    diceValue: 0,
    gameStarted: false,
    gameOver: false,
    winner: null,
    canRollDice: true,
    lastRollWasSix: false,
    consecutiveSixes: 0
  };
  return gameState;
}

function getStartPosition(playerIndex) {
  return playerIndex * 13; // Each player starts 13 positions apart on the 52-tile track
}

function getSafeTiles() {
  return [0, 8, 13, 21, 26, 34, 39, 47]; // Star positions (safe tiles)
}

function canMovePawn(gameState, playerIndex, pawnId, diceValue) {
  const player = gameState.players[playerIndex];
  const pawn = player.pawns[pawnId];

  // Can't move if pawn is already in goal
  if (pawn.inGoal) return false;

  // If pawn is in home, need a 6 to start
  if (pawn.inHome) {
    return diceValue === 6;
  }

  // Calculate new position
  const startPos = getStartPosition(playerIndex);
  let currentPos = pawn.position;
  let newPos = currentPos + diceValue;

  // Check if going to goal area
  const goalEntryPos = (startPos + 50) % 52;
  const distanceFromStart = (currentPos - startPos + 52) % 52;

  if (distanceFromStart + diceValue >= 50) {
    const goalPosition = (distanceFromStart + diceValue) - 50;
    // Must land exactly on goal (positions 0-5 in goal area)
    if (goalPosition > 5) return false;
  }

  return true;
}

function movePawn(gameState, playerIndex, pawnId, diceValue) {
  const player = gameState.players[playerIndex];
  const pawn = player.pawns[pawnId];

  // Move from home
  if (pawn.inHome && diceValue === 6) {
    pawn.inHome = false;
    pawn.position = getStartPosition(playerIndex);
    checkCapture(gameState, playerIndex, pawn.position);
    return true;
  }

  // Move on board
  if (!pawn.inHome && !pawn.inGoal) {
    const startPos = getStartPosition(playerIndex);
    const distanceFromStart = (pawn.position - startPos + 52) % 52;

    // Moving to goal area
    if (distanceFromStart + diceValue >= 50) {
      const goalPosition = (distanceFromStart + diceValue) - 50;
      if (goalPosition <= 5) {
        pawn.position = -2 - goalPosition; // Mark as in goal with position
        pawn.inGoal = true;
        player.goalCount++;
        return true;
      }
      return false;
    }

    // Normal move
    pawn.position = (pawn.position + diceValue) % 52;
    checkCapture(gameState, playerIndex, pawn.position);
    return true;
  }

  return false;
}

function checkCapture(gameState, attackingPlayerIndex, position) {
  const safeTiles = getSafeTiles();

  // Can't capture on safe tiles
  if (safeTiles.includes(position)) return;

  // Check all other players' pawns
  gameState.players.forEach((player, playerIndex) => {
    if (playerIndex === attackingPlayerIndex) return;

    player.pawns.forEach(pawn => {
      if (!pawn.inHome && !pawn.inGoal && pawn.position === position) {
        // Capture! Send pawn back home
        pawn.position = -1;
        pawn.inHome = true;
      }
    });
  });
}

function checkWin(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  return player.goalCount === 4;
}

function getValidMoves(gameState, playerIndex) {
  const validMoves = [];
  const player = gameState.players[playerIndex];
  const diceValue = gameState.diceValue;

  player.pawns.forEach((pawn, pawnId) => {
    if (canMovePawn(gameState, playerIndex, pawnId, diceValue)) {
      validMoves.push(pawnId);
    }
  });

  return validMoves;
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Create room
  socket.on('createRoom', (playerName) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const player = { id: socket.id, name: playerName };

    rooms.set(roomCode, {
      players: [player],
      gameState: null,
      hostId: socket.id
    });

    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, player });
    console.log(`Room created: ${roomCode} by ${playerName}`);
  });

  // Join room
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.players.length >= 4) {
      socket.emit('error', 'Room is full');
      return;
    }

    if (room.gameState && room.gameState.gameStarted) {
      socket.emit('error', 'Game already started');
      return;
    }

    const player = { id: socket.id, name: playerName };
    room.players.push(player);

    socket.join(roomCode);
    socket.emit('roomJoined', { roomCode, player });

    // Notify all players in room
    io.to(roomCode).emit('playerJoined', {
      players: room.players,
      player: player
    });

    console.log(`${playerName} joined room: ${roomCode}`);
  });

  // Start game
  socket.on('startGame', (roomCode) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (socket.id !== room.hostId) {
      socket.emit('error', 'Only host can start game');
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error', 'Need at least 2 players');
      return;
    }

    // Initialize game state
    room.gameState = createInitialGameState(roomCode, room.players);
    room.gameState.gameStarted = true;

    io.to(roomCode).emit('gameStarted', room.gameState);
    console.log(`Game started in room: ${roomCode}`);
  });

  // Roll dice
  socket.on('rollDice', (roomCode) => {
    const room = rooms.get(roomCode);

    if (!room || !room.gameState) {
      socket.emit('error', 'Invalid game state');
      return;
    }

    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Verify it's this player's turn
    if (currentPlayer.id !== socket.id) {
      socket.emit('error', 'Not your turn');
      return;
    }

    if (!gameState.canRollDice) {
      socket.emit('error', 'Cannot roll dice now');
      return;
    }

    // Roll dice (1-6)
    const diceValue = Math.floor(Math.random() * 6) + 1;
    gameState.diceValue = diceValue;
    gameState.canRollDice = false;
    gameState.lastRollWasSix = (diceValue === 6);

    // Track consecutive sixes
    if (diceValue === 6) {
      gameState.consecutiveSixes++;
    } else {
      gameState.consecutiveSixes = 0;
    }

    // If 3 consecutive sixes, skip turn automatically
    if (gameState.consecutiveSixes >= 3) {
      gameState.consecutiveSixes = 0;
      gameState.canRollDice = true;
      gameState.lastRollWasSix = false;
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

      io.to(roomCode).emit('threeSixes', {
        message: 'Three sixes in a row! Turn skipped.',
        gameState
      });
      return;
    }

    // Check for valid moves
    const validMoves = getValidMoves(gameState, gameState.currentPlayerIndex);

    // If no valid moves, skip turn
    if (validMoves.length === 0) {
      gameState.canRollDice = true;
      if (!gameState.lastRollWasSix) {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        gameState.consecutiveSixes = 0;
      }
      gameState.lastRollWasSix = false;
    }

    io.to(roomCode).emit('diceRolled', {
      diceValue,
      validMoves,
      gameState
    });
  });

  // Move pawn
  socket.on('movePawn', ({ roomCode, pawnId }) => {
    const room = rooms.get(roomCode);

    if (!room || !room.gameState) {
      socket.emit('error', 'Invalid game state');
      return;
    }

    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Verify it's this player's turn
    if (currentPlayer.id !== socket.id) {
      socket.emit('error', 'Not your turn');
      return;
    }

    // Validate and move pawn
    if (!canMovePawn(gameState, gameState.currentPlayerIndex, pawnId, gameState.diceValue)) {
      socket.emit('error', 'Invalid move');
      return;
    }

    movePawn(gameState, gameState.currentPlayerIndex, pawnId, gameState.diceValue);

    // Check for win
    if (checkWin(gameState, gameState.currentPlayerIndex)) {
      gameState.gameOver = true;
      gameState.winner = currentPlayer;
      io.to(roomCode).emit('gameOver', {
        winner: currentPlayer,
        gameState
      });
      return;
    }

    // Next turn logic
    if (!gameState.lastRollWasSix) {
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
      gameState.consecutiveSixes = 0;
    }

    gameState.canRollDice = true;
    gameState.lastRollWasSix = false;

    io.to(roomCode).emit('pawnMoved', {
      pawnId,
      gameState
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove player from rooms
    rooms.forEach((room, roomCode) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        // If no players left, delete room
        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Room deleted: ${roomCode}`);
        } else {
          // Notify remaining players
          io.to(roomCode).emit('playerLeft', {
            player,
            players: room.players
          });

          // If game was in progress, end it
          if (room.gameState && room.gameState.gameStarted) {
            io.to(roomCode).emit('gameAborted', 'A player left the game');
          }
        }
      }
    });
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🎲 Ludo server running on http://localhost:${PORT}`);
});
