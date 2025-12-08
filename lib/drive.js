// lib/drive.js
const { getDriveClient } = require('./google');

function extractDriveFolderId(urlOrId) {
  if (!urlOrId) return null;

  const trimmed = urlOrId.trim();

  if (!trimmed.includes('http') && !trimmed.includes('/')) {
    return trimmed;
  }

  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];

  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  return null;
}

async function getImageUrlsFromDriveFolder(mediaFolderUrl, maxFiles = 10) {
  const folderId = extractDriveFolderId(mediaFolderUrl);
  if (!folderId) return [];

  const drive = await getDriveClient();

  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    orderBy: 'createdTime',
    pageSize: maxFiles,
    fields: 'files(id, name)'
  });

  const files = res.data.files || [];
  if (!files.length) return [];

  return files.map((file) => `https://drive.google.com/uc?export=view&id=${file.id}`);
}

async function getFirstImageUrlFromDriveFolder(mediaFolderUrl) {
  const urls = await getImageUrlsFromDriveFolder(mediaFolderUrl, 1);
  return urls[0] || null;
}

module.exports = {
  extractDriveFolderId,
  getImageUrlsFromDriveFolder,
  getFirstImageUrlFromDriveFolder
};