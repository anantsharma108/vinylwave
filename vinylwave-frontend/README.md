# Vinylwave — front end for the Spotify-clone API

A standalone HTML/CSS/JS front end (no build step, no frameworks) styled around
a warm, analog "vinyl record" identity. It talks to your existing Express/Mongo
backend (the `auth` + `music` routes from the uploaded project).

## Files
- `index.html` — markup for the auth screen, app shell, and player
- `style.css` — the design system (colors, type, layout, the turntable animation)
- `app.js` — all app logic: auth, fetching tracks/albums, uploading, playback

## Running it
Just open `index.html` in a browser, or serve the folder with any static
server, e.g.:

```
npx serve .
```

## Connecting to your backend
The app calls your API using `fetch(..., { credentials: 'include' })` so the
`token` cookie your server sets on login/register is sent on every request.

On first load, click **Server connection** on the sign-in screen and enter
your backend's base URL (default assumed: `http://localhost:3000`). It's saved
in `localStorage` so you only set it once per browser.

### Backend checklist
Because the front end is served from a different origin than the API, your
Express server needs CORS enabled with credentials allowed, e.g.:

```js
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5000', // wherever you serve this front end from
  credentials: true,
}));
```

(The uploaded `app.js` didn't include CORS middleware — add it, or the browser
will block the requests.)

## What's implemented
- **Sign in / create account** — hits `/api/auth/login` and `/api/auth/register`,
  with a listener/artist role toggle on registration.
- **The Stack** — grid of all tracks from `GET /api/music`, click to play.
- **Albums** — grid from `GET /api/music/albums`; click into an album to see
  its tracklist via `GET /api/music/album/:id`.
- **Press a Record** (artists only) — upload a track (`POST /api/music/upload/music`,
  multipart file) and assemble an album from your uploaded tracks
  (`POST /api/music/upload/album`).
- **Player bar** — a spinning-vinyl + tonearm visual, play/pause, seek, and volume.

## Notes
- This is a pure front end — no data is stored here beyond your API base URL
  and the last logged-in user's display info, both in `localStorage`.
- `getMusics`/`getAlbums` in the current backend only return the first 5
  results (`.limit(5)`) — worth revisiting if you want pagination later.
