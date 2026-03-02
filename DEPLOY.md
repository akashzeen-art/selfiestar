# Deploy SelfiStar to Vercel

**GitHub:** https://github.com/akashzeen-art/selfiestar  
**Vercel dashboard:** https://vercel.com/akashzeen-1520s-projects  

**Note:** The `api` folder is **removed** on Vercel so the deploy finishes (no serverless function = no hang). You get **frontend only**. For login/challenges/selfies, re-enable the API (see `api-express/README.md`) or host the API on Railway/Render.

---

## 1. Create project and connect GitHub

1. Open **https://vercel.com/akashzeen-1520s-projects**
2. Click **Add New** → **Project**
3. Under **Import Git Repository**, find **akashzeen-art/selfiestar** (or paste `https://github.com/akashzeen-art/selfiestar`)
4. If you don’t see it, click **Adjust GitHub App Permissions** and allow Vercel access to the `akashzeen-art` org/repo
5. Click **Import** next to **akashzeen-art/selfiestar**

---

## 2. Configure project

- **Project Name:** e.g. `selfiestar` or `selfie-theglam`
- **Framework Preset:** Vite (auto-detected)
- **Root Directory:** `./`
- **Build Command / Output:** leave as-is (from `vercel.json`: `pnpm run build:client`, `dist/spa`)

---

## 3. Add environment variables

Add these for **Production** (and optionally Preview):

| Name | Value |
|------|--------|
| `NODE_ENV` | production |
| `PORT` | 8080 |
| `FRONTEND_URL` | https://selfie.theglam.world |
| `PING_MESSAGE` | ping |
| `MONGODB_URI` | (your MongoDB Atlas URI) |
| `JWT_SECRET` | (your secret) |
| `SIGNED_URL_SECRET` | (your secret) |
| `SELFIE_ENCRYPTION_KEY` | (your key) |
| `SELFIE_TOKEN_TTL_SEC` | 300 |
| `CORS_ORIGIN` | https://selfie.theglam.world |
| `CLOUDINARY_CLOUD_NAME` | (your value) |
| `CLOUDINARY_API_KEY` | (your value) |
| `CLOUDINARY_API_SECRET` | (your value) |

Copy from your local `.env` if needed.

---

## 4. Deploy

1. Click **Deploy**
2. Wait for the build to finish (a few minutes)
3. Your app will be live at `https://your-project-name.vercel.app`

---

## 5. Add custom domain (selfie.theglam.world)

1. In the project, go **Settings** → **Domains**
2. Click **Add**
3. Enter: **selfie.theglam.world**
4. Click **Add**
5. Vercel will show DNS instructions, e.g.:
   - **Type:** CNAME  
   - **Name:** selfie (or `selfie.theglam.world` depending on provider)  
   - **Value:** `cname.vercel-dns.com`
6. In your domain provider (where **theglam.world** is managed), add this CNAME record
7. Wait 5–10 minutes; Vercel will show **Valid** and issue SSL
8. Visit **https://selfie.theglam.world**

---

## Redeploy after code changes

- **Automatic:** Push to `main` on GitHub → Vercel deploys automatically (if the project is connected).
- **Manual:** Vercel dashboard → **Deployments** → **Redeploy** on the latest.
