# GlobalTradeX — frontend

Next.js 14 (App Router), Tailwind CSS, Axios + cookies pour le JWT.

## Démarrage

1. Copier `.env.local.example` vers `.env.local` et définir `NEXT_PUBLIC_API_URL` (ex. `http://127.0.0.1:8000`).
2. `npm install`
3. `npm run dev`

Connexion : le backend doit exposer les routes sous `/api` (voir dossier `backend/`).

## Structure

- `app/` — pages App Router (`login`, `register`, `dashboard`, expéditions, produits, documents, calculateur).
- `components/` — `layout/` (Sidebar, Header), `ui/`, `Chatbot`, `AvatarModal`.
- `context/AuthContext.jsx` — état auth (utilisateur, login, logout).
- `lib/api.js` — instance Axios + helpers API.
- `middleware.js` — protection des routes `/dashboard/*`.
