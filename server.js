import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SUBSCRIBERS_FILE)) {
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// Helpers for reading and saving subscribers
function getSubscribers() {
  try {
    const raw = fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading subscribers file:', err);
    return [];
  }
}

function saveSubscribers(subscribers) {
  try {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing subscribers file:', err);
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Email validation helper
function isValidEmail(email) {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).toLowerCase());
}

// API Routes
app.get('/api/stats', (req, res) => {
  const subscribers = getSubscribers();
  const baseAdopters = 2480;
  
  // Target launch date: May 20, 2026 12:00:00 UTC
  const launchDate = new Date('2026-05-20T12:00:00Z').getTime();

  res.json({
    totalAdopters: baseAdopters + subscribers.length,
    launchDate: launchDate
  });
});

app.post('/api/subscribe', (req, res) => {
  const { email, role } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const subscribers = getSubscribers();

  const existing = subscribers.find((sub) => sub.email === cleanEmail);
  if (existing) {
    return res.status(200).json({
      success: true,
      alreadySubscribed: true,
      message: "You're already on the VIP list! We'll reach out as soon as doors open.",
      position: existing.position
    });
  }

  const baseAdopters = 2480;
  const position = baseAdopters + subscribers.length + 1;
  const newSubscriber = {
    email: cleanEmail,
    role: role || 'Explorer',
    subscribedAt: new Date().toISOString(),
    position: position
  };

  subscribers.push(newSubscriber);
  saveSubscribers(subscribers);

  console.log(`[New Subscriber] ${cleanEmail} (VIP #${position})`);

  return res.status(201).json({
    success: true,
    message: "Welcome to the inner circle! You've reserved early VIP access.",
    position: position
  });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✨ WeBros Landing Page server running at http://localhost:${PORT}`);
});
