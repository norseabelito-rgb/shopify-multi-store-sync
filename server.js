// server.js
const express = require('express');
const apiRouter = require('./routes/api');
const dashboardRouter = require('./routes/dashboard');
const marketingRouter = require('./routes/marketing');
const marketingPage = require('./ui/marketingPage');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/', dashboardRouter);
app.use('/', apiRouter);
app.use('/', marketingRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});