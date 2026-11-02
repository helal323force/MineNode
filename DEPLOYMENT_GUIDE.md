# MineNode Deployment Guide

MineNode is designed to be "one-click" deployable on Render and Railway. Follow these instructions to set up your Minecraft Bot Hosting instance.

## 1. Firebase Setup (Required)
To persist bot profiles and features across server restarts, you MUST have a Firebase project.
1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** in native mode.
3. Enable **Firebase Storage**.
4. Enable **Google Authentication** in the Auth section.
5. **Authorize your domain** (CRITICAL):
   - Go to Authentication -> Settings -> Authorized Domains.
   - Click "Add Domain".
   - Add your Render URL: `minenode.onrender.com`.
   - Add your Railway URL if applicable.
6. (Optional but Recommended) Generate a **Service Account Key**:
   - Go to Project Settings -> Service Accounts.
   - Click "Generate new private key".
   - Convert the JSON to a single-line string for use in environment variables.

---

## 2. Render Deployment
Render is excellent for "Web Services". Note that on the free tier, the service will sleep after 15 minutes of inactivity. Bots will only stay online while the server is awake.

### Steps:
1. **New Web Service**: Connect your GitHub repository.
2. **Runtime**: `Node`.
3. **Build Command**: `npm install && npm run build` (The app can auto-build, but this is faster).
4. **Start Command**: `npm start`.
5. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `FIREBASE_SERVICE_ACCOUNT_KEY`: (Optional) The JSON key as a string.
   - `DEFAULT_BOT_LIMIT`: (Optional) e.g., `3`
   - `DEFAULT_FEATURE_LIMIT`: (Optional) e.g., `5`

---

## 3. Railway Deployment
Railway is ideal for persistent workers and doesn't sleep on paid plans.

### Steps:
1. **New Project**: Deploy from GitHub repo.
2. **Variables**: Add the same variables as Render.
3. **Port**: Railway automatically detects the `PORT` variable.
4. **Health Check**: Set to `/health`.

---

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port the server listens on | `3000` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Full JSON service account key for Admin SDK | *None* |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase Project ID | *From config* |
| `DEFAULT_BOT_LIMIT` | Max bots per user | `3` |
| `DEFAULT_FEATURE_LIMIT` | Max features per user | `5` |

---

## "One-Click" Note
The application includes a `bootstrap` logic that auto-seeds default features and auto-recovers any bots that were online before a server restart. If you don't provide a Service Account key, the server will attempt to use default credentials or run in a limited mode.
