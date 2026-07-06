# How your expense tracker actually works

A second pass over everything we built, in three parts: the concepts, the journey, and the code.

---

## Part 1 — The building blocks

**Client and server.** Every web app is a conversation between two programs. The *client* is the program the user touches (your React app, running inside their browser). The *server* is a program running somewhere else that owns the data and the rules (your FastAPI app). They are deliberately kept apart: the client can be refreshed, closed, or duplicated across a million browsers — the server remains the single source of truth.

**HTTP.** The language of that conversation. Every exchange is a *request* (client asks) followed by a *response* (server answers). A request names a *method* — the verb — and a *path* — the noun. `GET /api/expenses` means "give me the expenses." `POST /api/expenses` means "create an expense." `DELETE /api/expenses/3` means "remove expense number 3." Responses carry a *status code*: 200 means OK, 201 created, 404 not found, 400 you sent something invalid, 500 the server crashed. You saw several of these today.

**JSON.** The format of what travels back and forth. Just structured text: `{"description": "Lunch", "amount": 12.5}`. Both JavaScript and Python read it natively, which is why it's the lingua franca between your React frontend and Python backend.

**API.** The full menu of requests a server accepts. Yours has four items: list expenses, create one, delete one, summarize. That contract is the *only* connection between frontend and backend — they share no code, only an agreement about URLs and JSON shapes. This is why teams can have separate frontend and backend developers who barely talk.

**Database.** Servers restart; memory is wiped. A database is where data survives. SQLite is the simplest kind — the whole database is one file (`expenses.db`). The server talks to it in SQL ("INSERT INTO expense..."), though our code generates that SQL for us via SQLModel.

**Deployment.** Your laptop can't serve the world — it sleeps, changes networks, sits behind a router. Deployment means running the same server program on a machine built for it: always on, publicly addressable. Render rents you such a machine and rebuilds your app on it every time you push code.

---

## Part 2 — The journey, replayed

Everything you did today, and what each step actually was:

**`py -m venv .venv`** created a *virtual environment* — a private copy of Python inside your project folder. Why: different projects need different library versions; installing everything globally causes collisions. The venv keeps this project's libraries in a sandbox.

**`pip install -r requirements.txt`** downloaded your backend's three dependencies (FastAPI, uvicorn, SQLModel) from PyPI, the public Python package registry, into that sandbox. `requirements.txt` is the shopping list, so any machine — yours, mine, Render's — can install identical ingredients.

**`uvicorn main:app --reload`** started the server. Uvicorn is the actual network program that listens on port 8000; FastAPI is the framework your code is written in; `main:app` means "the object named `app` inside `main.py`". `--reload` restarts it automatically when you edit code.

**`npm install`** did the same as pip but for JavaScript: read `package.json`, downloaded React and Vite into `node_modules/`.

**`npm run dev`** started Vite's development server on port 5173. It serves your React code to the browser and forwards any `/api/...` request to port 8000 (the proxy in `vite.config.js`) — that's how two separate programs appeared as one app.

**`git init`, `git add .`, `git commit`** created a version history for your code. A *commit* is a snapshot with a message. Git is a time machine and a collaboration tool; today you used it mainly as a shipping container.

**`git push`** uploaded that snapshot to GitHub — the off-site copy that Render is allowed to read.

**Render build** cloned your GitHub repo onto a fresh Linux machine and ran the build command: `npm run build` compiled your React code into plain, optimized files in `frontend/dist/`; `pip install` set up the backend. Then the start command launched uvicorn — which, seeing `dist/` exists, serves the frontend files itself. One server, whole app, public URL.

**The errors you hit were real lessons too.** "Python was not found" → programs must be on the PATH, the list of folders Windows searches for commands. "Running scripts is disabled" → PowerShell's execution policy, a security default. "Field requires type annotation" → a version conflict between your very new Python and an older library. Every developer hits all three constantly.

---

## Part 3 — Code tour

Nine files matter. Read them in this order, in VS Code, with this guide beside you.

### backend/models.py — what an expense IS
Defines the shape of your data once, as a Python class: a description (text), amount (number), category (text), date. SQLModel uses this single definition for two jobs: creating the database table, and validating incoming JSON. `ExpenseCreate` (no id) is what clients are allowed to send; `Expense` (with id) is what the database stores. The id is assigned by the database, never by the client — that's why they're separate classes.

### backend/database.py — where data LIVES
Three small pieces: the connection string (`sqlite:///expenses.db` — "SQLite, in this file"), an *engine* (the connection manager), and `get_session()`, which hands every incoming request its own short-lived database session. Sessions batch up changes and write them atomically on `commit()`.

### backend/main.py — what the server DOES
The heart of the backend. Each function decorated with `@app.get(...)`, `@app.post(...)`, `@app.delete(...)` is one item on the API menu — the decorator maps an HTTP method + path to a Python function. Look at `create_expense`: FastAPI automatically parses the JSON body, validates it against `ExpenseCreate` (rejecting bad dates with a 422 before your code even runs), your code checks the amount is positive, converts to a table row, saves, and returns it — which FastAPI turns back into JSON. The CORS middleware near the top is what permits the browser (port 5173) to call a different port (8000) during development. The last three lines serve the built React app in production.

### backend/requirements.txt — the backend's shopping list

### frontend/index.html — the page
Nearly empty: one `<div id="root">` and one script tag. React fills the div.

### frontend/src/main.jsx — the ignition
Finds that div and mounts the App component into it. That's all.

### frontend/src/App.jsx — the entire user interface
The file to study hardest. Three ideas:

*State* — `useState` creates variables that React watches. When `setExpenses(...)` is called, React re-renders the screen to match. You never manually update the page; you update state, React redraws.

*Effects* — `useEffect(..., [])` runs code once when the page loads. Ours calls `loadData()`, which `fetch`es the expense list and summary from the API.

*Handlers* — `handleSubmit` runs when the form is submitted: it POSTs the form data as JSON, checks the response, clears the form, reloads the data. `handleDelete` sends a DELETE and reloads. Notice the pattern in both: talk to the API, then refresh state from the API. The frontend never trusts its own memory of the data.

### frontend/vite.config.js — dev-time glue
The proxy: any request starting with `/api` gets forwarded to port 8000. Only used in development.

### render.yaml — the deployment recipe
Tells Render: this is a Python service, build it with these commands, start it with this command. Infrastructure as code — the deployment itself is versioned in git, so it's reproducible and reviewable like everything else.

---

## The one diagram to remember

```
you click "Add"
   │
   ▼
App.jsx  handleSubmit()          [frontend: React state + fetch]
   │  POST /api/expenses  {json}
   ▼
main.py  create_expense()        [backend: validate + business rules]
   │  INSERT INTO expense ...
   ▼
expenses.db                      [database: the permanent truth]
   │  new row, id=7
   ▼
response {json, id:7}  →  setExpenses(...)  →  screen updates
```

Every feature you ever add to any web app is a variation of this loop.
