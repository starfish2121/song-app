# 🎧 SongSync — Production Music Connection Platform

> **Hear Together. Connect in Real Time.**  
> A production-ready cross-platform application (iOS, Android & Web) connecting listeners across **Spotify** and **YouTube Music** when they are listening to the same song at the same time.

---

## 🚀 Public Launch & Quick Start

### 1. Instant Run (Local / Server)

```bash
# Start backend server & SQLite database
cd server
npm install
npm start
```
- **Web App & REST/WebSocket API**: [http://localhost:4000](http://localhost:4000)
- **Database**: SQLite WAL database stored at `server/data/songsync.db`

### 2. Mobile App (Expo Go / Simulator)

```bash
cd client
npm install
npx expo start
```
Scan the terminal QR code with **Expo Go** on your phone (iOS / Android) to test natively.

---

## 🌐 Deploy to the Cloud (For General Public)

### Option A: 1-Command Docker Deployment (Railway, Render, Fly.io, VPS)

SongSync includes a multi-stage production `Dockerfile` that packages both the web frontend and backend server into a single high-performance container:

```bash
# Build and run with Docker Compose
docker-compose up --build -d
```
Your app will be live on port `4000` with persistent SQLite volume storage at `/app/server/data`.

### Option B: Deploy to Railway / Render
1. Push this repository to GitHub.
2. Link your repository in [Railway.app](https://railway.app) or [Render.com](https://render.com).
3. Set environment variable `PORT=4000`.
4. Add a persistent disk mounted to `/app/server/data` to preserve your SQLite database across deploys!

---

## 📱 Publishing to App Store & Google Play

SongSync is pre-configured with Expo EAS (Expo Application Services) for automated mobile app store builds:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Build for Android (`.apk` or `.aab` for Google Play):
   ```bash
   cd client
   eas build -p android --profile production
   ```
3. Build for iOS (`.ipa` for Apple App Store / TestFlight):
   ```bash
   cd client
   eas build -p ios --profile production
   ```

---

## 🏛️ Production System Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                     SongSync Clients                        │
 │   • iOS Native App (Expo / React Native)                    │
 │   • Android Native App (Expo / React Native)                │
 │   • Web Desktop & Mobile Web (HTML5 Audio + React Native Web│
 └──────────────────────────────┬──────────────────────────────┘
                                │
                 HTTPS REST & WSS (Socket.io)
                                │
 ┌──────────────────────────────▼──────────────────────────────┐
 │              Node.js + Express API Cluster                  │
 │   • Auth Engine (JWT + bcrypt + Guest Instant-Access)       │
 │   • Spotify Web API OAuth 2.0 & YouTube Music Link Normalizer│
 │   • Real-Time Audio Synchronizer & Drift Engine             │
 │   • Dynamic Music Catalog & iTunes Real Preview Engine      │
 └──────────────────────────────┬──────────────────────────────┘
                                │
 ┌──────────────────────────────▼──────────────────────────────┐
 │            Persistent SQLite Database (WAL Mode)            │
 │   • users, room_messages, matches, direct_messages          │
 └─────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Production Features

1. **Authentication & Instant Onboarding**:
   - **1-Tap Guest Access**: Public visitors can enter immediately in 0.5s without filling forms.
   - **Registered Accounts**: Email & password authentication with secure bcrypt password hashing and 30-day JWT sessions.
   - **AsyncStorage Persistence**: User sessions and login states persist automatically across reloads and app restarts.

2. **Spotify & YouTube Music Unified Bridge**:
   - **Metadata Normalization**: Songs are normalized (`artist:::title`) so Spotify and YouTube Music listeners join the exact same live room.
   - **Spotify OAuth 2.0**: Official Spotify OAuth authorization endpoint with `/me/player/currently-playing` support.
   - **Native Deep Links**: Direct buttons to open tracks natively in the Spotify app or YouTube Music app.

3. **Persistent Chat & Vibe Matching**:
   - **Permanent Room Discussions**: Lounge chat messages are saved to SQLite and automatically loaded when entering any song lounge.
   - **1-on-1 Vibe Matches**: Persistent match conversations and direct messaging history between mutual listeners.
   - **In-App Toast Notifications**: Real-time popups when listeners join your room, send reactions, or request a match.

4. **Live Audio Engine & Queue Auto-Play**:
   - Plays real audio previews via HTML5 Audio on Web and `expo-av` on iOS/Android.
   - **Continuous Flow**: Auto-advances to the next song in the queue when a track ends so the music never stops.
   - **Spacebar Shortcut**: Play/pause instantly with the Space key on desktop browsers.

---

## 🔑 Environment Variables (`server/.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP & WebSocket server port | `4000` |
| `NODE_ENV` | Environment (`development` or `production`) | `production` |
| `JWT_SECRET` | Secret key for signing user auth tokens | *configured in .env* |
| `SPOTIFY_CLIENT_ID` | Optional Spotify Developer Client ID | *optional* |
| `SPOTIFY_CLIENT_SECRET` | Optional Spotify Developer Client Secret | *optional* |
| `SPOTIFY_REDIRECT_URI` | Spotify OAuth Callback URI | `http://localhost:4000/api/auth/spotify/callback` |
