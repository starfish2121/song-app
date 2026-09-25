const https = require('https');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:4000/api/auth/spotify/callback';

function getSpotifyAuthUrl(userId) {
  if (!SPOTIFY_CLIENT_ID) {
    return null;
  }

  const scopes = [
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-modify-playback-state'
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: userId || 'guest'
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function exchangeSpotifyCode(code) {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify credentials not configured on server');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI
  });

  const basicAuth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    },
    body: body.toString()
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || 'Failed to exchange Spotify code');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

async function fetchSpotifyCurrentlyPlaying(accessToken) {
  if (!accessToken) return null;

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (res.status === 204 || res.status > 400) {
      return null;
    }

    const data = await res.json();
    if (!data || !data.item) return null;

    const item = data.item;
    return {
      title: item.name,
      artist: item.artists.map(a => a.name).join(', '),
      album: item.album.name,
      albumArt: item.album.images[0]?.url || '',
      durationMs: item.duration_ms,
      positionMs: data.progress_ms || 0,
      isPlaying: data.is_playing,
      spotifyUrl: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
      previewUrl: item.preview_url || ''
    };
  } catch (err) {
    console.warn('Spotify currently-playing fetch error:', err.message);
    return null;
  }
}

module.exports = {
  getSpotifyAuthUrl,
  exchangeSpotifyCode,
  fetchSpotifyCurrentlyPlaying,
  isSpotifyConfigured: () => Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET)
};
