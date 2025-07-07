let socket;
let currentUser = '';
let isAdmin = false;
let onlineUsersCount = 0;

// サーバー接続
function connectToServer() {
    socket = io();
    console.log("Socket initialized:", socket);
    
    socket.on('connect', () => {
        updateConnectionStatus(true);
        console.log("Socket connected!");
    });

    socket.on('disconnect', () => {
        updateConnectionStatus(false);
        console.log("Socket disconnected!");
    });

    socket.on('message', (data) => {
        displayMessage(data);
    });

    socket.on('userJoined', (data) => {
        displaySystemMessage(`${data.username}さんが参加しました`);
        updateOnlineUsers(data.onlineCount);
    });

    socket.on('userLeft', (data) => {
        displaySystemMessage(`${data.username}さんが退出しました`);
        updateOnlineUsers(data.onlineCount);
    });

    socket.on('onlineUsers', (count) => {
        updateOnlineUsers(count);
    });

    socket.on('messagesCleared', () => {
        document.getElementById('chatMessages').innerHTML = '';
        displaySystemMessage('管理者によってメッセージが削除されました');
    });
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    connectToServer();
    
    document.getElementById('passwordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});

function login() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    if (!username) {
        showError('ユーザー名を入力してください');
        return;
    }

    if (username.length < 2) {
        showError('ユーザー名は2文字以上で入力してください');
        return;
    }

    if (password !== 'zen0421') {
        showError('アクセスコードが間違っています');
        return;
    }

    loginSuccess(username, false);
}

function adminLogin() {
    const username = document.getElementById('usernameInput').value.trim() || '管理者';
    const password = document.getElementById('passwordInput').value;

    if (password !== '0421') {
        showError('管理者アクセスコードが間違っています');
        return;
    }

    loginSuccess(username, true);
}

function loginSuccess(username, admin) {
    currentUser = username;
    isAdmin = admin;
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'flex';
    
    if (admin) {
        document.getElementById('chatHeader').classList.add('admin');
        document.getElementById('chatTitle').textContent = '👑 管理者チャットルーム';
        document.getElementById('adminControls').classList.add('show');
    }
    
    document.getElementById('usernameInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('errorMessage').classList.remove('show');
    
    socket.emit('userJoin', { username: currentUser, isAdmin: admin });
    
    document.getElementById('messageInput').focus();
}

function logout() {
    socket.emit('userLeave', { username: currentUser });
    
    currentUser = '';
    isAdmin = false;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('chatScreen').style.display = 'none';
    document.getElementById('chatHeader').classList.remove('admin');
    document.getElementById('adminControls').classList.remove('show');
    document.getElementById('usernameInput').focus();
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();

    if (!messageText) return;

    console.log("Socket object in sendMessage:", socket); // Debugging line

    const messageData = {
        id: Date.now(), // Add unique ID
        username: currentUser,
        content: messageText,
        type: 'text',
        timestamp: new Date().toISOString(), // Add timestamp
        isAdmin: isAdmin
    };

    socket.emit('message', messageData);
    messageInput.value = '';
}

function displayMessage(data) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    
    let messageClass = 'message ';
    if (data.username === currentUser) {
        messageClass += data.isAdmin ? 'admin' : 'user';
    } else {
        messageClass += data.isAdmin ? 'admin' : 'other';
    }
    
    messageDiv.className = messageClass;
    messageDiv.innerHTML = `
        <div><strong>${escapeHtml(data.username)}:</strong> ${escapeHtml(data.content)}</div>
        <div class="message-time">${new Date(data.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function displaySystemMessage(text) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.innerHTML = `
        <div>${escapeHtml(text)}</div>
        <div class="message-time">${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function clearAllMessages() {
    if (isAdmin && confirm('全てのメッセージを削除しますか？')) {
        socket.emit('clearMessages');
    }
}

function updateOnlineUsers(count) {
    onlineUsersCount = count;
    document.getElementById('onlineUsers').textContent = `オンライン: ${count}人`;
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (connected) {
        statusElement.textContent = '接続済み';
        statusElement.className = 'connection-status connected';
    } else {
        statusElement.textContent = '切断中';
        statusElement.className = 'connection-status disconnected';
    }
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.add('show');
    
    setTimeout(() => {
        errorElement.classList.remove('show');
    }, 3000);
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}