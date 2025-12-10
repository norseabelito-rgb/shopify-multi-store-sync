// routes/shopify.js
const express = require('express');
const router = express.Router();

const shopifyPage = require('../ui/shopifyPage');

// UI pentru modulul Shopify (My Stores)
router.get('/', (req, res) => {
  res.send(shopifyPage());
});

module.exports = router;