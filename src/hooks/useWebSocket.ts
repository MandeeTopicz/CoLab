import { useEffect, useRef, useState, useCallback } from "react"
import type {
  ServerEvent,
  ClientEvent,
  Task,
  StateSyncEvent,
  TaskCreatedEvent,
  TaskUpdatedEvent,
  TaskDeletedEvent,
  UserCountUpdatedEvent,
} from "../types"

type UseWebSocketReturn = {
  tasks: Record<string, Task>
  connectedUsers: number
  isConnected: boolean
  sendEvent: (event: ClientEvent) => void
}

const WS_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost:3001"

export function useWebSocket(): UseWebSocketReturn {
  const [tasks, setTasks] = useState<Record<string, Task>>({})
  const [connectedUsers, setConnectedUsers] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const sendEvent = useCallback((event: ClientEvent) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event))
    }
  }, [])

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const serverEvent: ServerEvent = JSON.parse(event.data)

      switch (serverEvent.type) {
        case "STATE_SYNC": {
          const syncEvent = serverEvent as StateSyncEvent
          const tasksMap: Record<string, Task> = {}
          syncEvent.payload.tasks.forEach((task) => {
            tasksMap[task.id] = task
          })
          setTasks(tasksMap)
          setConnectedUsers(syncEvent.payload.connectedUsers)
          break
        }

        case "TASK_CREATED": {
          const createdEvent = serverEvent as TaskCreatedEvent
          setTasks((prev) => ({
            ...prev,
            [createdEvent.payload.task.id]: createdEvent.payload.task,
          }))
          break
        }

        case "TASK_UPDATED": {
          const updatedEvent = serverEvent as TaskUpdatedEvent
          setTasks((prev) => ({
            ...prev,
            [updatedEvent.payload.task.id]: updatedEvent.payload.task,
          }))
          break
        }

        case "TASK_DELETED": {
          const deletedEvent = serverEvent as TaskDeletedEvent
          setTasks((prev) => {
            const newTasks = { ...prev }
            delete newTasks[deletedEvent.payload.id]
            return newTasks
          })
          break
        }

        case "USER_COUNT_UPDATED": {
          const countEvent = serverEvent as UserCountUpdatedEvent
          setConnectedUsers(countEvent.payload.connectedUsers)
          break
        }
      }
    } catch (error) {
      console.error("Error parsing server event:", error)
    }
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }

      ws.onmessage = handleMessage

      ws.onclose = () => {
        setIsConnected(false)
        // Attempt to reconnect after 1 second
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 1000)
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
      }
    } catch (error) {
      console.error("Failed to connect:", error)
      setIsConnected(false)
    }
  }, [handleMessage])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return {
    tasks,
    connectedUsers,
    isConnected,
    sendEvent,
  }
}
