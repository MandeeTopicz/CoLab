import { useState } from "react"
import { useWebSocket } from "./hooks/useWebSocket"
import type { Task } from "./types"
import "./App.css"

function App() {
  const { tasks, connectedUsers, isConnected, sendEvent } = useWebSocket()
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected) {
      return // UI is disabled when disconnected; this is a safeguard
    }
    if (newTaskTitle.trim()) {
      sendEvent({
        type: "TASK_CREATE",
        payload: { title: newTaskTitle.trim() },
      })
      setNewTaskTitle("")
    }
  }

  const handleStartEdit = (task: Task) => {
    setEditingId(task.id)
    setEditingTitle(task.title)
  }

  const handleSaveEdit = (id: string) => {
    if (editingTitle.trim()) {
      sendEvent({
        type: "TASK_UPDATE",
        payload: { id, title: editingTitle.trim() },
      })
    }
    setEditingId(null)
    setEditingTitle("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingTitle("")
  }

  const handleDelete = (id: string) => {
    sendEvent({
      type: "TASK_DELETE",
      payload: { id },
    })
  }

  const taskList = Object.values(tasks)

  return (
    <div className="app">
      <header className="header">
        <h1>Collaborative Planning Board</h1>
        <div className="status">
          <span className={`connection-status ${isConnected ? "connected" : "disconnected"}`}>
            {isConnected ? "● Connected" : "○ Disconnected"}
          </span>
          <span className="user-count">
            {connectedUsers} {connectedUsers === 1 ? "user" : "users"} online
          </span>
        </div>
      </header>

      <main className="main">
        {!isConnected && (
          <p className="connection-hint">
            Not connected. Start the WebSocket server (e.g. <code>cd server && npm run dev</code>) and refresh.
          </p>
        )}
        <form onSubmit={handleCreateTask} className="task-form">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter task title..."
            className="task-input"
            disabled={!isConnected}
          />
          <button type="submit" className="create-button" disabled={!isConnected}>
            Create Task
          </button>
        </form>

        <div className="task-list">
          {taskList.length === 0 ? (
            <p className="empty-state">No tasks yet. Create one above!</p>
          ) : (
            taskList.map((task) => (
              <div key={task.id} className="task-item">
                {editingId === task.id ? (
                  <div className="task-edit">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveEdit(task.id)
                        } else if (e.key === "Escape") {
                          handleCancelEdit()
                        }
                      }}
                      className="task-input"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(task.id)}
                      className="save-button"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="cancel-button"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="task-display">
                    <span className="task-title">{task.title}</span>
                    <div className="task-actions">
                      <button
                        onClick={() => handleStartEdit(task)}
                        className="edit-button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

export default App
