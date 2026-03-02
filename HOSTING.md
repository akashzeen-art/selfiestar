# How to host SelfiStar

Your project is **full-stack**: React frontend (`client/`) + Express API (`server/`). Pick one of the options below.

---

## Option A: Vercel (frontend) + Railway or Render (API)

**Use this if you already host the frontend on Vercel** and want login/challenges/selfies to work by hosting only the API elsewhere.

### Step 1: Deploy the API on Railway or Render

**Railway**

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → **akashzeen-art/selfiestar** (or selfiestarmain).
2. **Settings** → **Build**: Build Command = `pnpm install && pnpm build`, Start Command = `pnpm start`.
3. **Variables**: Add all from your `.env`, and set:
   - `FRONTEND_URL` = your Vercel site URL (e.g. `https://selfiestarmain.vercel.app` or `https://selfie.theglam.world`)
   - `CORS_ORIGIN` = same as `FRONTEND_URL` (so the browser can call the API from your Vercel site)
4. Deploy. Copy the public URL (e.g. `https://your-app.railway.app`).

**Render**

1. [render.com](https://render.com) → **New** → **Web Service** → connect repo **akashzeen-art/selfiestar**.
2. Build Command: `pnpm install && pnpm build` | Start Command: `pnpm start`.
3. **Environment**: Same as above — add `.env` vars, `FRONTEND_URL` and `CORS_ORIGIN` = your Vercel URL.
4. Deploy. Copy the service URL (e.g. `https://your-app.onrender.com`).

### Step 2: Point Vercel frontend to the API

1. **Vercel** → your project → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** your API base **including** `/api`, e.g. `https://your-app.railway.app/api` or `https://your-app.onrender.com/api`
   - **Environment:** Production (and Preview if you want).
3. **Redeploy** the Vercel project (Deployments → ⋯ → Redeploy) so the new env is applied.

After redeploy, the Vercel site will call your Railway/Render API for auth, challenges, and selfies.

---

## Option 1: Full stack on Railway or Render (recommended)

**One place for frontend + API** (login, challenges, selfies all work).

### Railway

1. Go to [railway.app](https://railway.app) → **Start a New Project** → **Deploy from GitHub**.
2. Select **akashzeen-art/selfiestar** (or selfiestarmain).
3. **Settings** → **Build**:
   - **Build Command:** `pnpm install && pnpm build`
   - **Output Directory:** leave empty (not used for Node).
4. **Settings** → **Deploy**:
   - **Start Command:** `pnpm start`
   - **Root Directory:** leave empty.
5. **Variables:** Add all keys from your `.env` (e.g. `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `FRONTEND_URL` = your Railway URL).
6. Deploy. Railway will build client + server and run `node dist/server/node-build.mjs`, serving the SPA and `/api` from one app.

### Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**.
2. Connect **GitHub** → **akashzeen-art/selfiestar** (or selfiestarmain).
3. **Build Command:** `pnpm install && pnpm build`
4. **Start Command:** `pnpm start`
5. **Environment:** Add all variables from your `.env`.
6. **Create Web Service**. Render builds and runs the same Node server (SPA + API).

---

## Option 2: Frontend only on Vercel

**Only the React app** is deployed; `/api` does not run (login/challenges/selfies will not work unless you host the API elsewhere).

- Repo is already set up: no `api/` folder, `vercel.json` builds only the client.
- **Vercel** → Import **akashzeen-art/selfiestar** → add env vars (for when you add an API later) → Deploy.
- Build: `pnpm run build:client` → output: `dist/spa`.

To have the app work end-to-end, run the API on **Railway** or **Render** (only the `server/` part), then in your frontend set the API base URL to that backend (e.g. via env).

---

## Option 3: Frontend only on Netlify

Same as Option 2: **only the SPA**; no backend on Netlify.

- **Netlify** → **Add site** → **Import from Git** → **akashzeen-art/selfiestar**.
- **Build command:** `pnpm run build:client`
- **Publish directory:** `dist/spa`
- **Environment variables:** optional (needed only if you later point the app to an external API).

`netlify.toml` is already set for this.

---

## Project structure (reference)

| Path           | Role |
|----------------|------|
| `client/`      | React (Vite) frontend → build output `dist/spa` |
| `server/`      | Express API + serves `dist/spa` in production |
| `shared/`      | Types used by client and server |
| `public/`      | Static assets (videos, etc.) copied into `dist/spa` |
| `api-express/` | Backup of Express API for Vercel serverless (not used if you host on Railway/Render) |

**Build:** `pnpm build` → builds client + server.  
**Run (production):** `pnpm start` → `node dist/server/node-build.mjs` (serves SPA + `/api`).

---

## Summary

- **Full app (frontend + API) in one place:** use **Railway** or **Render** (Option 1).
- **Only frontend (no API):** use **Vercel** or **Netlify** (Options 2 or 3); add env vars and API URL later if you host the API elsewhere.
