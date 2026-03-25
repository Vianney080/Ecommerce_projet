# Deploiement Vercel + Render

## 1) Prerequis

- Un repo GitHub contenant `frontend` et `Backend`
- Un cluster MongoDB Atlas
- Secrets generes:
  - `MONGO_URI`
  - `JWT_SECRET`

## 2) Backend sur Render

1. Cree un `Web Service` Render depuis le repo.
2. Si Render demande une config manuelle:
   - Root Directory: `Backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Variables d'environnement:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `MONGO_URI=<votre_uri>`
   - `JWT_SECRET=<votre_secret>`
   - `FRONTEND_URL=<url_vercel>`
   - Optionnel: `CORS_ORIGINS=<url1,url2>`
4. Lance le deploy et copie l'URL Render.

## 3) Frontend sur Vercel

1. Importe le repo dans Vercel.
2. Configure:
   - Root Directory: `frontend`
   - Framework: Vite
3. Variables d'environnement:
   - `VITE_API_URL=https://<backend-render>/api`
4. Deploy.

## 4) Verification

- Ouvrir le frontend Vercel.
- Tester:
  - `/`
  - `/connexion`
  - `/catalogue`
  - `/admin/dashboard` (avec compte admin)
- Verifier l'API:
  - `https://<backend-render>/`

## 5) Fichiers deja prepares dans ce projet

- `frontend/vercel.json` (rewrite SPA)
- `frontend/.env.example`
- `Backend/.env.example`
- `Backend/.gitignore`
- `render.yaml`
