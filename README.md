# Real-Time Collaborative Planning Board

A real-time collaborative planning board where multiple users can create, edit, and delete tasks while seeing updates from other users instantly.

## Features

- ✅ Real-time task synchronization via WebSockets
- ✅ Live presence tracking (connected users)
- ✅ Create, edit, and delete tasks
- ✅ Event-driven architecture
- ✅ No authentication required
- ✅ In-memory state (no persistence)

## Tech Stack

### Frontend
- Vite
- React
- TypeScript

### Backend
- Node.js
- WebSocket (ws library)
- TypeScript

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173` (or the next available port).

### Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start development server
npm run dev
```

The WebSocket server will run on `ws://localhost:3001` by default.

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_WS_URL=ws://localhost:3001
```

For production, update `VITE_WS_URL` to your deployed WebSocket server URL (e.g., `wss://your-app.railway.app`).

## Deployment

### Frontend (Vercel)

1. Push your code to a Git repository
2. Import the project in Vercel
3. Set the build command: `npm run build`
4. Set the output directory: `dist`
5. Add environment variable: `VITE_WS_URL` with your WebSocket server URL

### Backend (Railway)

1. Create a new project in Railway
2. Connect your Git repository
3. Set the root directory to `server`
4. Railway will automatically detect Node.js and build
5. Set the `PORT` environment variable (Railway usually provides this automatically)
6. Update your frontend's `VITE_WS_URL` to point to the Railway WebSocket URL

**Important**: For WebSocket connections on Railway, ensure your URL uses `wss://` (secure WebSocket) in production.

## Architecture

### Event Types

#### Client → Server
- `TASK_CREATE` - Create a new task
- `TASK_UPDATE` - Update an existing task
- `TASK_DELETE` - Delete a task

#### Server → Client
- `STATE_SYNC` - Initial state synchronization on connection
- `TASK_CREATED` - Task was created
- `TASK_UPDATED` - Task was updated
- `TASK_DELETED` - Task was deleted
- `USER_COUNT_UPDATED` - Connected user count changed

### State Model

```typescript
type Task = {
  id: string
  title: string
}

type ServerState = {
  tasks: Record<string, Task>
  connectedUsers: number
}
```

## Testing

1. Open the application in two different browser tabs/windows
2. Create a task in one tab - it should appear in the other tab instantly
3. Edit a task - changes should sync across all tabs
4. Delete a task - removal should sync across all tabs
5. Check the user count - it should reflect the number of open tabs

## Project Structure

```
colab/
├── src/                 # Frontend React application
│   ├── hooks/          # React hooks (useWebSocket)
│   ├── App.tsx         # Main application component
│   └── types.ts        # TypeScript types
├── server/             # Backend WebSocket server
│   └── src/
│       └── index.ts    # Server entry point
├── shared/             # Shared types between client and server
│   └── types.ts        # Event and state type definitions
└── package.json        # Frontend dependencies
```

## Scope Constraints

This project intentionally excludes:
- ❌ Authentication or user accounts
- ❌ Persistent storage (database, file system)
- ❌ Drag-and-drop interactions
- ❌ Permissions or roles
- ❌ Mobile optimization
- ❌ Undo/redo functionality
- ❌ Advanced styling beyond basic readability

## License

MIT
# CoLab
