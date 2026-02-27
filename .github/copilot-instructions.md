# Copilot Instructions for triotag

Purpose: give AI coding agents the minimal, actionable knowledge to work productively in this repo.

**Architecture (big picture)**
- Backend: FastAPI app at [backend/server.py](backend/server.py) exposing an `/api` router. Uses async Motor client (MongoDB) and stores collections: `participants`, `teams`, `waves`, `settings`.
- Frontend: Create-React-App (CRACO) in `frontend/` — entry `frontend/src/App.js` uses `REACT_APP_BACKEND_URL` to form the API base.
- Data flow: CSV -> `participants` -> `teams` generated -> `waves` (3 teams per wave) -> `leaderboard` queries read `teams` + `settings` to compute ranks.

**Key files to inspect**
- [backend/server.py](backend/server.py) — main API surface, auth, DB schema and business logic (team generation, time parsing, leaderboard computation).
- [frontend/src/App.js](frontend/src/App.js) — how frontend constructs `API` and uses `trio_tag_token` in `localStorage`.
- [frontend/package.json](frontend/package.json) — run/build scripts use `craco`.
- [backend/requirements.txt](backend/requirements.txt) — Python deps and tooling (pytest, black, mypy, etc.).

**Run / dev workflows (explicit commands)**
- Backend (dev): install deps into a venv, ensure `backend/.env` has `MONGO_URL` and `DB_NAME`, then run:

  uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000

- Frontend (dev): from `frontend/` run:

  yarn install
  yarn start

  Set `REACT_APP_BACKEND_URL` in `frontend/.env` (e.g. `http://localhost:8000`). The frontend expects the backend base and appends `/api`.

- Tests: Python tests run with `pytest` (requirements include `pytest`). Frontend tests use `craco test` via `yarn test`.

**Project-specific conventions & gotchas**
- Auth: API uses `HTTPBearer` + JWT verification implemented in `backend/server.py`. Admin credentials and JWT secret are hardcoded constants in that file for dev (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`). Tests and local tooling may rely on these values.
- DB usage: code uses async Motor and stores plain JSON-like documents. Most responses omit Mongo `_id` (server queries reduce fields). Mutating endpoints often `delete_many` or `update_one` (e.g., upload clears participants/teams/waves/settings) — be cautious when running reset/upload flows.
- Time format: times are MM:SS strings; backend parses into `total_seconds`. Station list is a single `STATIONS` constant in `backend/server.py` — front/back should align to this.
- Team generation: default team size is 3; `2m1f` mode tries to build teams with two males + one female. Waves group 3 teams each.
- CSV participants: expected columns are `name,gender` with gender `M` or `F`. Header detection exists but malformed rows are skipped.
- Frontend token key: `trio_tag_token` in `localStorage` (set on login). API calls require `Authorization: Bearer <token>`.

**Integration points**
- Backend expects environment in `backend/.env` (loaded from `ROOT_DIR / '.env'` in server.py). Ensure `MONGO_URL` and `DB_NAME` are set for local runs.
- Frontend expects `REACT_APP_BACKEND_URL` (e.g. `http://localhost:8000`). See [frontend/src/App.js](frontend/src/App.js#L1-L40).

**Typical small tasks examples (explicit guidance)**
- Add a new API endpoint: modify `api_router` in [backend/server.py](backend/server.py); follow existing pattern (Pydantic request models, async Motor calls, HTTPException for errors).
- Fix leaderboard logic: update computation in `get_leaderboard()` in [backend/server.py](backend/server.py) and update any frontend usage of `leaderboard` fields.
- Change UI API base: update `REACT_APP_BACKEND_URL` in `frontend/.env` or pass `api` prop when rendering pages.

**What to avoid / pay attention to**
- Do not assume presence of production secrets; JWT secret and admin password are in code for dev. For production, replace with secure vault/ENV variables.
- Many endpoints clear collections (upload/generate/reset). Running them will mutate DB state — preserve test data as needed.

If anything above is unclear or you want me to expand a specific section (e.g., add example cURL requests for auth and CSV upload, or include common troubleshooting steps), tell me which area to expand.  

---
Please review and tell me any missing details or preferred wording to iterate.