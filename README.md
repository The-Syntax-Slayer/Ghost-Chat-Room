# Hacker's Chat Room

A secure real-time chat application with WebSocket support, user authentication, and admin controls.

## Features

- Real-time messaging using WebSockets
- User authentication (signup/login)
- Admin controls (clear chat, kick users)
- Message persistence with Supabase
- Local storage fallback if database is unavailable

## Technology Stack

- Backend: Node.js, Express
- Real-time: WebSockets (ws)
- Database: Supabase
- Authentication: Custom with bcrypt password hashing

## Deployment on Render

This application is configured for easy deployment on Render.com:

1. Fork or clone this repository
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Set the following values:
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add the following environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_POOLER_URL`

## Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will run on port 8000 by default.

## Required Supabase Tables

- `users` - Stores user information
- `messages` - Stores chat messages
- `admins` - Stores admin users 