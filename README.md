# Expense Tracker

A small full-stack app: React frontend + FastAPI backend + SQLite, deployed on Render.

## Architecture

```
Browser (React) --HTTP/JSON--> FastAPI --SQL--> SQLite file
```

- `frontend/` — React app built with Vite. In development it runs on port 5173 and proxies `/api` calls to the backend.
- `backend/` — FastAPI app on port 8000. Defines the REST API and, in production, also serves the built frontend.
- `render.yaml` — tells Render how to build and start the app.

## Run locally (two terminals)

Terminal 1 — backend:
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Terminal 2 — frontend:
```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. API docs live at http://localhost:8000/docs.

## Deploy

Push to GitHub, then create a new Blueprint on https://render.com pointing at the repo. Render reads `render.yaml` and does the rest.

Note: the free tier has an ephemeral disk — the SQLite file resets on each deploy. Fine for learning; a real app would use a hosted database (e.g. Postgres).
