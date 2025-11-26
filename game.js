// Ludo Game - Optimized & Responsive Version
const socket = io();

let gameState = null;
let myPlayerId = null;
let currentRoom = null;
let myPlayerName = '';
let isHost = false;

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

// Socket Events - Optimized
socket.on('connect', () => {
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

socket.on('error', showError);

socket.on('threeSixes', ({ message, gameState: newGameState }) => {
    gameState = newGameState;
    showError('Három hatos! Kör átugorva');
    setTimeout(() => updateUI(), 2000);
});

// UI Functions - Optimized
function switchScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    el[screen + 'Screen'].classList.add('active');
}

function updateConnectionStatus(connected) {
    const statusText = el.connectionStatus.querySelector('.status-text');
    el.connectionStatus.classList.toggle('connected', connected);
    el.connectionStatus.classList.toggle('disconnected', !connected);
    statusText.textContent = connected ? 'Csatlakozva' : 'Kapcsolat megszakadt';
}

function updatePlayersList(players) {
    el.playerCount.textContent = players.length;
    const colors = ['red', 'blue', 'green', 'yellow'];
    el.playersList.innerHTML = players.map((player, i) =>
        `<div class="player-item color-${colors[i]}">
            <div class="player-color-indicator"></div>
            <span>${player.name}${player.id === myPlayerId ? ' (Te)' : ''}</span>
        </div>`
    ).join('');
}

function showError(msg) {
    el.errorToast.textContent = msg;
    el.errorToast.classList.add('show');
    setTimeout(() => el.errorToast.classList.remove('show'), 3000);
}

function showStatus(msg) {
    el.gameStatus.textContent = msg;
}

// Board - Responsive with Percentage Positions
function initBoard() {
    createTiles();
    updateBoard();
}

function createTiles() {
    el.boardTrack.innerHTML = '';
    const safe = [0, 8, 13, 21, 26, 34, 39, 47];

    // Use percentage-based positions for responsive design
    const positions = getTilePositionsResponsive();

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 52; i++) {
        const tile = document.createElement('div');
        tile.className = safe.includes(i) ? 'tile safe' : 'tile';
        tile.dataset.pos = i;

        const pos = positions[i];
        tile.style.left = pos.x + '%';
        tile.style.top = pos.y + '%';

        fragment.appendChild(tile);
    }

    el.boardTrack.appendChild(fragment);
}

function getTilePositionsResponsive() {
    // Percentage-based positions for 600px board (responsive)
    // Each unit is ~5.5% of board width
    const positions = [];

    // Helper to convert from grid position to percentage
    const toPercent = (val) => (val / 15) * 100;

    // RED path - left middle column going UP (0-5)
    for (let i = 0; i < 6; i++) {
        positions.push({ x: toPercent(6), y: toPercent(14 - i) });
    }

    // Continue up left edge (6-7)
    positions.push({ x: toPercent(0), y: toPercent(8) });
    positions.push({ x: toPercent(0), y: toPercent(7) });

    // BLUE corner and path (8-12) - SAFE at 8
    positions.push({ x: toPercent(0), y: toPercent(6) }); // 8 SAFE
    positions.push({ x: toPercent(1), y: toPercent(6) }); // 9
    positions.push({ x: toPercent(2), y: toPercent(6) }); // 10
    positions.push({ x: toPercent(3), y: toPercent(6) }); // 11
    positions.push({ x: toPercent(4), y: toPercent(6) }); // 12

    // BLUE entrance (13-15) - SAFE at 13
    positions.push({ x: toPercent(6), y: toPercent(0) }); // 13 SAFE
    positions.push({ x: toPercent(7), y: toPercent(0) }); // 14
    positions.push({ x: toPercent(8), y: toPercent(0) }); // 15

    // Top row going right (16-20)
    positions.push({ x: toPercent(9), y: toPercent(6) }); // 16
    positions.push({ x: toPercent(10), y: toPercent(6) }); // 17
    positions.push({ x: toPercent(11), y: toPercent(6) }); // 18
    positions.push({ x: toPercent(12), y: toPercent(6) }); // 19
    positions.push({ x: toPercent(13), y: toPercent(6) }); // 20

    // GREEN corner and path (21-25) - SAFE at 21
    positions.push({ x: toPercent(14), y: toPercent(6) }); // 21 SAFE
    positions.push({ x: toPercent(14), y: toPercent(7) }); // 22
    positions.push({ x: toPercent(14), y: toPercent(8) }); // 23
    positions.push({ x: toPercent(14), y: toPercent(9) }); // 24
    positions.push({ x: toPercent(14), y: toPercent(10) }); // 25

    // GREEN entrance (26-28) - SAFE at 26
    positions.push({ x: toPercent(14), y: toPercent(6) }); // 26 SAFE
    positions.push({ x: toPercent(14), y: toPercent(7) }); // 27
    positions.push({ x: toPercent(14), y: toPercent(8) }); // 28

    // Right column going down (29-33)
    positions.push({ x: toPercent(8), y: toPercent(9) }); // 29
    positions.push({ x: toPercent(8), y: toPercent(10) }); // 30
    positions.push({ x: toPercent(8), y: toPercent(11) }); // 31
    positions.push({ x: toPercent(8), y: toPercent(12) }); // 32
    positions.push({ x: toPercent(8), y: toPercent(13) }); // 33

    // YELLOW corner and path (34-38) - SAFE at 34
    positions.push({ x: toPercent(8), y: toPercent(14) }); // 34 SAFE
    positions.push({ x: toPercent(7), y: toPercent(14) }); // 35
    positions.push({ x: toPercent(6), y: toPercent(14) }); // 36
    positions.push({ x: toPercent(5), y: toPercent(14) }); // 37
    positions.push({ x: toPercent(4), y: toPercent(14) }); // 38

    // YELLOW entrance (39-41) - SAFE at 39
    positions.push({ x: toPercent(8), y: toPercent(14) }); // 39 SAFE
    positions.push({ x: toPercent(7), y: toPercent(14) }); // 40
    positions.push({ x: toPercent(6), y: toPercent(14) }); // 41

    // Bottom row going left (42-46)
    positions.push({ x: toPercent(5), y: toPercent(8) }); // 42
    positions.push({ x: toPercent(4), y: toPercent(8) }); // 43
    positions.push({ x: toPercent(3), y: toPercent(8) }); // 44
    positions.push({ x: toPercent(2), y: toPercent(8) }); // 45
    positions.push({ x: toPercent(1), y: toPercent(8) }); // 46

    // Complete circle (47-51) - SAFE at 47
    positions.push({ x: toPercent(0), y: toPercent(8) }); // 47 SAFE
    positions.push({ x: toPercent(0), y: toPercent(7) }); // 48
    positions.push({ x: toPercent(0), y: toPercent(6) }); // 49
    positions.push({ x: toPercent(0), y: toPercent(5) }); // 50
    positions.push({ x: toPercent(0), y: toPercent(4) }); // 51

    return positions;
}

function updateBoard() {
    if (!gameState) return;

    // Batch DOM updates
    const pawnsToRemove = document.querySelectorAll('.pawn');
    const slotsToReset = document.querySelectorAll('.pawn-slot');

    pawnsToRemove.forEach(p => p.remove());
    slotsToReset.forEach(s => s.innerHTML = '');

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
            pawn.style.cssText = `
                position: absolute;
                left: calc(50% + ${Math.cos(rad) * dist}px);
                top: calc(50% + ${Math.sin(rad) * dist}px);
                transform: translate(-50%, -50%);
            `;
            goal.appendChild(pawn);
        }
    } else {
        const tile = document.querySelector(`.tile[data-pos="${data.position}"]`);
        if (tile) {
            const existing = tile.querySelectorAll('.pawn').length;
            pawn.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(calc(-50% + ${existing * 5}px), calc(-50% + ${existing * 5}px));
            `;
            tile.appendChild(pawn);
        }
    }

    pawn.addEventListener('click', () => handlePawnClick(pi, id), { passive: true });
}

function highlightPawns(moves) {
    document.querySelectorAll('.pawn').forEach(p => p.classList.remove('selectable'));
    const currentPlayerIndex = gameState.currentPlayerIndex;
    moves.forEach(id => {
        const pawn = document.querySelector(`.pawn[data-player="${currentPlayerIndex}"][data-pawn="${id}"]`);
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

// Event Listeners - Optimized
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

console.log('🎲 Ludo - Optimized & Responsive');
