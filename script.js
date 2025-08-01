// Dimensions of the Connect 4 grid
const ROWS = 6;
const COLS = 7;

// In-memory game state variables
let board = [];
let currentPlayer = 1;
let gameOver = false;
let messageText = '';

// DOM elements we'll interact with
const boardDiv = document.getElementById('board');
const messageDiv = document.getElementById('message');
const resetButton = document.getElementById('reset-button');

// Determine the game ID from the URL. If none exists, generate one and update URL.
const urlParams = new URLSearchParams(window.location.search);
let gameId = urlParams.get('game');
if (!gameId) {
  gameId = Math.random().toString(36).substring(2, 10);
  const newUrl = `${window.location.pathname}?game=${gameId}`;
  history.replaceState(null, '', newUrl);
}

// Keys used in localStorage for synchronizing state
const boardKey = `connect4-board-${gameId}`;
const turnKey = `connect4-turn-${gameId}`;
const overKey = `connect4-over-${gameId}`;
const messageKey = `connect4-message-${gameId}`;

// Key for storing player names so that multiple tabs can share them
const namesKey = `connect4-names-${gameId}`;

// Player names; will be set from lobby or loaded from storage
let playerNames = ['Player 1', 'Player 2'];

/**
 * Create an empty 6×7 board filled with zeros.
 * @returns {number[][]}
 */
function createEmptyBoard() {
  const b = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(0);
    }
    b.push(row);
  }
  return b;
}

/**
 * Save the current state into localStorage so that other tabs can sync.
 */
function saveState() {
  localStorage.setItem(boardKey, JSON.stringify(board));
  localStorage.setItem(turnKey, currentPlayer.toString());
  localStorage.setItem(overKey, gameOver ? '1' : '0');
  localStorage.setItem(messageKey, messageText);
}

/**
 * Persist the current player names to localStorage so that all tabs know them.
 */
function saveNames() {
  try {
    localStorage.setItem(namesKey, JSON.stringify(playerNames));
  } catch (e) {
    // ignore
  }
}

/**
 * Load player names from localStorage, if available.
 */
function loadNames() {
  const storedNames = localStorage.getItem(namesKey);
  if (storedNames) {
    try {
      const parsed = JSON.parse(storedNames);
      if (Array.isArray(parsed) && parsed.length === 2) {
        playerNames = parsed;
      }
    } catch (e) {
      // ignore parse errors
    }
  }
}

/**
 * Load the board and game state from localStorage.
 * If nothing is stored yet, initialize defaults.
 */
function loadState() {
  const storedBoard = localStorage.getItem(boardKey);
  const storedTurn = localStorage.getItem(turnKey);
  const storedOver = localStorage.getItem(overKey);
  const storedMessage = localStorage.getItem(messageKey);
  board = storedBoard ? JSON.parse(storedBoard) : createEmptyBoard();
  currentPlayer = storedTurn ? parseInt(storedTurn, 10) : 1;
  gameOver = storedOver === '1' ? true : false;
  messageText = storedMessage || '';
}

/**
 * Build the board's cell elements and attach click listeners. Should be called once on page load.
 */
function drawCells() {
  boardDiv.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cellDiv = document.createElement('div');
      cellDiv.className = 'cell';
      cellDiv.dataset.row = r;
      cellDiv.dataset.col = c;
      cellDiv.addEventListener('click', handleClick);
      boardDiv.appendChild(cellDiv);
    }
  }
}

/**
 * Update the message displayed to the players based on the internal messageText and current state.
 */
function updateMessage() {
  // Always remove winner styling before updating
  messageDiv.classList.remove('winner');
  if (messageText) {
    messageDiv.textContent = messageText;
    // If we have a winner message, highlight it
    if (messageText.startsWith('Winner')) {
      messageDiv.classList.add('winner');
    }
    return;
  }
  if (gameOver) {
    // Should not normally reach here because messageText is set when game ends
    messageDiv.textContent = 'Game over';
  } else {
    // Show current player's name
    messageDiv.textContent = `${playerNames[currentPlayer - 1]}'s turn`;
  }
}

/**
 * Update the visual representation of the board from the current board array.
 */
function updateBoard() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    cell.innerHTML = '';
    if (board[r][c] === 1) {
      const img = document.createElement('img');
      img.src = 'player1.jpeg';
      img.alt = 'Player 1 piece';
      cell.appendChild(img);
    } else if (board[r][c] === 2) {
      const img = document.createElement('img');
      img.src = 'player2.jpeg';
      img.alt = 'Player 2 piece';
      cell.appendChild(img);
    }
  });
}

/**
 * Check for a draw: if all cells are filled without a winner
 * @returns {boolean}
 */
function isDraw() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  return true;
}

/**
 * Check if placing a piece at (row, col) causes a win. Used after each move.
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
function checkWin(row, col) {
  const player = board[row][col];
  function countDir(dx, dy) {
    let count = 0;
    let r = row + dy;
    let c = col + dx;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
      count++;
      r += dy;
      c += dx;
    }
    return count;
  }
  // Horizontal
  if (1 + countDir(1, 0) + countDir(-1, 0) >= 4) return true;
  // Vertical
  if (1 + countDir(0, 1) + countDir(0, -1) >= 4) return true;
  // Diagonal bottom-left to top-right
  if (1 + countDir(1, 1) + countDir(-1, -1) >= 4) return true;
  // Diagonal top-left to bottom-right
  if (1 + countDir(1, -1) + countDir(-1, 1) >= 4) return true;
  return false;
}

/**
 * Create and animate confetti pieces when a player wins. The confetti will be
 * appended to the body and removed after a delay.
 */
function showConfetti() {
  const container = document.createElement('div');
  container.id = 'confetti-container';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '999';
  const colors = ['#e74c3c', '#f1c40f', '#1abc9c', '#9b59b6', '#3498db', '#e67e22'];
  for (let i = 0; i < 80; i++) {
    const conf = document.createElement('div');
    conf.className = 'confetti-piece';
    conf.style.setProperty('--left', Math.random() * 100 + '%');
    conf.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
    conf.style.setProperty('--duration', (Math.random() * 2 + 3) + 's');
    container.appendChild(conf);
  }
  document.body.appendChild(container);
  setTimeout(() => {
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  }, 6000);
}

/**
 * Generate star bursts when a player wins. Stars animate and fade away.
 */
function showStars() {
  const container = document.createElement('div');
  container.id = 'stars-container';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '998';
  for (let i = 0; i < 10; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.setProperty('--left', Math.random() * 90 + 5 + '%');
    star.style.setProperty('--top', Math.random() * 60 + 20 + '%');
    star.style.setProperty('--duration', (Math.random() * 1 + 2) + 's');
    container.appendChild(star);
  }
  document.body.appendChild(container);
  setTimeout(() => {
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  }, 4000);
}

/**
 * Handle a click on any cell. Determine the column, drop a piece, update the game, and sync state.
 * @param {Event} e
 */
function handleClick(e) {
  if (gameOver) return;
  const col = parseInt(e.currentTarget.dataset.col, 10);
  // Find the lowest empty row in this column
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = currentPlayer;
          // Check for win or draw
          if (checkWin(r, col)) {
            // Set winner message using player names
            messageText = `Winner: ${playerNames[currentPlayer - 1]}`;
            gameOver = true;
            // Celebrate with confetti and stars
            showConfetti();
            showStars();
          } else if (isDraw()) {
            messageText = 'Draw!';
            gameOver = true;
          } else {
            // Switch turns
            currentPlayer = currentPlayer === 1 ? 2 : 1;
            messageText = '';
          }
          // Save and update UI
          saveState();
          updateBoard();
          updateMessage();
          return;
    }
  }
  // Column is full; ignore click
}

/**
 * Handle storage events from other tabs; update our local state accordingly.
 * @param {StorageEvent} event
 */
function onStorageChange(event) {
      if ([boardKey, turnKey, overKey, messageKey, namesKey].includes(event.key)) {
        loadState();
        loadNames();
        updateBoard();
        updateMessage();
        // If a winner has been declared in another tab, trigger celebration
        if (gameOver && messageText && messageText.startsWith('Winner')) {
          showConfetti();
          showStars();
        }
      }
}

    /**
     * Initialize the game by loading state, drawing cells, loading player names, and updating UI.
     */
    function initGame() {
      // Draw board cells (once)
      drawCells();
      // Load any stored state
      loadState();
      // Load names if stored
      loadNames();
      // If no board stored yet, save the newly created board
      if (!localStorage.getItem(boardKey)) {
        saveState();
      }
      updateBoard();
      updateMessage();
    }

// Bind events
resetButton.addEventListener('click', () => {
  // Reset state to defaults and save
  board = createEmptyBoard();
  currentPlayer = 1;
  gameOver = false;
  messageText = '';
  saveState();
  updateBoard();
  updateMessage();
});
window.addEventListener('storage', onStorageChange);

    // Lobby elements for capturing player names
    const lobby = document.getElementById('lobby');
    const startButton = document.getElementById('start-button');
    const name1Input = document.getElementById('name1');
    const name2Input = document.getElementById('name2');

    startButton.addEventListener('click', () => {
      // Retrieve names and default if empty
      const n1 = name1Input.value.trim() || 'Player 1';
      const n2 = name2Input.value.trim() || 'Player 2';
      playerNames = [n1, n2];
      saveNames();
      // Hide lobby
      lobby.style.display = 'none';
      // Start the game
      initGame();
    });

    // Determine if names already exist; if so, load names and start game immediately
    if (localStorage.getItem(namesKey)) {
      loadNames();
      lobby.style.display = 'none';
      initGame();
    } else {
      // Ensure lobby is visible
      lobby.style.display = 'flex';
    }