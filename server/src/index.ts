import { WebSocketServer, WebSocket } from "ws"
import type {
  ClientEvent,
  ServerEvent,
  Task,
  ServerState,
  TaskCreateEvent,
  TaskUpdateEvent,
  TaskDeleteEvent,
} from "./types.js"

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001

// Server state (single source of truth)
const state: ServerState = {
  tasks: {},
  connectedUsers: 0,
}

// WebSocket server
const wss = new WebSocketServer({ port: PORT })

function generateTaskId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function broadcast(event: ServerEvent, excludeClient?: WebSocket) {
  const message = JSON.stringify(event)
  wss.clients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

function sendStateSync(client: WebSocket) {
  const tasksArray = Object.values(state.tasks)
  const event: ServerEvent = {
    type: "STATE_SYNC",
    payload: {
      tasks: tasksArray,
      connectedUsers: state.connectedUsers,
    },
  }
  client.send(JSON.stringify(event))
}

function handleTaskCreate(event: TaskCreateEvent) {
  const { title } = event.payload

  // Validate
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return // Ignore invalid events
  }

  const task: Task = {
    id: generateTaskId(),
    title: title.trim(),
  }

  state.tasks[task.id] = task

  const serverEvent: ServerEvent = {
    type: "TASK_CREATED",
    payload: { task },
  }

  broadcast(serverEvent)
}

function handleTaskUpdate(event: TaskUpdateEvent) {
  const { id, title } = event.payload

  // Validate
  if (!id || !title || typeof title !== "string" || title.trim().length === 0) {
    return // Ignore invalid events
  }

  if (!state.tasks[id]) {
    return // Task doesn't exist
  }

  const task: Task = {
    id,
    title: title.trim(),
  }

  state.tasks[id] = task

  const serverEvent: ServerEvent = {
    type: "TASK_UPDATED",
    payload: { task },
  }

  broadcast(serverEvent)
}

function handleTaskDelete(event: TaskDeleteEvent) {
  const { id } = event.payload

  // Validate
  if (!id || typeof id !== "string") {
    return // Ignore invalid events
  }

  if (!state.tasks[id]) {
    return // Task doesn't exist
  }

  delete state.tasks[id]

  const serverEvent: ServerEvent = {
    type: "TASK_DELETED",
    payload: { id },
  }

  broadcast(serverEvent)
}

function handleClientEvent(message: string, client: WebSocket) {
  try {
    const event: ClientEvent = JSON.parse(message)

    switch (event.type) {
      case "TASK_CREATE":
        handleTaskCreate(event)
        break
      case "TASK_UPDATE":
        handleTaskUpdate(event)
        break
      case "TASK_DELETE":
        handleTaskDelete(event)
        break
      default:
        // Ignore unknown event types
        break
    }
  } catch (error) {
    // Ignore malformed messages
    console.error("Error handling client event:", error)
  }
}

function updateUserCount() {
  state.connectedUsers = wss.clients.size

  const event: ServerEvent = {
    type: "USER_COUNT_UPDATED",
    payload: {
      connectedUsers: state.connectedUsers,
    },
  }

  broadcast(event)
}

wss.on("connection", (ws: WebSocket) => {
  // Send initial state sync
  sendStateSync(ws)

  // Update and broadcast user count
  updateUserCount()

  // Handle incoming messages
  ws.on("message", (message: Buffer) => {
    handleClientEvent(message.toString(), ws)
  })

  // Handle disconnect
  ws.on("close", () => {
    updateUserCount()
  })

  ws.on("error", (error) => {
    console.error("WebSocket error:", error)
  })
})

console.log(`WebSocket server running on port ${PORT}`)
