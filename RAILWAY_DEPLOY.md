# Deploy SelfiStar API on Railway

Use this when your **frontend is on Vercel** and you want the **API on Railway** (Option A).

**Project already created:** **selfiestar-api** on **akashzeen-art's Projects**. Use the steps below to connect GitHub and deploy (CLI upload times out due to repo size).

---

## 1. Connect GitHub to your existing project (or create new)

1. Go to **[railway.app](https://railway.app)** and sign in.
2. Open project **selfiestar-api** (or click **New Project** → **Deploy from GitHub repo**).
3. If the project is empty: **Add Service** → **GitHub Repo** → select **akashzeen-art/selfiestar** (or **selfiestarmain**). Authorize Railway if asked.
4. If you already have a service: open it → **Settings** → **Source** → **Connect Repo** → choose the repo.
5. Leave **Root Directory** empty (use repo root). Railway will clone the repo on their servers and build (no upload from your machine).

---

## 2. Set build and start commands

In the new service:

1. Open the service → **Settings** (or **Variables** tab).
2. Under **Build**:
   - **Build Command:** `pnpm install && pnpm build`
   - (Or leave empty; `railway.json` in the repo already sets this.)
3. Under **Deploy**:
   - **Start Command:** `pnpm start`
   - (Or leave empty; `railway.json` sets this.)

If **railway.json** is in the repo, Railway uses it automatically.

---

## 3. Add environment variables

In the same service: **Variables** → **Add variables** (or **Raw Editor** and paste).

Add everything from your `.env`, in particular:

| Variable | Example / note |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `PORT` | Railway sets this automatically; you can leave it unset. |
| `FRONTEND_URL` | Your **Vercel** site URL, e.g. `https://selfiestarmain.vercel.app` or `https://selfie.theglam.world` |
| `CORS_ORIGIN` | **Same** as `FRONTEND_URL` (so the browser can call the API from Vercel) |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Your secret (e.g. from .env) |
| `SIGNED_URL_SECRET` | Your secret |
| `SELFIE_ENCRYPTION_KEY` | Your key (hex) |
| `CLOUDINARY_CLOUD_NAME` | Your value |
| `CLOUDINARY_API_KEY` | Your value |
| `CLOUDINARY_API_SECRET` | Your value |

Optional: `PING_MESSAGE`, `SELFIE_TOKEN_TTL_SEC` (default 300).

---

## 4. Deploy and get the API URL

1. Trigger a **Deploy** (or wait for the first one to finish).
2. Open **Settings** → **Networking** → **Generate Domain** (or use the default one).
3. Copy the public URL, e.g. `https://selfistar-production-xxxx.up.railway.app`.

Your API base for the frontend is that URL **plus** `/api`, e.g.  
`https://selfistar-production-xxxx.up.railway.app/api`

---

## 5. Point Vercel to this API

1. **Vercel** → your frontend project → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-railway-url.up.railway.app/api` (the URL from step 4 + `/api`)
   - **Environment:** Production (and Preview if you want).
3. **Redeploy** the Vercel project so the new variable is applied.

After that, the Vercel site will use your Railway API for login, challenges, and selfies.
