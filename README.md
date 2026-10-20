# Public Service Request System (Frontend)

The web interface for the Public Service Request System. Residents can sign in, submit a service request and check its status. Staff can review requests and update them.

Live site: https://gideon-sang.github.io/public-service-request-frontend/
Backend repo: https://github.com/Gideon-sang/public-service-request-backend

The API behind it runs on a free plan and sleeps when idle, so the first action after a quiet period can take up to a minute.

## Features

- Sign up and log in
- Submit a service request and track its status
- Admin view for reviewing and updating requests
- [Responsive layout that works on phones]

## Built with

Plain HTML, CSS and JavaScript, with no framework or build step. It is hosted on GitHub Pages.

## Files

```
index.html   Page structure
style.css    Styling
app.js       Application logic and API calls
config.js    Backend address
assets/      Images and static files
```

## Running it locally

1. Clone the repository.
2. In `config.js`, point the API address to `http://localhost:8080`.
3. Open `index.html` in a browser, or serve the folder with any static file server.

The backend must be running, and its `CORS_ORIGINS` setting must include the address you open the page from.

For the live version, `config.js` points to `https://public-service-request-backend.onrender.com`.

## Deployment

The site is published from the `main` branch through GitHub Pages (Settings, then Pages, then Deploy from a branch, root folder). Pushing to `main` updates the live site within a couple of minutes.
