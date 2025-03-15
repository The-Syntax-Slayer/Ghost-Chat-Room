const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const { 
  saveMessageToSupabase, 
  getMessagesFromSupabase, 
  clearMessagesInSupabase,
  createUser,
  getUser,
  isAdminInSupabase,
  testSupabaseConnection
} = require('./database/supabase');

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

    try {
        // Check both Supabase and local storage
        const users = await readJsonFile(usersFile);
        const existingUser = await getUser(username);

        if (users[username] || existingUser) {
            return res.json({ success: false, message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Save to Supabase
        const supabaseResult = await createUser(name, username, hashedPassword);
        if (!supabaseResult.success) {
            throw new Error(supabaseResult.error);
        }

        // Save to local storage as backup
        users[username] = {
            name,
            username,
            password: hashedPassword
        };
        await writeJsonFile(usersFile, users);

        res.json({ success: true, message: 'Signup successful' });
    } catch (error) {
        console.error('Signup error:', error);
        res.json({ success: false, message: 'Error during signup' });
    }
});

app.post('/server/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, message: 'Username and password are required' });
    }

    try {
        // Try Supabase first
        const user = await getUser(username);
        const isUserAdmin = await isAdminInSupabase(username);

        if (!user) {
            // Fallback to local storage
            const users = await readJsonFile(usersFile);
            const admins = await readJsonFile(adminFile);
            const localUser = users[username] || admins[username];

            if (!localUser) {
                return res.json({ success: false, message: 'Invalid credentials' });
            }

            const isPasswordValid = await bcrypt.compare(password, localUser.password);
            if (isPasswordValid) {
                const isAdmin = !!admins[username];
                return res.json({ success: true, message: 'Login successful', isAdmin });
            }
        } else {
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (isPasswordValid) {
                return res.json({ success: true, message: 'Login successful', isAdmin: isUserAdmin });
            }
        }

        res.json({ success: false, message: 'Invalid credentials' });
    } catch (error) {
        console.error('Login error:', error);
        res.json({ success: false, message: 'Error during login' });
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
    try {
        // Get messages from both sources
        const localMessages = await readJsonFile(messagesFile);
        const supabaseMessages = await getMessagesFromSupabase();
        
        // Use local messages as fallback
        const messages = supabaseMessages.length > 0 ? supabaseMessages : localMessages;
        res.json(messages.slice(-50));
    } catch (error) {
        console.error('Error getting messages:', error);
        const localMessages = await readJsonFile(messagesFile);
        res.json(localMessages.slice(-50));
    }
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
    try {
        // Check Supabase first
        const isSupabaseAdmin = await isAdminInSupabase(username);
        if (isSupabaseAdmin) return true;

        // Fallback to local storage
        const admins = await readJsonFile(adminFile);
        return !!admins[username];
    } catch (error) {
        console.error('Error checking admin status:', error);
        // Fallback to local storage only
        const admins = await readJsonFile(adminFile);
        return !!admins[username];
    }
}

async function saveMessage(username, message) {
    // Save to local file system
    const messages = await readJsonFile(messagesFile);
    messages.push({
        username,
        message,
        timestamp: Date.now()
    });
    await writeJsonFile(messagesFile, messages);
    
    // Save to Supabase
    await saveMessageToSupabase(username, message);
}

async function clearChat() {
    // Clear local file
    await writeJsonFile(messagesFile, []);
    
    // Clear Supabase
    await clearMessagesInSupabase();
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
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    
    // Test Supabase connection on startup
    const supabaseConnected = await testSupabaseConnection();
    if (supabaseConnected) {
        console.log('Successfully connected to Supabase database');
    } else {
        console.warn('⚠️ Could not connect to Supabase, using local storage fallback');
    }
});