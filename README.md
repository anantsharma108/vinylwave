# VinylWave 🎵

A Spotify-style music streaming app — Express/MongoDB backend + a vanilla HTML/CSS/JS frontend, styled around a warm "vinyl record" identity.

## Structure

```
vinylwave/
├── vinylwave-backend/    # Express API (auth, music, albums, uploads)
└── vinylwave-frontend/   # Static HTML/CSS/JS client
```

## Features

- Email/password auth with JWT stored in an httpOnly cookie
- Listener / artist roles
- Browse tracks and albums
- Artists can upload tracks and assemble albums (audio files stored via ImageKit)
- Custom audio player UI (spinning vinyl, seek, volume)

## Tech stack

**Backend:** Node.js, Express 5, MongoDB (Mongoose), JWT auth, bcrypt, Multer, ImageKit (file storage)
**Frontend:** HTML, CSS, vanilla JavaScript (no build step, no framework)

## Getting started

### 1. Backend

```bash
cd vinylwave-backend
npm install
```

Create a `.env` file in `vinylwave-backend/` (see `.env.example`):

```
MONGOOSE_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
```

Then run:

```bash
node server.js
```

The API runs on `http://localhost:3000`.

### 2. Frontend

```bash
cd vinylwave-frontend
npx serve .
```

Open the served URL in your browser. On first load, click **Server connection** on the sign-in screen and set your backend's base URL (defaults to `http://localhost:3000`).

> The frontend and backend run on different origins/ports, so the backend must have CORS enabled with `credentials: true` and `origin` set to whatever URL you serve the frontend from. This is already configured in `src/app.js` — just make sure the `origin` value matches your actual frontend URL.

## API overview

| Route | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Create an account (listener or artist) |
| `/api/auth/login` | POST | Log in, sets auth cookie |
| `/api/music` | GET | List tracks |
| `/api/music/albums` | GET | List albums |
| `/api/music/album/:id` | GET | Get a single album's tracklist |
| `/api/music/upload/music` | POST | Upload a track (artist only) |
| `/api/music/upload/album` | POST | Create an album from uploaded tracks (artist only) |

## License

MIT — see [LICENSE](LICENSE).
