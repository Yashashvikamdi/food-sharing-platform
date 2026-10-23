Food Sharing Platform
About the Project
Food Sharing Platform is a web application that helps connect people and
organizations with extra food to NGOs that can collect and distribute it
to people who need it. The goal is to make food donation easier to
manage, improve coordination between donors and NGOs, and reduce
avoidable food waste.

The platform has separate access for donors, NGOs, and administrators.
Each user type has different responsibilities, so donations can be
managed in an organized way.
Features
Donors
- Create an account and sign in.
- Add food donations with details such as description, food source,
  preparation time, storage notes, and pickup information.
- Confirm food-safety information before publishing a donation.
- View their own donations and cancel a donation while it is still
  available.
NGOs
- Register an organization and provide relevant details, including
  food categories and capacity.
- View eligible available donations and matching information.
- Accept suitable donations after an administrator verifies the
  organization.
- Update pickup progress and donation status.
Administrators
- Sign in through a separate administrator account.
- Review and verify NGO registrations.
- Review platform activity and donation information.
- Manage donation moderation where required.
How It Works
1. A donor registers and adds a food donation.
2. The platform stores the donation details and checks the required
   safety confirmation.
3. Eligible donations can be shown to NGOs according to matching rules,
   including food category, deadline, location, NGO verification, and
   capacity.
4. An administrator verifies a newly registered NGO.
5. A verified NGO can accept a suitable donation.
6. The NGO updates the donation status during pickup and completion.
The donations shown to an NGO depend on the saved donation details and
the matching rules implemented in the backend.
Technology Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Python, FastAPI
- Database: MySQL
- API documentation: FastAPI Swagger UI
- Local development: Python virtual environment, Uvicorn, VS Code
  Live Server
Project Structure
Food Sharing Platform/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   ├── requirements.txt
│   ├── create_admin.py
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── donor-dashboard.html
│   ├── ngo-dashboard.html
│   ├── admin-dashboard.html
│   └── script.js
├── docs/
└── README.md
Some filenames may differ between project versions.
Requirements
Before running the project, install or prepare:
- Python
- MySQL, running locally or on a reachable server
- Visual Studio Code
- Git Bash or another terminal
- The Live Server extension in VS Code
Setup and Installation
1. Open the project
Extract the project ZIP and open the main Food Sharing Platform folder
in VS Code. Use the folder that contains both backend and frontend.
2. Configure environment variables
Inside backend, create a .env file from .env.example, or copy your
existing working .env file from the original project.

Enter your actual MySQL connection details and a strong, private
APP_SECRET_KEY. Use the variable names expected by the project's
configuration. Do not commit .env or share database passwords and
secret keys.

Make sure the configured database exists and the database user has
permission to access it.
3. Create a Python virtual environment
Run these commands from the main project folder in Git Bash:
python -m venv backend/.venv
Install the dependencies:
./backend/.venv/Scripts/python.exe -m pip install --upgrade pip
./backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
These commands are written for Windows using Git Bash.
4. Start the backend
Run this command from the main project folder:
./backend/.venv/Scripts/python.exe -m uvicorn main:app --app-dir backend --reload --reload-dir backend
Keep this terminal open while using the application.
- API documentation: http://127.0.0.1:8000/docs
- Database health endpoint: http://127.0.0.1:8000/db-health
If the server cannot connect to MySQL, check that MySQL is running and
that the .env settings are correct.
5. Create an administrator account
Open a second Git Bash terminal in the main project folder and run:
./backend/.venv/Scripts/python.exe backend/create_admin.py
Follow the prompts. Password input may be hidden while you type.

If the script says the email already exists, do not delete the account
or database. Use the existing account if you know its credentials, or
review the account setup before making changes.
6. Start the frontend
In VS Code, open the frontend folder, right-click index.html, and
choose Open with Live Server.

The frontend usually opens at an address such as:
http://127.0.0.1:5500
Keep both the backend and frontend running in their respective
terminals.
API and Access Notes
- Public registration is intended for donors and NGOs.
- Administrator accounts are created separately using the backend
  admin script.
- Newly registered NGOs may need administrator verification before
  accepting donations.
- Protected API endpoints require authentication and the appropriate
  user role.
- Public donation listings are designed to avoid exposing the exact
  pickup address.
- Donation acceptance and status changes are restricted according to
  the user's role and the donation lifecycle.
Troubleshooting
No module named uvicorn
Install the backend requirements using the commands in the setup
section.
requirements.txt cannot be found
Make sure the terminal is in the inner project folder that contains
backend and frontend. Confirm that backend/requirements.txt
exists.
MySQL connection or authentication error
Check that MySQL is running, the database exists, and .env contains
the correct host, port, database name, username, and password.
Admin dashboard says login is required
Sign in with the administrator account and then reopen the admin
dashboard. Opening the dashboard page alone does not authenticate the
user.
NGO cannot accept a donation
Check whether the NGO has been verified, whether the donation is still
available, and whether it meets the matching requirements.
A donation or map marker does not appear
Check the donation's saved status and location data, the API response in
/docs, and the browser console. A donation may be filtered out if it
does not meet the platform's visibility or matching rules.
Security and Data Notes
- Keep .env private and never commit it to a public repository.
- Use a strong, unique administrator password.
- Do not share access tokens, database credentials, or secret keys.
- Test with sample data before using real donor or recipient
  information.
- Test the project in the intended environment before deployment.
Current Scope
This project provides a foundation for coordinating food donations
between donors, NGOs, and administrators. Location-based matching and
map display depend on valid location data and the current
frontend/backend configuration. Before deploying publicly, review
configuration, security, database backups, and end-to-end behavior.
Author
Add your name and contact details here if you want to publish the
project in a portfolio or GitHub repository.
