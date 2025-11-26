// Ludo Game - Complete Working Version
const socket = io();

let gameState = null;
let myPlayerId = null;
let currentRoom = null;
let myPlayerName = '';
let isHost = false;

// DOM Elements
const el = {
    lobbyScreen: document.getElementById('lobbyScreen'),
    waitingScreen: document.getElementById('waitingScreen'),
    gameScreen: document.getElementById('gameScreen'),
    gameOverScreen: document.getElementById('gameOverScreen'),
    connectionStatus: document.getElementById('connectionStatus'),
    playerNameInput: document.getElementById('playerNameInput'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    roomCodeInput: document.getElementById('roomCodeInput'),
    joinRoomBtn: document.getElementById('joinRoomBtn'),
    roomCodeDisplay: document.getElementById('roomCodeDisplay'),
    copyCodeBtn: document.getElementById('copyCodeBtn'),
    playerCount: document.getElementById('playerCount'),
    playersList: document.getElementById('playersList'),
    startGameBtn: document.getElementById('startGameBtn'),
    leaveRoomBtn: document.getElementById('leaveRoomBtn'),
    gameRoomCode: document.getElementById('gameRoomCode'),
    currentPlayerIndicator: document.getElementById('currentPlayerIndicator'),
    gameBoard: document.getElementById('gameBoard'),
    boardTrack: document.getElementById('boardTrack'),
    dice: document.getElementById('dice'),
    rollDiceBtn: document.getElementById('rollDiceBtn'),
    gameStatus: document.getElementById('gameStatus'),
    winnerInfo: document.getElementById('winnerInfo'),
    newGameBtn: document.getElementById('newGameBtn'),
    errorToast: document.getElementById('errorToast')
};

// Socket Events
socket.on('connect', () => {
    console.log('Csatlakozva');
    updateConnectionStatus(true);
    myPlayerId = socket.id;
});

socket.on('disconnect', () => {
    updateConnectionStatus(false);
    showError('Kapcsolat megszakadt');
});

socket.on('roomCreated', ({ roomCode, player }) => {
    currentRoom = roomCode;
    myPlayerName = player.name;
    isHost = true;
    el.roomCodeDisplay.textContent = roomCode;
    el.gameRoomCode.textContent = roomCode;
    switchScreen('waiting');
    updatePlayersList([player]);
});

socket.on('roomJoined', ({ roomCode, player }) => {
    currentRoom = roomCode;
    myPlayerName = player.name;
    isHost = false;
    el.roomCodeDisplay.textContent = roomCode;
    el.gameRoomCode.textContent = roomCode;
    switchScreen('waiting');
});

socket.on('playerJoined', ({ players }) => {
    updatePlayersList(players);
    if (isHost && players.length >= 2) el.startGameBtn.disabled = false;
});

socket.on('playerLeft', ({ player, players }) => {
    showError(`${player.name} kilépett`);
    updatePlayersList(players);
    if (isHost && players.length < 2) el.startGameBtn.disabled = true;
});

socket.on('gameStarted', (newGameState) => {
    gameState = newGameState;
    switchScreen('game');
    initBoard();
    updateUI();
});

socket.on('diceRolled', ({ diceValue, validMoves, gameState: newGameState }) => {
    gameState = newGameState;
    animateDice(diceValue);
    setTimeout(() => {
        updateUI();
        if (validMoves.length === 0) {
            showStatus('Nincs érvényes lépés');
            setTimeout(() => updateUI(), 1500);
        } else if (isMyTurn()) {
            highlightPawns(validMoves);
            showStatus('Válassz bábut');
        }
    }, 600);
});

socket.on('pawnMoved', ({ pawnId, gameState: newGameState }) => {
    gameState = newGameState;
    updateBoard();
    updateUI();
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

socket.on('error', (message) => showError(message));

socket.on('threeSixes', ({ message, gameState: newGameState }) => {
    gameState = newGameState;
    showError('Három hatos! Kör átugorva');
    setTimeout(() => updateUI(), 2000);
});

// UI Functions
function switchScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    el[screen + 'Screen'].classList.add('active');
}

function updateConnectionStatus(connected) {
    const statusText = el.connectionStatus.querySelector('.status-text');
    if (connected) {
        el.connectionStatus.classList.add('connected');
        el.connectionStatus.classList.remove('disconnected');
        statusText.textContent = 'Csatlakozva';
    } else {
        el.connectionStatus.classList.add('disconnected');
        el.connectionStatus.classList.remove('connected');
        statusText.textContent = 'Kapcsolat megszakadt';
    }
}

function updatePlayersList(players) {
    el.playerCount.textContent = players.length;
    el.playersList.innerHTML = '';
    const colors = ['red', 'blue', 'green', 'yellow'];
    players.forEach((player, i) => {
        const item = document.createElement('div');
        item.className = `player-item color-${colors[i]}`;
        item.innerHTML = `<div class="player-color-indicator"></div><span>${player.name}${player.id === myPlayerId ? ' (Te)' : ''}</span>`;
        el.playersList.appendChild(item);
    });
}

function showError(msg) {
    el.errorToast.textContent = msg;
    el.errorToast.classList.add('show');
    setTimeout(() => el.errorToast.classList.remove('show'), 3000);
}

function showStatus(msg) {
    el.gameStatus.textContent = msg;
}

// Board Functions
function initBoard() {
    createTiles();
    updateBoard();
}

function createTiles() {
    el.boardTrack.innerHTML = '';
    const safe = [0, 8, 13, 21, 26, 34, 39, 47];

    // Classic Ludo positions - simplified grid
    for (let i = 0; i < 52; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.pos = i;
        if (safe.includes(i)) tile.classList.add('safe');

        // Calculate position based on classic Ludo layout
        const pos = getTilePosition(i);
        tile.style.gridColumn = pos.col;
        tile.style.gridRow = pos.row;

        el.boardTrack.appendChild(tile);
    }
}

function getTilePosition(i) {
    // Ludo board: 15x15 grid, cross-shaped track
    // Positions cycle around the board
    const track = [
        // RED path (bottom-left, going up)
        { row: 9, col: 7 }, { row: 8, col: 7 }, { row: 7, col: 7 }, { row: 6, col: 7 }, { row: 5, col: 7 }, { row: 4, col: 7 },  // 0-5
        { row: 3, col: 1 }, { row: 2, col: 1 },  // 6-7

        // BLUE corner and path (top-left, going right) - SAFE at 8
        { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 }, { row: 1, col: 5 },  // 8-12
        { row: 1, col: 7 }, { row: 1, col: 8 }, { row: 1, col: 9 },  // 13-15 (13 is SAFE)
        { row: 3, col: 10 }, { row: 3, col: 11 }, { row: 3, col: 12 }, { row: 3, col: 13 }, { row: 3, col: 14 },  // 16-20

        // GREEN corner and path (top-right, going down) - SAFE at 21
        { row: 1, col: 14 }, { row: 2, col: 14 }, { row: 3, col: 14 }, { row: 4, col: 14 }, { row: 5, col: 14 },  // 21-25
        { row: 7, col: 14 }, { row: 8, col: 14 }, { row: 9, col: 14 },  // 26-28 (26 is SAFE)
        { row: 10, col: 13 }, { row: 10, col: 12 }, { row: 10, col: 11 }, { row: 10, col: 10 }, { row: 10, col: 9 },  // 29-33

        // YELLOW corner and path (bottom-right, going left) - SAFE at 34
        { row: 14, col: 14 }, { row: 14, col: 13 }, { row: 14, col: 12 }, { row: 14, col: 11 }, { row: 14, col: 10 },  // 34-38
        { row: 14, col: 9 }, { row: 14, col: 8 }, { row: 14, col: 7 },  // 39-41 (39 is SAFE)
        { row: 12, col: 6 }, { row: 12, col: 5 }, { row: 12, col: 4 }, { row: 12, col: 3 }, { row: 12, col: 2 },  // 42-46

        // Complete circle - SAFE at 47
        { row: 14, col: 1 }, { row: 13, col: 1 }, { row: 12, col: 1 }, { row: 11, col: 1 }, { row: 10, col: 1 }  // 47-51
    ];

    return track[i] || { row: 1, col: 1 };
}

function updateBoard() {
    if (!gameState) return;
    document.querySelectorAll('.pawn').forEach(p => p.remove());
    document.querySelectorAll('.pawn-slot').forEach(s => s.innerHTML = '');

    gameState.players.forEach((player, pi) => {
        player.pawns.forEach((pawn, id) => {
            placePawn(player.color, pi, id, pawn);
        });
    });
}

function placePawn(color, pi, id, data) {
    const pawn = document.createElement('div');
    pawn.className = `pawn pawn-${color}`;
    pawn.dataset.player = pi;
    pawn.dataset.pawn = id;

    if (data.inHome) {
        const slot = document.querySelector(`.home-${color} .pawn-slot[data-pawn="${id}"]`);
        if (slot) slot.appendChild(pawn);
    } else if (data.inGoal) {
        const goal = document.querySelector('.goal-area');
        if (goal) {
            const angle = pi * 90;
            const dist = 50 + Math.abs(data.position) * 10;
            const rad = angle * Math.PI / 180;
            pawn.style.position = 'absolute';
            pawn.style.left = `calc(50% + ${Math.cos(rad) * dist}px)`;
            pawn.style.top = `calc(50% + ${Math.sin(rad) * dist}px)`;
            pawn.style.transform = 'translate(-50%, -50%)';
            goal.appendChild(pawn);
        }
    } else {
        const tile = document.querySelector(`.tile[data-pos="${data.position}"]`);
        if (tile) {
            const existing = tile.querySelectorAll('.pawn').length;
            pawn.style.position = 'absolute';
            pawn.style.left = '50%';
            pawn.style.top = '50%';
            pawn.style.transform = `translate(calc(-50% + ${existing * 5}px), calc(-50% + ${existing * 5}px))`;
            tile.appendChild(pawn);
        }
    }

    pawn.addEventListener('click', () => handlePawnClick(pi, id));
}

function highlightPawns(moves) {
    document.querySelectorAll('.pawn').forEach(p => p.classList.remove('selectable'));
    moves.forEach(id => {
        const pawn = document.querySelector(`.pawn[data-player="${gameState.currentPlayerIndex}"][data-pawn="${id}"]`);
        if (pawn) pawn.classList.add('selectable');
    });
}

function handlePawnClick(pi, id) {
    if (!isMyTurn() || gameState.canRollDice) return;
    const pawn = document.querySelector(`.pawn[data-player="${pi}"][data-pawn="${id}"]`);
    if (pawn && pawn.classList.contains('selectable')) {
        socket.emit('movePawn', { roomCode: currentRoom, pawnId: id });
        document.querySelectorAll('.pawn').forEach(p => p.classList.remove('selectable'));
    }
}

function isMyTurn() {
    return gameState && gameState.players[gameState.currentPlayerIndex].id === myPlayerId;
}

function updateUI() {
    if (!gameState) return;
    const cp = gameState.players[gameState.currentPlayerIndex];
    const dot = el.currentPlayerIndicator.querySelector('.player-color-dot');
    const name = el.currentPlayerIndicator.querySelector('.player-name');
    dot.style.background = `var(--color-${cp.color})`;
    name.textContent = cp.name;

    if (isMyTurn() && gameState.canRollDice) {
        el.rollDiceBtn.disabled = false;
        showStatus('Dobd a kockát!');
    } else if (isMyTurn()) {
        el.rollDiceBtn.disabled = true;
        showStatus('Válassz bábut');
    } else {
        el.rollDiceBtn.disabled = true;
        showStatus(`Várakozás ${cp.name}...`);
    }
}

function animateDice(val) {
    const face = el.dice.querySelector('.dice-face');
    el.dice.classList.add('rolling');
    let count = 0;
    const interval = setInterval(() => {
        face.textContent = Math.floor(Math.random() * 6) + 1;
        if (++count >= 8) {
            clearInterval(interval);
            face.textContent = val;
            el.dice.classList.remove('rolling');
        }
    }, 60);
}

function showWinner(winner) {
    const dot = el.winnerInfo.querySelector('.winner-color-dot');
    const name = el.winnerInfo.querySelector('.winner-name');
    dot.style.background = `var(--color-${winner.color})`;
    name.textContent = winner.name;
    switchScreen('gameover');
}

function resetGame() {
    gameState = null;
    currentRoom = null;
    isHost = false;
    el.playerNameInput.value = '';
    el.roomCodeInput.value = '';
}

// Event Listeners
el.createRoomBtn.addEventListener('click', () => {
    const name = el.playerNameInput.value.trim();
    if (!name) return showError('Add meg a nevedet');
    socket.emit('createRoom', name);
});

el.joinRoomBtn.addEventListener('click', () => {
    const name = el.playerNameInput.value.trim();
    const code = el.roomCodeInput.value.trim().toUpperCase();
    if (!name) return showError('Add meg a nevedet');
    if (!code) return showError('Add meg a kódot');
    socket.emit('joinRoom', { roomCode: code, playerName: name });
});

el.copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(el.roomCodeDisplay.textContent);
    showError('Kód másolva!');
});

el.startGameBtn.addEventListener('click', () => socket.emit('startGame', currentRoom));
el.leaveRoomBtn.addEventListener('click', () => {
    resetGame();
    switchScreen('lobby');
});

el.rollDiceBtn.addEventListener('click', () => {
    if (isMyTurn() && gameState.canRollDice) {
        socket.emit('rollDice', currentRoom);
        el.rollDiceBtn.disabled = true;
    }
});

el.newGameBtn.addEventListener('click', () => {
    resetGame();
    switchScreen('lobby');
});

el.playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') el.createRoomBtn.click();
});

el.roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') el.joinRoomBtn.click();
});

el.roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

console.log('🎲 Ludo initialized');
