const isLocal =
  window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

window.API_BASE_URL = isLocal
  ? 'http://localhost:8000'
  : 'https://tripsmart-lpsm.onrender.com';

window.escapeHTML = function (str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
