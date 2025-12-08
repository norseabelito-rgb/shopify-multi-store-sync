// config.js
const SHOPIFY_API_VERSION = '2024-10';
const SCRIPT_TAG = 'ADAUGAT CU SCRIPT';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

module.exports = {
  SHOPIFY_API_VERSION,
  SCRIPT_TAG,
  requireEnv
};