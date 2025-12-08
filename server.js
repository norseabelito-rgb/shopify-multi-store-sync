// server.js
const express = require('express');
const apiRouter = require('./routes/api');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/', dashboardRouter);
app.use('/', apiRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});