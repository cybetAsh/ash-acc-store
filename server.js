require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const CONTACT_NUMBER = process.env.CONTACT_NUMBER || '';
const GROUP_URL_1 = process.env.GROUP_URL_1 || '#';
const GROUP_URL_2 = process.env.GROUP_URL_2 || '#';
const GROUP_URL_3 = process.env.GROUP_URL_3 || '#';

const DATA_FILE = path.join(__dirname, 'data.json');

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ items: [], stats: { accountsSold: 1000, deliverySpeedText: "Highly Speed & Recommended Service" } }, null, 2));
}

function readData() { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'replace_this_with_a_long_random_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.get('/', (req, res) => {
  const data = readData();
  res.render('index', {
    items: data.items,
    stats: data.stats,
    adminLoggedIn: !!req.session.admin,
    contactNumber: CONTACT_NUMBER,
    groupUrls: { g1: GROUP_URL_1, g2: GROUP_URL_2, g3: GROUP_URL_3 }
  });
});

app.get('/login', (req, res) => { res.render('login', { error: null }); });

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.admin = { username };
    return res.redirect('/upload');
  }
  return res.render('login', { error: 'Only Login Admin' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => { res.redirect('/'); });
});

app.get('/upload', (req, res) => {
  if (!req.session.admin) return res.redirect('/login');
  res.render('upload', { error: null, success: null });
});

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.session.admin) return res.status(403).send('Forbidden');

  const title = req.body.title || 'Untitled';
  const price = req.body.price || '';
  const description = req.body.description || '';
  const filename = req.file ? `/uploads/${req.file.filename}` : '/uploads/placeholder.png';

  const data = readData();
  data.items.unshift({
    id: Date.now(),
    title,
    price,
    description,
    image: filename,
    createdAt: new Date().toISOString()
  });

  writeData(data);
  res.render('upload', { success: 'Uploaded & published to homepage', error: null });
});

app.post('/mark-sold/:id', (req, res) => {
  if (!req.session.admin) return res.status(403).send('Forbidden');
  const id = Number(req.params.id);
  const data = readData();
  data.items = data.items.filter(it => it.id !== id);
  data.stats.accountsSold = (data.stats.accountsSold || 0) + 1;
  writeData(data);
  res.redirect('/');
});

app.listen(PORT, () => { console.log(`Server running on http://localhost:${PORT}`); });
