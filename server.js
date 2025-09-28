const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

// View engine
app.set('view engine', 'ejs');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: true
}));

// Storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Data file
const DATA_FILE = './data.json';

// Routes
app.get('/', (req, res) => {
  const items = JSON.parse(fs.readFileSync(DATA_FILE));
  res.render('index', { items, loggedIn: req.session.loggedIn });
});

// Login page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login POST
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.session.loggedIn = true;
    return res.redirect('/upload');
  }
  res.render('login', { error: 'Only Login Admin 🚫' });
});

// Upload page
app.get('/upload', (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/login');
  res.render('upload');
});

// Upload POST
app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/login');

  const items = JSON.parse(fs.readFileSync(DATA_FILE));
  const newItem = {
    id: Date.now(),
    text: req.body.text,
    image: '/uploads/' + req.file.filename
  };
  items.push(newItem);
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));

  res.redirect('/');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
