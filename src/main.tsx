import { createRoot } from "react-dom/client"
import "./index.css"
import { AppRoot } from "./app/AppRoot"

// Suppress unhandled rejection when user cancels the file picker (e.g. Excalidraw image upload).
window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason
  if (reason?.name === "AbortError" && typeof reason?.message === "string" && reason.message.includes("showOpenFilePicker")) {
    event.preventDefault()
    event.stopPropagation()
  }
})

createRoot(document.getElementById("root")!).render(
  <AppRoot />
)
