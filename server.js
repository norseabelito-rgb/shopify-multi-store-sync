// server.js
const express = require('express');
const apiRouter = require('./routes/api');
const dashboardRouter = require('./routes/dashboard');
const marketingRouter = require('./routes/marketing');
const marketingPage = require('./ui/marketingPage');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Dashboard + API vechi (Shopify)
app.use('/', dashboardRouter);
app.use('/', apiRouter);

// API pentru marketing (TikTok etc) – va răspunde pe /api/marketing/...
app.use('/api/marketing', marketingRouter);

// Pagina HTML de Marketing – UI-ul nou
app.get('/marketing', (req, res) => {
  const html = marketingPage();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});