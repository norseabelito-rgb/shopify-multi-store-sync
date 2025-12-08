const express = require('express');

const dashboardRouter = require('./routes/dashboard');
const apiRouter = require('./routes/api');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// rute UI
app.use('/', dashboardRouter);

// rute API
app.use('/', apiRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});