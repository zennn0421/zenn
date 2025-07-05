const socket = io();

// DOM Elements
const loginModal = document.getElementById('login-modal');
const loginButton = document.getElementById('login-button');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

const usernameModal = document.getElementById('username-modal');
const usernameInput = document.getElementById('username-input');
const usernameSubmit = document.getElementById('username-submit');

const appContainer = document.querySelector('.app-container');
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const userList = document.getElementById('user-list');
const imageButton = document.getElementById('image-button');
const imageInput = document.getElementById('image-input');

let username = '';
let userRole = 'user';

// --- Login --- 
loginButton.addEventListener('click', login);
passwordInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') login();
});

function login() {
    const password = passwordInput.value;
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            userRole = data.role;
            loginModal.style.display = 'none';
            usernameModal.style.display = 'flex';
        } else {
            errorMessage.innerText = 'パスワードが違います';
        }
    });
}

// --- Username Setup ---
usernameSubmit.addEventListener('click', setUsername);
usernameInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') setUsername();
});

function setUsername() {
    const name = usernameInput.value.trim();
    if (name) {
        username = name;
        socket.emit('set username', { username, role: userRole });
        usernameModal.style.display = 'none';
        appContainer.style.display = 'flex'; // Show the main chat app
    }
}

// --- Message Sending ---
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value && username) {
    socket.emit('chat message', { content: input.value, type: 'text' });
    input.value = '';
  }
});

imageButton.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            socket.emit('chat message', { content: event.target.result, type: 'image' });
        };
        reader.readAsDataURL(file);
    }
});

// --- Socket Event Handlers ---
socket.on('chat history', (history) => {
    messages.innerHTML = '';
    history.forEach(msg => displayMessage(msg));
});

socket.on('chat message', (msg) => {
    displayMessage(msg);
});

socket.on('user list update', (users) => {
    updateUserList(users);
});

socket.on('message deleted', (messageId) => {
    const messageElement = document.getElementById(`msg-${messageId}`);
    if (messageElement) {
        messageElement.remove();
    }
});

socket.on('kicked', () => {
    alert('あなたは管理者によってキックされました。');
    window.location.href = '/';
});

// --- UI Helper Functions ---
function displayMessage(msg) {
    const item = document.createElement('li');
    item.id = `msg-${msg.id}`;

    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = msg.username;

    const content = document.createElement('div');
    content.className = 'message-content';

    if (msg.type === 'image') {
        const img = document.createElement('img');
        img.src = msg.content;
        content.appendChild(img);
    } else {
        content.textContent = msg.content;
    }

    item.appendChild(header);
    item.appendChild(content);

    if (userRole === 'admin') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.onclick = () => {
            socket.emit('delete message', msg.id);
        };
        item.appendChild(deleteBtn);
    }

    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
}

function updateUserList(users) {
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        if (userRole === 'admin' && user !== username) { // Admins can't kick themselves
            const kickBtn = document.createElement('button');
            kickBtn.className = 'kick-button';
            kickBtn.textContent = 'Kick';
            kickBtn.onclick = () => {
                if(confirm(`${user} をキックしますか？`)){
                    socket.emit('kick user', user);
                }
            };
            li.appendChild(kickBtn);
        }
        userList.appendChild(li);
    });
}