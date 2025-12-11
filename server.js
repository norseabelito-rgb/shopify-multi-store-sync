// server.js
const express = require('express');
const path = require('path');

const apiRouter = require('./routes/api');
const dashboardRouter = require('./routes/dashboard');
const marketingRouter = require('./routes/marketing');
const shopifyRouter = require('./routes/shopify');
// logsTestRouter removed - no longer needed

const app = express();
const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD || '';

// middlewares globale
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static (dacă vrei să adaugi CSS/JS separat în viitor)
app.use('/public', express.static(path.join(__dirname, 'public')));

// login simplu dacă există APP_PASSWORD
function parseCookies(req) {
  const header = req.headers.cookie;
  const result = {};
  if (!header) return result;
  header.split(';').forEach((part) => {
    const [k, v] = part.split('=');
    if (!k) return;
    result[k.trim()] = decodeURIComponent((v || '').trim());
  });
  return result;
}

// Pagina de login (simplă)
app.get('/login', (req, res) => {
  if (!APP_PASSWORD) {
    return res.send(`
      <html>
        <head><title>Login</title></head>
        <body style="font-family: system-ui; padding: 32px; color: #e5e7eb; background:#020617;">
          <h2>Login dezactivat</h2>
          <p>Nu este setată <code>APP_PASSWORD</code> în environment. Toată aplicația este accesibilă direct.</p>
          <p><a href="/">→ Mergi la dashboard</a></p>
        </body>
      </html>
    `);
  }

  res.send(`
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Login – Control Panel</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(circle at 0 0, rgba(96,165,250,0.18), transparent 55%),
        radial-gradient(circle at 100% 100%, rgba(129,140,248,0.18), transparent 60%),
        #020617;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #e5e7eb;
    }
    .card {
      background: rgba(15,23,42,0.96);
      border-radius: 16px;
      padding: 24px 22px 20px;
      border: 1px solid rgba(148,163,184,0.4);
      box-shadow: 0 18px 50px rgba(15,23,42,0.9);
      width: 320px;
      max-width: 90vw;
    }
    h1 {
      margin: 0 0 4px;
      font-size: 20px;
    }
    p {
      margin: 0 0 12px;
      font-size: 13px;
      color: #9ca3af;
    }
    label {
      display: block;
      font-size: 12px;
      margin-bottom: 4px;
    }
    input[type="password"] {
      width: 100%;
      padding: 8px 9px;
      border-radius: 10px;
      border: 1px solid rgba(148,163,184,0.6);
      background: #020617;
      color: #e5e7eb;
      font-size: 13px;
      box-sizing: border-box;
      margin-bottom: 12px;
    }
    button {
      width: 100%;
      padding: 8px 10px;
      border-radius: 999px;
      border: 0;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      background: linear-gradient(135deg, #60a5fa, #a855f7);
      color: #020617;
      box-shadow: 0 12px 30px rgba(37,99,235,0.65);
    }
    .note {
      margin-top: 10px;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }
    .error {
      color: #fecaca;
      font-size: 12px;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Control Panel Login</h1>
    <p>Introduce parola setată în <code>APP_PASSWORD</code> în Railway.</p>
    ${req.query.err === '1' ? '<div class="error">Parolă incorectă.</div>' : ''}
    <form method="POST" action="/login">
      <label for="password">Parola</label>
      <input id="password" type="password" name="password" autocomplete="current-password" required />
      <button type="submit">Intră în panel</button>
    </form>
    <div class="note">Panel intern pentru Shopify & Ads – by Ștefan.</div>
  </div>
</body>
</html>
  `);
});

app.post('/login', (req, res) => {
  if (!APP_PASSWORD) {
    return res.redirect('/');
  }
  const pwd = (req.body && req.body.password) || '';
  if (pwd === APP_PASSWORD) {
    res.setHeader('Set-Cookie', 'app_auth=1; HttpOnly; Path=/; SameSite=Lax');
    return res.redirect('/');
  }
  return res.redirect('/login?err=1');
});

// middleware de auth
function authMiddleware(req, res, next) {
  if (!APP_PASSWORD) {
    return next();
  }
  // lăsăm login-ul și staticul liber
  if (req.path.startsWith('/login') || req.path.startsWith('/public')) {
    return next();
  }

  const cookies = parseCookies(req);
  if (cookies.app_auth === '1') {
    return next();
  }

  return res.redirect('/login');
}

// aplicăm auth pentru restul
app.use(authMiddleware);

// routere
app.use('/', apiRouter);           // /stores, /orders, /customers, /preview, /sync, /media etc.
app.use('/marketing', marketingRouter);
app.use('/shopify', shopifyRouter);
app.use('/', dashboardRouter);

// 404
app.use((req, res) => {
  res.status(404).send('Not found');
});

// error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Server error', message: err.message || String(err) });
});

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
