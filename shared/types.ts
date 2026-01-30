// Shared types for client and server

export type Task = {
  id: string
  title: string
}

export type ServerState = {
  tasks: Record<string, Task>
  connectedUsers: number
}

// Client → Server Events
export type TaskCreateEvent = {
  type: "TASK_CREATE"
  payload: {
    title: string
  }
}

export type TaskUpdateEvent = {
  type: "TASK_UPDATE"
  payload: {
    id: string
    title: string
  }
}

export type TaskDeleteEvent = {
  type: "TASK_DELETE"
  payload: {
    id: string
  }
}

export type ClientEvent = TaskCreateEvent | TaskUpdateEvent | TaskDeleteEvent

// Server → Client Events
export type StateSyncEvent = {
  type: "STATE_SYNC"
  payload: {
    tasks: Task[]
    connectedUsers: number
  }
}

export type TaskCreatedEvent = {
  type: "TASK_CREATED"
  payload: {
    task: Task
  }
}

export type TaskUpdatedEvent = {
  type: "TASK_UPDATED"
  payload: {
    task: Task
  }
}

export type TaskDeletedEvent = {
  type: "TASK_DELETED"
  payload: {
    id: string
  }
}

export type UserCountUpdatedEvent = {
  type: "USER_COUNT_UPDATED"
  payload: {
    connectedUsers: number
  }
}

export type ServerEvent =
  | StateSyncEvent
  | TaskCreatedEvent
  | TaskUpdatedEvent
  | TaskDeletedEvent
  | UserCountUpdatedEvent
