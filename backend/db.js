const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "data.db");
let db;

function init() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) return reject(err);

      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_enc TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER,
            video_path TEXT,
            caption TEXT,
            cron_expr TEXT,
            active INTEGER DEFAULT 1,
            last_run DATETIME,
            FOREIGN KEY(account_id) REFERENCES accounts(id)
          )
        `);

        // Crear un wrapper con métodos promisificados
        const dbWrapper = {
          // Método run para INSERT, UPDATE, DELETE
          run(sql, params = []) {
            return new Promise((resolve, reject) => {
              db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
              });
            });
          },

          // Método get para SELECT que devuelve una fila
          get(sql, params = []) {
            return new Promise((resolve, reject) => {
              db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
              });
            });
          },

          // Método all para SELECT que devuelve múltiples filas
          all(sql, params = []) {
            return new Promise((resolve, reject) => {
              db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
              });
            });
          },

          // Acceso directo a la instancia de db para casos especiales
          _db: db
        };

        resolve(dbWrapper);
      });
    });
  });
}

module.exports = { init };