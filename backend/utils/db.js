const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, '../db.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      Object.assign(global.db, data);
      console.log('Loaded persisted DB');
    }
  } catch (e) { console.log('Could not load db.json, using memory'); }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(global.db, null, 2));
  } catch (e) { console.error('Could not save db.json'); }
}

setInterval(saveDB, 30000);
process.on('exit', saveDB);
process.on('SIGINT', () => { saveDB(); process.exit(); });

module.exports = { loadDB, saveDB };
