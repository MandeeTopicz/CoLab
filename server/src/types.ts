// Server-side types (mirrors shared/types.ts for self-contained build)

export type Task = {
  id: string
  title: string
}

export type ServerState = {
  tasks: Record<string, Task>
  connectedUsers: number
}

export type TaskCreateEvent = {
  type: "TASK_CREATE"
  payload: { title: string }
}

export type TaskUpdateEvent = {
  type: "TASK_UPDATE"
  payload: { id: string; title: string }
}

export type TaskDeleteEvent = {
  type: "TASK_DELETE"
  payload: { id: string }
}

export type ClientEvent = TaskCreateEvent | TaskUpdateEvent | TaskDeleteEvent

export type ServerEvent =
  | { type: "STATE_SYNC"; payload: { tasks: Task[]; connectedUsers: number } }
  | { type: "TASK_CREATED"; payload: { task: Task } }
  | { type: "TASK_UPDATED"; payload: { task: Task } }
  | { type: "TASK_DELETED"; payload: { id: string } }
  | { type: "USER_COUNT_UPDATED"; payload: { connectedUsers: number } }
