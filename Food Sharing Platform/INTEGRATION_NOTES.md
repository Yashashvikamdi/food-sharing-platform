# Food Sharing Platform — integration and setup

## Stack
HTML/CSS/vanilla JavaScript, FastAPI, SQLAlchemy, MySQL. Existing database records are preserved; startup only adds missing `ngos.is_verified` and food-safety metadata columns if needed. Existing rows are retained; existing donations receive `food_safety_confirmed = false` until reviewed.

## Before running
1. Back up the project folder and MySQL database.
2. Extract this ZIP to a new folder. Copy your existing `backend/.env` into the new project's `backend/` folder; do not upload or commit it.
3. Open PowerShell in the extracted `Food Sharing Platform` project root and create a fresh virtual environment: `py -m venv backend\.venv`.
4. Install dependencies: ` .\backend\.venv\Scripts\python.exe -m pip install --upgrade pip` and then ` .\backend\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt`.
5. Add `APP_SECRET_KEY=<long-random-secret>` to the copied `backend/.env`. Generate a value locally with `py -c "import secrets; print(secrets.token_urlsafe(48))"`; do not share it in chat or commit it.
6. Start backend: ` .\backend\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --reload --reload-dir backend`.
7. Serve `frontend/` with VS Code Live Server at `http://127.0.0.1:5500`. Open `http://127.0.0.1:8000/docs` for the API.

## Administrator
Start the backend once first so its additive schema migration runs. Then open a second PowerShell in the project root and run ` .\backend\.venv\Scripts\python.exe .\backend\create_admin.py`. Enter a unique email and private password when prompted. Public registration does not allow the admin role.

## API integration
- `POST /auth/register`, `POST /auth/login`: password-hashed account creation and signed bearer token login.
- `POST /donations`: requires a donor bearer token and only permits creating donations for that donor; includes description, source, preparation time, storage notes, and explicit food-safety confirmation.
- `GET /donors/{id}/donations`: donor can view own history; admin can view other history.
- `GET /donations/{id}/matches`: rule-based distance/category/capacity/availability matching; only verified NGOs are returned.
- `POST /donations/{id}/accept`: authenticated NGO can accept only as its own NGO; donation acceptance is unique per donation.
- `PATCH /donations/{id}/status`: donor may cancel own available donation; accepting NGO progresses accepted → picked_up → completed.
- `GET /ngos/{id}/donations`: only the relevant NGO or admin.
- `/admin/overview`, `/admin/ngos/{id}/verification`, `/admin/donations/{id}/moderation`: admin-only.
- `/stats`: statistics computed from database rows. Only completed donations contribute to redistributed kilograms.

## Important limitations
- The matching logic is rule-based, not machine learning.
- This is a local prototype; do a security review before public deployment. Set `APP_SECRET_KEY`, use HTTPS, add rate limiting, consider refresh/revocation and audit logging, and review exact pickup-address visibility.
- Legacy `/donors` and `/ngos` creation routes remain for compatibility with prior API tests; use `/auth/register` for accounts that need passwords and login.
- No database reset/drop operation is performed. The schema migration is additive and keeps existing rows.

## Test checklist
1. `/health` and `/db-health` respond successfully.
2. Register a new donor, then log in; a bearer token should be returned.
3. Create a donation from the website with a future deadline; verify it appears in `/donations` and donor dashboard.
4. Register an NGO and create an admin using the utility; approve the NGO from admin dashboard.
5. NGO logs in, accepts an eligible donation, and advances it through picked_up → completed.
6. Confirm `/stats` changes only after database state changes.
7. Test unauthenticated requests and cross-account access return 401/403.
