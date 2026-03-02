# Express API for Vercel (currently disabled)

The `api` folder was **removed** so Vercel only builds the frontend (no serverless functions). Building any API handler was causing the deployment to hang after "vite build".

**To re-enable the API on Vercel:**
1. Create folder `api` and copy `api-express/[...all].ts` into it as `api/[...all].ts`.
2. In `vercel.json`, add: `{ "src": "/api/(.*)", "dest": "/api/$1" }` to the routes array (before the catch-all).
3. Push and deploy. If the build hangs again, host the API on Railway or Render and set the frontend API URL there.

**Local dev:** Uses Express from `server/`; no need for this folder.
