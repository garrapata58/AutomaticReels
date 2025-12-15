const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "data.db");
let db;

function init() {
  return new Promise((resolve, reject) => {
    try {
      // Abrir la base de datos
      db = new Database(dbPath);

      // Crear tablas
      db.prepare(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password_enc TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      db.prepare(`
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
      `).run();

      // Crear wrapper con API idéntica a la anterior
      const dbWrapper = {
        // INSERT / UPDATE / DELETE
        run(sql, params = []) {
          return new Promise((resolve, reject) => {
            try {
              const stmt = db.prepare(sql);
              const result = stmt.run(params);
              resolve({ lastID: result.lastInsertRowid, changes: result.changes });
            } catch (err) {
              reject(err);
            }
          });
        },

        // SELECT 1 fila
        get(sql, params = []) {
          return new Promise((resolve, reject) => {
            try {
              const stmt = db.prepare(sql);
              const row = stmt.get(params);
              resolve(row);
            } catch (err) {
              reject(err);
            }
          });
        },

        // SELECT muchas filas
        all(sql, params = []) {
          return new Promise((resolve, reject) => {
            try {
              const stmt = db.prepare(sql);
              const rows = stmt.all(params);
              resolve(rows);
            } catch (err) {
              reject(err);
            }
          });
        },

        // acceso crudo
        _db: db
      };

      resolve(dbWrapper);

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { init };
