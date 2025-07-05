const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  maxHttpBufferSize: 1e7 // 10MB for image uploads
});

const PORT = process.env.PORT || 3000;
const USER_PASSWORD = "0421";
const ADMIN_PASSWORD = "Zen0421";

let users = {}; // { socket.id: { username, role } }
let messages = []; // { id, username, content, type, timestamp }

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ルートURLへのアクセス
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// パスワード認証
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, role: 'admin' });
  } else if (password === USER_PASSWORD) {
    res.json({ success: true, role: 'user' });
  } else {
    res.json({ success: false });
  }
});

// Socket.IOの接続処理
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // ユーザー名設定とユーザーリスト更新
  socket.on('set username', ({ username, role }) => {
    let finalUsername = username;
    if (username === 'ロリ連続誘拐犯') {
      finalUsername = 'かいりのでかちん';
    }
    users[socket.id] = { username: finalUsername, role };
    io.emit('user list update', Object.values(users).map(u => u.username));
    socket.emit('chat history', messages);
    console.log(users);
  });

  // チャットメッセージの処理
  socket.on('chat message', (msg) => {
    if (!users[socket.id]) return; // Ignore messages from users without a username

    const messageData = {
      id: Date.now(),
      username: users[socket.id].username,
      content: msg.content,
      type: msg.type || 'text',
      timestamp: new Date().toISOString() // Add timestamp
    };
    messages.push(messageData);
    io.emit('chat message', messageData);
  });

  // メッセージ削除
  socket.on('delete message', (messageId) => {
    if (users[socket.id] && users[socket.id].role === 'admin') {
      messages = messages.filter(msg => msg.id !== messageId);
      io.emit('message deleted', messageId);
    }
  });

  // ユーザーキック
  socket.on('kick user', (usernameToKick) => {
    if (users[socket.id] && users[socket.id].role === 'admin') {
      const targetSocketId = Object.keys(users).find(id => users[id].username === usernameToKick);
      if (targetSocketId) {
        io.to(targetSocketId).emit('kicked');
        io.sockets.sockets.get(targetSocketId).disconnect(true);
      }
    }
  });

  // 切断処理
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete users[socket.id];
    io.emit('user list update', Object.values(users).map(u => u.username));
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});