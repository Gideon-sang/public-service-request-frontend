# Murang'a County - Public Service Request System (Frontend)

Plain HTML/CSS/JavaScript. Colours follow the county palette: green, gold, black and white.

## Run (VS Code)
1. Start the backend (http://localhost:8080) and MySQL.
2. Open this folder in VS Code, install the "Live Server" extension.
3. Right-click `index.html` > Open with Live Server (http://127.0.0.1:5500).

## Logo
Save the official logo as `assets/logo.png`. A neutral badge shows until you do.

## Configure
`config.js` > `API_BASE` is the backend address. Change it to the live backend URL when you deploy.

## Features
Citizen registration/login, submit request (category, location, description, optional photo),
My requests with a Pending > In Progress > Resolved tracker and history, admin dashboard
(update status + note, search, filters, open vs resolved analytics, requests by category, CSV export), dark mode.

## Deploy
Push this folder to a GitHub repo, Settings > Pages > Deploy from branch `main` / root.
Set the live backend URL in `config.js`, and add `https://YOUR-USERNAME.github.io` to the backend's CORS_ORIGINS.
