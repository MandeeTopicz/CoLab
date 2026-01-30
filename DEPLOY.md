# Deploy: Real-Time Collaborative Planning Board

Deploy **backend first** (Railway), then **frontend** (Vercel) using the backend URL.

---

## 1. Deploy backend to Railway

1. **Sign in**: [railway.app](https://railway.app) → Sign in with GitHub.

2. **New project**: **New Project** → **Deploy from GitHub repo** → select your repo (or push this repo to GitHub first).

3. **Set root directory**: In the new service, go to **Settings** → **Root Directory** → set to `server` → Save.  
   (So Railway builds and runs only the `server` folder.)

4. **Build & start**: Railway will run `npm install`, `npm run build`, and `npm start`.  
   `PORT` is set automatically; the server uses `process.env.PORT`.

5. **Get the public URL**:  
   **Settings** → **Networking** → **Generate Domain**.  
   You’ll get a URL like `https://your-app.up.railway.app`.  
   For WebSockets you need the **WebSocket URL**:
   - If the domain is `https://xxx.up.railway.app`, use **`wss://xxx.up.railway.app`** (same host, `wss://`).

6. **Copy the WebSocket URL** (e.g. `wss://your-app.up.railway.app`) for the frontend env in the next section.

---

## 2. Deploy frontend to Vercel

1. **Sign in**: [vercel.com](https://vercel.com) → Sign in with GitHub.

2. **Import project**: **Add New** → **Project** → Import the same GitHub repo.

3. **Root directory**: Leave as **`.`** (repo root).  
   **Framework Preset**: Vite.  
   **Build Command**: `npm run build`.  
   **Output Directory**: `dist`.

4. **Environment variable**: In **Environment Variables** add:
   - **Name**: `VITE_WS_URL`  
   - **Value**: your Railway WebSocket URL, e.g. `wss://your-app.up.railway.app`  
   - Apply to **Production** (and Preview if you want).

5. **Deploy**: Click **Deploy**.  
   After build, the app will be at `https://your-project.vercel.app`.

---

## 3. Check that WebSockets work

- Railway’s public URL supports both HTTP and WebSockets; the app uses `wss://` when `VITE_WS_URL` starts with `wss://`.
- Open the Vercel URL in two browser tabs; create/edit/delete a task in one tab and confirm it updates in the other. The “users online” count should reflect open tabs.

---

## Quick reference

| Where   | What to set |
|--------|-------------|
| Railway | Root Directory = `server`; generate a public domain; use that host with `wss://` as `VITE_WS_URL`. |
| Vercel  | Build = `npm run build`, Output = `dist`, Env = `VITE_WS_URL` = `wss://your-railway-domain`. |

If the frontend shows “Not connected”, double-check `VITE_WS_URL` (must be `wss://...` in production) and that the Railway service is running and has a generated domain.
