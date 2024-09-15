const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const usersFile = path.join(__dirname, 'database', 'users.json');
const messagesFile = path.join(__dirname, 'database', 'messages.json');
const adminFile = path.join(__dirname, 'database', 'admin.json');

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }
        throw error;
    }
}

async function writeJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

const activeUsers = new Map();

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    let username;
    
    ws.on('message', async (message) => {
        console.log('Received message:', message.toString());
        const data = JSON.parse(message.toString());
        switch(data.type) {
            case 'join':
                username = data.username;
                activeUsers.set(ws, username);
                broadcastUserList();
                broadcast(JSON.stringify({ type: 'join', username: username }));
                break;
            case 'chat':
                broadcast(JSON.stringify({ type: 'chat', username: data.username, message: data.message }));
                await saveMessage(data.username, data.message);
                break;
            case 'clearChat':
                if (await isAdmin(data.username)) {
                    await clearChat();
                    broadcast(JSON.stringify({ type: 'clearChat', username: data.username }));
                }
                break;
            case 'kickUser':
                if (await isAdmin(data.username)) {
                    kickUser(data.userToKick);
                }
                break;
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
        if (username) {
            activeUsers.delete(ws);
            broadcastUserList();
            broadcast(JSON.stringify({ type: 'leave', username: username }));
        }
    });
});

function broadcast(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function broadcastUserList() {
    const users = Array.from(activeUsers.values());
    const userListMessage = JSON.stringify({ type: 'userList', users: users });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(userListMessage);
        }
    });
}

app.post('/server/signup', async (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.json({ success: false, message: 'All fields are required' });
    }

    const users = await readJsonFile(usersFile);

    if (users[username]) {
        return res.json({ success: false, message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    users[username] = {
        name,
        username,
        password: hashedPassword
    };

    await writeJsonFile(usersFile, users);
    res.json({ success: true, message: 'Signup successful' });
});

app.post('/server/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, message: 'Username and password are required' });
    }

    const users = await readJsonFile(usersFile);
    const admins = await readJsonFile(adminFile);

    const user = users[username] || admins[username];

    if (!user) {
        return res.json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
        const isAdmin = !!admins[username];
        res.json({ success: true, message: 'Login successful', isAdmin });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/server/save_message', async (req, res) => {
    const { username, message } = req.body;

    if (!username || !message) {
        return res.json({ success: false, message: 'Username and message are required' });
    }

    await saveMessage(username, message);
    res.json({ success: true });
});

app.get('/server/get_messages', async (req, res) => {
    const messages = await readJsonFile(messagesFile);
    res.json(messages.slice(-50));
});

app.get('/server/check_admin', async (req, res) => {
    const { username } = req.query;
    const isAdminUser = await isAdmin(username);
    res.json({ isAdmin: isAdminUser });
});

app.post('/server/clear_chat', async (req, res) => {
    const { username } = req.body;

    if (!await isAdmin(username)) {
        return res.json({ success: false, message: 'Not authorized' });
    }

    await clearChat();
    res.json({ success: true, message: 'Chat cleared successfully' });
});

app.post('/server/kick_user', async (req, res) => {
    const { adminUsername, userToKick } = req.body;

    if (!await isAdmin(adminUsername)) {
        return res.json({ success: false, message: 'Not authorized' });
    }

    kickUser(userToKick);
    res.json({ success: true, message: 'User kicked successfully' });
});

async function isAdmin(username) {
    const admins = await readJsonFile(adminFile);
    return !!admins[username];
}

async function saveMessage(username, message) {
    const messages = await readJsonFile(messagesFile);
    messages.push({
        username,
        message,
        timestamp: Date.now()
    });
    await writeJsonFile(messagesFile, messages);
}

async function clearChat() {
    await writeJsonFile(messagesFile, []);
}

function kickUser(username) {
    let kicked = false;
    wss.clients.forEach((client) => {
        if (activeUsers.get(client) === username) {
            client.send(JSON.stringify({ type: 'kickUser', username: username }));
            client.close();
            kicked = true;
        }
    });
    if (kicked) {
        activeUsers.forEach((value, key) => {
            if (value === username) {
                activeUsers.delete(key);
            }
        });
        broadcastUserList();
        broadcast(JSON.stringify({ type: 'userKicked', username: username }));
    }
}

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});