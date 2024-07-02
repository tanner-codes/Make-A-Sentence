const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Game state
const games = {};
const publicGames = [];

// Serve static files
app.use(express.static('public'));

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('A user connected');

  // Get the player's username and profile picture
  socket.on('setUsername', (username, pfp) => {
    socket.username = username;
    socket.pfp = pfp;
  });

  // Create a new game
  socket.on('createGame', (isPublic) => {
    const gameCode = generateGameCode();
    const game = {
      code: gameCode,
      players: [{ id: socket.id, username: socket.username, pfp: socket.pfp }],
      sentence: '',
      currentPlayerIndex: 0,
      isPublic: isPublic,
    };
    games[gameCode] = game;
    socket.join(gameCode);
    if (isPublic) {
      publicGames.push(game);
    }
    socket.emit('gameCreated', gameCode, isPublic);
  });

  // Join an existing game
  socket.on('joinGame', (gameCode) => {
    const game = games[gameCode];
    if (game && game.players.length < 10) {
      game.players.push({ id: socket.id, username: socket.username, pfp: socket.pfp });
      socket.join(gameCode);
      io.to(gameCode).emit('playerJoined', socket.id, socket.username, socket.pfp);
      io.to(socket.id).emit('gameJoined', gameCode, game.sentence, game.players[game.currentPlayerIndex].id);
    } else if (!game) {
      socket.emit('gameNotFound');
    } else {
      socket.emit('gameIsFull');
    }
  });

  // Join a random public game
  socket.on('joinRandomPublicGame', () => {
    const availablePublicGames = publicGames.filter(game => game.players.length < 10);
    if (availablePublicGames.length > 0) {
      const randomGame = availablePublicGames[Math.floor(Math.random() * availablePublicGames.length)];
      const gameCode = randomGame.code;
      randomGame.players.push({ id: socket.id, username: socket.username, pfp: socket.pfp });
      socket.join(gameCode);
      io.to(gameCode).emit('playerJoined', socket.id, socket.username, socket.pfp);
      io.to(socket.id).emit('gameJoined', gameCode, randomGame.sentence, randomGame.players[randomGame.currentPlayerIndex].id);
    } else {
      socket.emit('noPublicGamesAvailable');
    }
  });

  // Submit a word
  socket.on('submitWord', (gameCode, word) => {
    const game = games[gameCode];
    if (game && game.players[game.currentPlayerIndex].id === socket.id) {
      game.sentence += `${word} `;
      if (word.endsWith('.') || word.endsWith('?') || word.endsWith('!')) {
        io.to(gameCode).emit('gameEnded', game.sentence);
        delete games[gameCode];
        const publicGameIndex = publicGames.findIndex(g => g.code === gameCode);
        if (publicGameIndex !== -1) {
          publicGames.splice(publicGameIndex, 1);
        }
      } else {
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        io.to(gameCode).emit('sentenceUpdated', game.sentence, game.players[game.currentPlayerIndex].id);
      }
    }
  });

  // Send a chat message
  socket.on('chatMessage', (gameCode, message) => {
    const game = games[gameCode];
    if (game) {
      io.to(gameCode).emit('newMessage', socket.id, socket.username, message, socket.pfp);
    }
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    Object.keys(games).forEach((gameCode) => {
      const game = games[gameCode];
      const playerIndex = game.players.findIndex((player) => player.id === socket.id);
      if (playerIndex !== -1) {
        const playerUsername = game.players[playerIndex].username;
        const playerPFP = game.players[playerIndex].pfp;
        game.players.splice(playerIndex, 1);
        if (game.players.length === 0) {
          delete games[gameCode];
          const publicGameIndex = publicGames.findIndex(g => g.code === gameCode);
          if (publicGameIndex !== -1) {
            publicGames.splice(publicGameIndex, 1);
          }
        } else if (playerIndex === game.currentPlayerIndex) {
          game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        }
        io.to(gameCode).emit('playerLeft', socket.id, playerUsername, playerPFP);
      }
    });
  });
});

// Generate a random game code
function generateGameCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Start the server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
