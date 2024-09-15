let chatSocket;
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
let isAdmin = urlParams.get('isAdmin') === 'true';

function initChat() {
    console.log('Initializing chat...');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendMessage');

    initMatrix();
    clearMessages();
    loadMessages();

    sendButton.addEventListener('click', sendMessageHandler);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessageHandler();
        }
    });

    connectWebSocket();
    checkAdminStatus();

    console.log('Is admin:', isAdmin);

    if (isAdmin) {
        document.getElementById('clearChatBtn').style.display = 'block';
    }

    document.getElementById('clearChatBtn').addEventListener('click', clearChat);
}

function connectWebSocket() {
    console.log('Connecting to WebSocket...');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    chatSocket = new WebSocket(`${protocol}//${host}`);

    chatSocket.onopen = () => {
        console.log('WebSocket connected');
        chatSocket.send(JSON.stringify({ type: 'join', username: username }));
        addMessage('System', `Welcome, ${username}! You've entered the hacker's chat room.`);
    };

    chatSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);
        switch(data.type) {
            case 'chat':
                addMessage(data.username, data.message);
                break;
            case 'userList':
                updateUserList(data.users);
                break;
            case 'join':
                addMessage('System', `${data.username} has joined the chat.`);
                break;
            case 'leave':
                addMessage('System', `${data.username} has left the chat.`);
                break;
            case 'clearChat':
                document.getElementById('chatMessages').innerHTML = '';
                addMessage('System', 'Chat has been cleared by admin.');
                break;
            case 'kickUser':
                if (data.username === username) {
                    console.log('You have been kicked from the chat.');
                    alert('You have been kicked from the chat.');
                    window.location.href = 'login.html';
                }
                break;
            case 'userKicked':
                addMessage('System', `${data.username} has been kicked from the chat.`);
                break;
        }
    };

    chatSocket.onclose = () => {
        console.log('WebSocket disconnected. Trying to reconnect...');
        setTimeout(connectWebSocket, 5000);
    };

    chatSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function sendMessageHandler() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message) {
        sendMessage(username, message);
        messageInput.value = '';
    }
}

function sendMessage(username, message) {
    if (chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({ type: 'chat', username: username, message: message }));
    } else {
        console.error('WebSocket is not connected');
    }
}

function loadMessages() {
    fetch('/server/get_messages')
        .then(response => response.json())
        .then(messages => {
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = '';
            messages.forEach(msg => addMessage(msg.username, msg.message));
        })
        .catch(error => console.error('Error loading messages:', error));
}

function updateUserList(users) {
    console.log('Updating user list:', users);
    const activeUsers = document.getElementById('activeUsers');
    activeUsers.innerHTML = '';
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'activeUser';
        userElement.textContent = user;
        if (isAdmin && user !== username) {
            const kickButton = document.createElement('button');
            kickButton.textContent = '❌';
            kickButton.className = 'kickButton';
            kickButton.onclick = () => kickUser(user);
            userElement.appendChild(kickButton);
        }
        activeUsers.appendChild(userElement);
    });
    console.log('User list updated:', users);
}

function kickUser(userToKick) {
    if (!isAdmin) {
        console.log('Kick attempt failed: Not an admin');
        return;
    }

    console.log(`Attempting to kick user: ${userToKick}`);
    fetch('/server/kick_user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminUsername: username, userToKick: userToKick })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`User ${userToKick} kicked successfully`);
        } else {
            console.error('Failed to kick user:', data.message);
        }
    })
    .catch(error => {
        console.error('Error kicking user:', error);
    });
}

function addMessage(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function initMatrix() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const columns = Math.floor(canvas.width / 20) + 1;
    const ypos = Array(columns).fill(0);

    function matrix() {
        ctx.fillStyle = '#0001';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0f0';
        ctx.font = '15pt monospace';

        ypos.forEach((y, ind) => {
            const text = String.fromCharCode(Math.random() * 128);
            const x = ind * 20;
            ctx.fillText(text, x, y);
            if (y > 100 + Math.random() * 10000) ypos[ind] = 0;
            else ypos[ind] = y + 20;
        });
    }

    setInterval(matrix, 50);
}

function clearMessages() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', initChat);

function clearChat() {
    if (!isAdmin) return;

    chatSocket.send(JSON.stringify({ type: 'clearChat', username: username }));
}

function checkAdminStatus() {
    console.log('Checking admin status...');
    fetch(`/server/check_admin?username=${encodeURIComponent(username)}`)
        .then(response => response.json())
        .then(data => {
            console.log('Admin status response:', data);
            isAdmin = data.isAdmin;
            document.getElementById('clearChatBtn').style.display = isAdmin ? 'block' : 'none';
        })
        .catch(error => console.error('Error checking admin status:', error));
}