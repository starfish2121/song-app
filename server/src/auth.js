const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'songsync-super-secret-jwt-key-production-2026';

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80'
];

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      is_guest: user.is_guest
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Register user
function registerUser({ email, password, name, username, streaming_platform, avatar, bio }) {
  if (!name || !username) {
    throw new Error('Name and username are required');
  }

  // Check unique username
  const existingUsername = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
  if (existingUsername) {
    throw new Error('Username is already taken');
  }

  // Check unique email if provided
  if (email) {
    const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (existingEmail) {
      throw new Error('An account with this email already exists');
    }
  }

  const userId = `usr-${uuidv4()}`;
  const passwordHash = password ? bcrypt.hashSync(password, 10) : null;
  const chosenAvatar = avatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO users (
      id, email, password_hash, name, username, avatar, bio, streaming_platform, is_guest, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);

  stmt.run(
    userId,
    email ? email.toLowerCase() : null,
    passwordHash,
    name.trim(),
    username.trim(),
    chosenAvatar,
    bio ? bio.trim() : 'Listening in real-time 🎧',
    streaming_platform || 'spotify',
    now
  );

  const user = db.prepare('SELECT id, email, name, username, avatar, bio, streaming_platform, is_guest, created_at FROM users WHERE id = ?').get(userId);
  const token = generateToken(user);

  return { user, token };
}

// Login user
function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!user || !user.password_hash) {
    throw new Error('Invalid email or password');
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    streaming_platform: user.streaming_platform,
    is_guest: user.is_guest,
    created_at: user.created_at
  };

  const token = generateToken(safeUser);
  return { user: safeUser, token };
}

// Instant guest login
function createGuestUser() {
  const userId = `guest-${uuidv4()}`;
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const username = `@listener_${randNum}`;
  const name = `Music Listener #${randNum}`;
  const avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO users (
      id, email, password_hash, name, username, avatar, bio, streaming_platform, is_guest, created_at
    ) VALUES (?, NULL, NULL, ?, ?, ?, 'Cruising through tracks in real-time ✨', 'spotify', 1, ?)
  `);

  stmt.run(userId, name, username, avatar, now);

  const user = db.prepare('SELECT id, email, name, username, avatar, bio, streaming_platform, is_guest, created_at FROM users WHERE id = ?').get(userId);
  const token = generateToken(user);

  return { user, token };
}

// Get user profile
function getUserById(id) {
  return db.prepare('SELECT id, email, name, username, avatar, bio, streaming_platform, is_guest, created_at FROM users WHERE id = ?').get(id);
}

// Update user profile
function updateUserProfile(id, { name, username, bio, streaming_platform, avatar }) {
  const user = getUserById(id);
  if (!user) throw new Error('User not found');

  // If changing username, check availability
  if (username && username.toLowerCase() !== user.username.toLowerCase()) {
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?').get(username, id);
    if (existing) throw new Error('Username already taken');
  }

  const updatedName = name !== undefined ? name.trim() : user.name;
  const updatedUsername = username !== undefined ? username.trim() : user.username;
  const updatedBio = bio !== undefined ? bio.trim() : user.bio;
  const updatedPlatform = streaming_platform || user.streaming_platform;
  const updatedAvatar = avatar || user.avatar;

  db.prepare(`
    UPDATE users SET
      name = ?,
      username = ?,
      bio = ?,
      streaming_platform = ?,
      avatar = ?
    WHERE id = ?
  `).run(updatedName, updatedUsername, updatedBio, updatedPlatform, updatedAvatar, id);

  return getUserById(id);
}

// Auth middleware for express
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = getUserById(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  next();
}

module.exports = {
  registerUser,
  loginUser,
  createGuestUser,
  getUserById,
  updateUserProfile,
  generateToken,
  verifyToken,
  authMiddleware,
  DEFAULT_AVATARS
};
