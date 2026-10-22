# Food Sharing Platform — Integration Progress

## Implemented in this patch
- FastAPI-backed registration/login with hashed passwords and signed bearer tokens.
- Donor-only donation creation and own-history access.
- Food metadata, future deadline validation, coordinate validation, and explicit food-safety confirmation.
- Public available-donation listing with approximate pickup location and rounded map coordinates.
- NGO profile registration with capacity, supported categories, city and optional coordinates; new NGOs require admin verification.
- Rule-based matching using availability, category, capacity, deadline and distance.
- NGO acceptance restricted to the logged-in NGO; unique acceptance constraint and row locking help prevent duplicate acceptance.
- Pickup status progression: accepted → picked_up → completed; donors can cancel their own available listings.
- Admin-only NGO verification and donation moderation endpoints.
- Database-derived impact metrics; only completed donation kilograms count as redistributed.
- Frontend API integration for registration, login, donation submission, donor history, NGO listings/acceptance/statuses, map/matching, admin moderation, and impact.
- Additive startup schema migration for NGO verification and donation safety/detail columns. Existing rows are preserved; old donation rows are not automatically marked safety-confirmed.

## Automated checks performed in the development environment
- Python syntax compilation passed for `main.py`, `models.py`, and `create_admin.py`.
- JavaScript syntax check passed for `script.js`.
- HTML parser check passed for all frontend HTML files.
- API flow smoke test against temporary SQLite test database passed for health checks, registration, authenticated donation creation, approximate public location, donor ownership protection, NGO verification, matching, acceptance, status progression and impact totals.
- The current environment did not have the `bcrypt` package installed and could not download it; the smoke test injected a test-only bcrypt-compatible shim. Run the actual bcrypt flow in the project's Windows virtual environment after installing `requirements.txt`.
- Live MySQL, actual browser rendering and real Windows CORS tests remain to be performed on the user's machine.

## Known remaining limitations before deployment
- No password reset, refresh-token/revocation, rate limiting, email verification, or audit log.
- Token signing falls back to a key derived from local DB configuration if `APP_SECRET_KEY` is not set; configure a strong random `APP_SECRET_KEY` before use.
- Legacy `/donors` and `/ngos` create routes return HTTP 410 and direct callers to `/auth/register`.
- Historical donations are migrated with food-safety confirmation false and are hidden from public listings/matching until safely recreated or explicitly reviewed by a future controlled workflow.
- Exact household-address access, map privacy, food-safety rules and legal requirements should be reviewed before production deployment.
- Notifications, rewards, volunteer logistics and AI/ML matching are not implemented.
