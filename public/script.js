// Connect to the server
const socket = io();

// Game state variables
let currentSentence = '';
let isPlayerTurn = false;
let gameCode = '';
let username = '';
let isPublicGame = false;
let isGameStarted = false;
let playerCount = 0;

// DOM elements
const sentenceDisplay = document.getElementById('sentence-display');
const wordInput = document.getElementById('word-input');
const submitBtn = document.getElementById('submit-btn');
const newGameBtn = document.getElementById('new-game-btn');
const joinGameBtn = document.getElementById('join-game-btn');
const joinRandomPublicGameBtn = document.getElementById('join-random-public-game-btn');
const gameCodeInput = document.getElementById('game-code-input');
const messagesContainer = document.getElementById('messages-container');
const chatInput = document.getElementById('chat-input');
const usernameInput = document.getElementById('username-input');
const gameOptionsContainer = document.getElementById('game-options-container');
const usernameContainer = document.getElementById('username-container');
const navToggle = document.querySelector('.nav-toggle');
const sideNav = document.querySelector('.sidenav');
const closeBtn = document.querySelector('.close-btn');

// Event listeners
newGameBtn.addEventListener('click', createNewGame);
joinGameBtn.addEventListener('click', joinExistingGame);
joinRandomPublicGameBtn.addEventListener('click', joinRandomPublicGame);
submitBtn.addEventListener('click', submitWord);
wordInput.addEventListener('input', toggleSubmitButton);
chatInput.addEventListener('keyup', sendChatMessage);
usernameInput.addEventListener('input', setUsername);
navToggle.addEventListener('click', toggleSideNav);
closeBtn.addEventListener('click', toggleSideNav);

function toggleSideNav() {
  sideNav.classList.toggle('open');
}

// Function to set the player's username
function setUsername() {
  username = usernameInput.value.trim();
  localStorage.setItem('username', username);
  socket.emit('setUsername', username);
}

// Function to create a new game
function createNewGame() {
  const isPublic = document.getElementById('public-game-checkbox').checked;
  socket.emit('createGame', isPublic);
}

// Function to join an existing game
function joinExistingGame() {
  const code = gameCodeInput.value.trim();
  if (code) {
    socket.emit('joinGame', code);
  }
}

// Function to join a random public game
function joinRandomPublicGame() {
  socket.emit('joinRandomPublicGame');
}

// Function to submit a word
function submitWord() {
  const word = wordInput.value.trim();
  if (word && isPlayerTurn && /^[a-zA-Z!?.]+$/.test(word)) {
    socket.emit('submitWord', gameCode, word);
    wordInput.value = '';
  }
}

// Function to toggle the submit button based on input
function toggleSubmitButton() {
  const word = wordInput.value.trim();
  submitBtn.disabled = !word || !/^[a-zA-Z!?.]+$/.test(word);
}

// Function to send a chat message
function sendChatMessage(event) {
  if (event.key === 'Enter') {
    const message = chatInput.value.trim();
    if (message) {
      socket.emit('chatMessage', gameCode, message);
      chatInput.value = '';
    }
  }
}

// Load the player's username from localStorage
window.onload = () => {
  const storedUsername = localStorage.getItem('username');
  if (storedUsername) {
    username = storedUsername;
    usernameInput.value = username;
    socket.emit('setUsername', username);
  }
  hideGameElements(); 
};

function appendMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  messagesContainer.appendChild(messageElement);
}

function resetGameState() {
  currentSentence = '';
  isPlayerTurn = false;
  gameCode = '';
  isPublicGame = false;
  isGameStarted = false;
  playerCount = 0; 
  sentenceDisplay.textContent = '';
  wordInput.disabled = true;
  submitBtn.disabled = true;
  gameCodeInput.disabled = false;
  gameCodeInput.value = '';
  chatInput.disabled = true;
  messagesContainer.innerHTML = '';
  gameOptionsContainer.style.display = 'flex';
  usernameContainer.style.display = 'flex';
  hideGameElements(); 
}

function hideGameElements() {
  sentenceDisplay.style.display = 'none';
  wordInput.style.display = 'none';
  submitBtn.style.display = 'none';
  messagesContainer.style.display = 'none';
  chatInput.style.display = 'none';
}

function showGameElements() {
  sentenceDisplay.style.display = 'block';
  wordInput.style.display = 'block';
  submitBtn.style.display = 'block';
  messagesContainer.style.display = 'block';
  chatInput.style.display = 'block';
}


socket.on('gameCreated', (code, isPublic) => {
  gameCode = code;
  isPublicGame = isPublic;
  isPlayerTurn = true;
  isGameStarted = true;
  playerCount = 1; 
  wordInput.disabled = false;
  submitBtn.disabled = false;
  gameCodeInput.disabled = true;
  gameCodeInput.value = '';
  chatInput.disabled = false;
  appendMessage(`Game code: ${gameCode}`);
  gameOptionsContainer.style.display = 'none';
  usernameContainer.style.display = 'none';
  showGameElements(); 
});

socket.on('playerJoined', (playerId, playerUsername) => {
  playerCount++; 
  appendMessage(`${playerUsername} joined the game`);

  if (playerCount > 10) {
    appendMessage('Maximum player limit reached. No more players can join this game.');
    socket.emit('maxPlayersReached', gameCode);
  }
});

socket.on('gameJoined', (code, sentence, currentPlayerId) => {
  gameCode = code;
  currentSentence = sentence;
  sentenceDisplay.textContent = sentence;
  isPlayerTurn = (socket.id === currentPlayerId);
  wordInput.disabled = !isPlayerTurn;
  submitBtn.disabled = !isPlayerTurn;
  gameCodeInput.disabled = true;
  gameCodeInput.value = '';
  chatInput.disabled = false;
  isGameStarted = true;
  gameOptionsContainer.style.display = 'none';
  usernameContainer.style.display = 'none';
  showGameElements();
});

socket.on('maxPlayersReached', () => {
  appendMessage('Maximum player limit reached. You cannot join this game.');
});

socket.on('sentenceUpdated', (sentence, currentPlayerId) => {
  currentSentence = sentence;
  sentenceDisplay.textContent = sentence;
  isPlayerTurn = (socket.id === currentPlayerId);
  wordInput.disabled = !isPlayerTurn;
  submitBtn.disabled = !isPlayerTurn;
});

socket.on('newMessage', (senderId, senderUsername, message) => {
  appendMessage(`${senderUsername}: ${message}`);
});

socket.on('playerLeft', (playerId, playerUsername) => {
  appendMessage(`${playerUsername} left the game`);
});

socket.on('gameNotFound', () => {
  alert('Game not found');
});

socket.on('gameIsFull', () => {
  alert('Game is full. Please try another game or create a new one.');
});

socket.on('noPublicGamesAvailable', () => {
  alert('No public games available. Please create a new game or try again later.');
});

socket.on('gameEnded', (finalSentence) => {
  alert(`Game ended! Final sentence: ${finalSentence}`);
  resetGameState();
});
