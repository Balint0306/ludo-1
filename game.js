// ========================================
// Socket.io Connection
// ========================================
const socket = io();

// ========================================
// Game State
// ========================================
let gameState = null;
let myPlayerId = null;
let currentRoom = null;
let myPlayerName = '';
let isHost = false;

// ========================================
// DOM Elements
// ========================================
const elements = {
    // Screens
    lobbyScreen: document.getElementById('lobbyScreen'),
    waitingScreen: document.getElementById('waitingScreen'),
    gameScreen: document.getElementById('gameScreen'),
    gameOverScreen: document.getElementById('gameOverScreen'),

    // Connection
    connectionStatus: document.getElementById('connectionStatus'),

    // Lobby
    playerNameInput: document.getElementById('playerNameInput'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    roomCodeInput: document.getElementById('roomCodeInput'),
    joinRoomBtn: document.getElementById('joinRoomBtn'),

    // Waiting Room
    roomCodeDisplay: document.getElementById('roomCodeDisplay'),
    copyCodeBtn: document.getElementById('copyCodeBtn'),
    playerCount: document.getElementById('playerCount'),
    playersList: document.getElementById('playersList'),
    startGameBtn: document.getElementById('startGameBtn'),
    leaveRoomBtn: document.getElementById('leaveRoomBtn'),

    // Game
    gameRoomCode: document.getElementById('gameRoomCode'),
    currentPlayerIndicator: document.getElementById('currentPlayerIndicator'),
    gameBoard: document.getElementById('gameBoard'),
    boardTrack: document.getElementById('boardTrack'),
    dice: document.getElementById('dice'),
    rollDiceBtn: document.getElementById('rollDiceBtn'),
    gameStatus: document.getElementById('gameStatus'),

    // Game Over
    winnerInfo: document.getElementById('winnerInfo'),
    newGameBtn: document.getElementById('newGameBtn'),

    // Toast
    errorToast: document.getElementById('errorToast')
};

// ========================================
// Socket.io Events
// ========================================

socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
    myPlayerId = socket.id;
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
    showError('Connection lost. Trying to reconnect...');
});

socket.on('roomCreated', ({ roomCode, player }) => {
    currentRoom = roomCode;
    myPlayerName = player.name;
    isHost = true;
    elements.roomCodeDisplay.textContent = roomCode;
    elements.gameRoomCode.textContent = roomCode;
    switchScreen('waiting');
    updatePlayersList([player]);
});

socket.on('roomJoined', ({ roomCode, player }) => {
    currentRoom = roomCode;
    myPlayerName = player.name;
    isHost = false;
    elements.roomCodeDisplay.textContent = roomCode;
    elements.gameRoomCode.textContent = roomCode;
    switchScreen('waiting');
});

socket.on('playerJoined', ({ players }) => {
    updatePlayersList(players);
    if (isHost && players.length >= 2) {
        elements.startGameBtn.disabled = false;
    }
});

socket.on('playerLeft', ({ player, players }) => {
    showError(`${player.name} left the room`);
    updatePlayersList(players);
    if (isHost && players.length < 2) {
        elements.startGameBtn.disabled = true;
    }
});

socket.on('gameStarted', (newGameState) => {
    gameState = newGameState;
    switchScreen('game');
    initializeBoard();
    updateGameUI();
});

socket.on('diceRolled', ({ diceValue, validMoves, gameState: newGameState }) => {
    gameState = newGameState;
    animateDiceRoll(diceValue);

    setTimeout(() => {
        updateGameUI();

        if (validMoves.length === 0) {
            showStatus('No valid moves. Turn skipped.');
            setTimeout(() => updateGameUI(), 1500);
        } else if (isMyTurn()) {
            highlightValidPawns(validMoves);
            showStatus('Select a pawn to move');
        }
    }, 600);
});

socket.on('pawnMoved', ({ pawnId, gameState: newGameState }) => {
    gameState = newGameState;
    updateBoard();
    updateGameUI();
});

socket.on('gameOver', ({ winner, gameState: newGameState }) => {
    gameState = newGameState;
    showWinner(winner);
});

socket.on('gameAborted', (message) => {
    showError(message);
    setTimeout(() => {
        resetGame();
        switchScreen('lobby');
    }, 3000);
});

socket.on('error', (message) => {
    showError(message);
});

socket.on('threeSixes', ({ message, gameState: newGameState }) => {
    gameState = newGameState;
    showError(message);
    setTimeout(() => {
        updateGameUI();
    }, 2000);
});

// ========================================
// UI Functions
// ========================================

function switchScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    switch (screen) {
        case 'lobby':
            elements.lobbyScreen.classList.add('active');
            break;
        case 'waiting':
            elements.waitingScreen.classList.add('active');
            break;
        case 'game':
            elements.gameScreen.classList.add('active');
            break;
        case 'gameover':
            elements.gameOverScreen.classList.add('active');
            break;
    }
}

function updateConnectionStatus(connected) {
    const statusText = elements.connectionStatus.querySelector('.status-text');

    if (connected) {
        elements.connectionStatus.classList.add('connected');
        elements.connectionStatus.classList.remove('disconnected');
        statusText.textContent = 'Connected';
    } else {
        elements.connectionStatus.classList.add('disconnected');
        elements.connectionStatus.classList.remove('connected');
        statusText.textContent = 'Disconnected';
    }
}

function updatePlayersList(players) {
    elements.playerCount.textContent = players.length;
    elements.playersList.innerHTML = '';

    const colors = ['red', 'blue', 'green', 'yellow'];

    players.forEach((player, index) => {
        const playerItem = document.createElement('div');
        playerItem.className = `player-item color-${colors[index]}`;
        playerItem.innerHTML = `
            <div class="player-color-indicator"></div>
            <span>${player.name}${player.id === myPlayerId ? ' (You)' : ''}</span>
        `;
        elements.playersList.appendChild(playerItem);
    });
}

function showError(message) {
    elements.errorToast.textContent = message;
    elements.errorToast.classList.add('show');

    setTimeout(() => {
        elements.errorToast.classList.remove('show');
    }, 3000);
}

function showStatus(message) {
    elements.gameStatus.textContent = message;
}

// ========================================
// Game Board Functions
// ========================================

function initializeBoard() {
    // Create 52 tiles on the track
    createBoardTiles();

    // Place initial pawns in homes
    updateBoard();
}

function createBoardTiles() {
    elements.boardTrack.innerHTML = '';

    const safeTiles = [0, 8, 13, 21, 26, 34, 39, 47];
    const tileSize = 35;
    const boardSize = 600;
    const padding = 10;

    // Calculate tile positions in a square track
    const positions = calculateTilePositions(boardSize, tileSize, padding);

    for (let i = 0; i < 52; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.position = i;

        if (safeTiles.includes(i)) {
            tile.classList.add('safe');
        }

        tile.style.left = positions[i].x + 'px';
        tile.style.top = positions[i].y + 'px';

        elements.boardTrack.appendChild(tile);
    }
}

function calculateTilePositions(boardSize, tileSize, padding) {
    const positions = [];
    const sideLength = 6; // 6 tiles per side
    const startOffset = 200; // Starting position offset

    // Define the track path (clockwise from red start)
    // Bottom row (going right, positions 0-5)
    for (let i = 0; i < sideLength; i++) {
        positions.push({
            x: startOffset + (i * (tileSize + 5)),
            y: boardSize - padding - tileSize - 170
        });
    }

    // Right column (going up, positions 6-12)
    for (let i = 0; i < sideLength + 1; i++) {
        positions.push({
            x: boardSize - padding - tileSize - 20,
            y: boardSize - padding - tileSize - 170 - ((i + 1) * (tileSize + 5))
        });
    }

    // Top row (going right, positions 13-18)
    for (let i = 0; i < sideLength; i++) {
        positions.push({
            x: boardSize - padding - tileSize - 20 - ((i + 1) * (tileSize + 5)),
            y: padding + 20
        });
    }

    // Top row continued (going left, positions 19-25)
    for (let i = 0; i < sideLength + 1; i++) {
        positions.push({
            x: startOffset - ((i + 1) * (tileSize + 5)),
            y: padding + 20
        });
    }

    // Left column (going down, positions 26-31)
    for (let i = 0; i < sideLength; i++) {
        positions.push({
            x: padding + 20,
            y: padding + 20 + ((i + 1) * (tileSize + 5))
        });
    }

    // Left column continued (going down, positions 32-38)
    for (let i = 0; i < sideLength + 1; i++) {
        positions.push({
            x: padding + 20,
            y: startOffset + (i * (tileSize + 5))
        });
    }

    // Bottom row (going right, positions 39-44)
    for (let i = 0; i < sideLength; i++) {
        positions.push({
            x: padding + 20 + ((i + 1) * (tileSize + 5)),
            y: boardSize - padding - tileSize - 170
        });
    }

    // Fill remaining positions to make 52
    while (positions.length < 52) {
        const lastPos = positions[positions.length - 1];
        positions.push({
            x: lastPos.x + (tileSize + 5),
            y: lastPos.y
        });
    }

    return positions;
}

function updateBoard() {
    if (!gameState) return;

    // Remove all pawns
    document.querySelectorAll('.pawn').forEach(p => p.remove());

    // Reset home slots
    document.querySelectorAll('.pawn-slot').forEach(slot => {
        slot.innerHTML = '';
    });

    // Place pawns
    gameState.players.forEach((player, playerIndex) => {
        player.pawns.forEach((pawn, pawnIndex) => {
            placePawn(player.color, playerIndex, pawnIndex, pawn);
        });
    });
}

function placePawn(color, playerIndex, pawnId, pawnData) {
    const pawnElement = document.createElement('div');
    pawnElement.className = `pawn pawn-${color}`;
    pawnElement.dataset.player = playerIndex;
    pawnElement.dataset.pawn = pawnId;

    if (pawnData.inHome) {
        // Place in home
        const homeSlot = document.querySelector(`.home-${color} .pawn-slot[data-pawn="${pawnId}"]`);
        if (homeSlot) {
            homeSlot.appendChild(pawnElement);
        }
    } else if (pawnData.inGoal) {
        // Place in goal (center area)
        const goalArea = document.querySelector('.goal-area');
        if (goalArea) {
            const angle = playerIndex * 90; // 0, 90, 180, 270 degrees
            const distance = 50 + (Math.abs(pawnData.position) * 10);
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * distance;
            const y = Math.sin(rad) * distance;

            pawnElement.style.position = 'absolute';
            pawnElement.style.left = `calc(50% + ${x}px)`;
            pawnElement.style.top = `calc(50% + ${y}px)`;
            pawnElement.style.transform = 'translate(-50%, -50%)';

            goalArea.appendChild(pawnElement);
        }
    } else {
        // Place on board
        const tile = document.querySelector(`.tile[data-position="${pawnData.position}"]`);
        if (tile) {
            // Check if there are other pawns on this tile
            const existingPawns = tile.querySelectorAll('.pawn');
            const offset = existingPawns.length * 5;

            pawnElement.style.position = 'absolute';
            pawnElement.style.left = `50%`;
            pawnElement.style.top = `50%`;
            pawnElement.style.transform = `translate(calc(-50% + ${offset}px), calc(-50% + ${offset}px))`;

            tile.appendChild(pawnElement);
        }
    }

    // Add click handler
    pawnElement.addEventListener('click', () => handlePawnClick(playerIndex, pawnId));
}

function highlightValidPawns(validMoves) {
    // Remove previous highlights
    document.querySelectorAll('.pawn').forEach(p => p.classList.remove('selectable'));

    // Highlight valid pawns
    validMoves.forEach(pawnId => {
        const currentPlayerIndex = gameState.currentPlayerIndex;
        const pawn = document.querySelector(`.pawn[data-player="${currentPlayerIndex}"][data-pawn="${pawnId}"]`);
        if (pawn) {
            pawn.classList.add('selectable');
        }
    });
}

function handlePawnClick(playerIndex, pawnId) {
    if (!isMyTurn()) return;
    if (!gameState.canRollDice) {
        // Can move pawn
        const pawn = document.querySelector(`.pawn[data-player="${playerIndex}"][data-pawn="${pawnId}"]`);
        if (pawn && pawn.classList.contains('selectable')) {
            socket.emit('movePawn', { roomCode: currentRoom, pawnId });

            // Remove highlights
            document.querySelectorAll('.pawn').forEach(p => p.classList.remove('selectable'));
        }
    }
}

// ========================================
// Game Logic Helpers
// ========================================

function isMyTurn() {
    if (!gameState) return false;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return currentPlayer.id === myPlayerId;
}

function updateGameUI() {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Update current player indicator
    const colorDot = elements.currentPlayerIndicator.querySelector('.player-color-dot');
    const playerName = elements.currentPlayerIndicator.querySelector('.player-name');

    colorDot.style.background = `var(--color-${currentPlayer.color})`;
    playerName.textContent = currentPlayer.name;

    // Update dice button
    if (isMyTurn() && gameState.canRollDice) {
        elements.rollDiceBtn.disabled = false;
        showStatus('Your turn! Roll the dice.');
    } else if (isMyTurn() && !gameState.canRollDice) {
        elements.rollDiceBtn.disabled = true;
        showStatus('Select a pawn to move');
    } else {
        elements.rollDiceBtn.disabled = true;
        showStatus(`Waiting for ${currentPlayer.name}...`);
    }
}

function animateDiceRoll(value) {
    const diceFace = elements.dice.querySelector('.dice-face');
    elements.dice.classList.add('rolling');

    // Show random numbers while rolling
    let rollCount = 0;
    const rollInterval = setInterval(() => {
        diceFace.textContent = Math.floor(Math.random() * 6) + 1;
        rollCount++;

        if (rollCount >= 8) {
            clearInterval(rollInterval);
            diceFace.textContent = value;
            elements.dice.classList.remove('rolling');
        }
    }, 60);
}

function showWinner(winner) {
    const colorDot = elements.winnerInfo.querySelector('.winner-color-dot');
    const winnerName = elements.winnerInfo.querySelector('.winner-name');

    colorDot.style.background = `var(--color-${winner.color})`;
    winnerName.textContent = winner.name;

    switchScreen('gameover');
}

function resetGame() {
    gameState = null;
    currentRoom = null;
    isHost = false;
    elements.playerNameInput.value = '';
    elements.roomCodeInput.value = '';
}

// ========================================
// Event Listeners
// ========================================

elements.createRoomBtn.addEventListener('click', () => {
    const playerName = elements.playerNameInput.value.trim();

    if (!playerName) {
        showError('Please enter your name');
        return;
    }

    socket.emit('createRoom', playerName);
});

elements.joinRoomBtn.addEventListener('click', () => {
    const playerName = elements.playerNameInput.value.trim();
    const roomCode = elements.roomCodeInput.value.trim().toUpperCase();

    if (!playerName) {
        showError('Please enter your name');
        return;
    }

    if (!roomCode) {
        showError('Please enter room code');
        return;
    }

    socket.emit('joinRoom', { roomCode, playerName });
});

elements.copyCodeBtn.addEventListener('click', () => {
    const roomCode = elements.roomCodeDisplay.textContent;
    navigator.clipboard.writeText(roomCode).then(() => {
        showError('Room code copied!');
    });
});

elements.startGameBtn.addEventListener('click', () => {
    socket.emit('startGame', currentRoom);
});

elements.leaveRoomBtn.addEventListener('click', () => {
    resetGame();
    switchScreen('lobby');
});

elements.rollDiceBtn.addEventListener('click', () => {
    if (isMyTurn() && gameState.canRollDice) {
        socket.emit('rollDice', currentRoom);
        elements.rollDiceBtn.disabled = true;
    }
});

elements.newGameBtn.addEventListener('click', () => {
    resetGame();
    switchScreen('lobby');
});

// Allow Enter key for inputs
elements.playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.createRoomBtn.click();
    }
});

elements.roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.joinRoomBtn.click();
    }
});

// Auto-uppercase room code input
elements.roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// ========================================
// Initialize
// ========================================
console.log('🎲 Ludo game client initialized');
