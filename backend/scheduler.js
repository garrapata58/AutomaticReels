const cron = require("node-cron");
const { uploadReel } = require("./instagram/uploadReel");

let db;
const tasks = {};

// Esta función permite asignar la DB desde app.js
function setDB(database) {
  db = database;
}

// Inicia un task de cron según la schedule
function startTask(schedule) {
  if (!schedule || !schedule.cron_expr) return;

  const task = cron.schedule(schedule.cron_expr, async () => {
    console.log(`Ejecutando schedule ID ${schedule.id} para ${schedule.username}`);
    try {
      await uploadReel(schedule.username, schedule.password_enc, schedule.video_path, schedule.caption, process.env.PUPPETEER_HEADLESS === "true");
      db.run("UPDATE schedules SET last_run = CURRENT_TIMESTAMP WHERE id = ?", schedule.id);
    } catch (e) {
      console.error(`Error en schedule ${schedule.id}:`, e);
    }
  });

  tasks[schedule.id] = task;
}

// Agrega una nueva schedule
function addSchedule(account_id, video_path, caption, cron_expr) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO schedules (account_id, video_path, caption, cron_expr) VALUES (?, ?, ?, ?)",
      [account_id, video_path, caption, cron_expr],
      function(err) {
        if (err) return reject(err);
        const newSchedule = {
          id: this.lastID,
          account_id,
          video_path,
          caption,
          cron_expr,
          active: 1
        };
        startTask(newSchedule);
        resolve(newSchedule);
      }
    );
  });
}

// Detiene una schedule
function stopSchedule(id) {
  const task = tasks[id];
  if (task) {
    task.stop();
    delete tasks[id];
    db.run("UPDATE schedules SET active = 0 WHERE id = ?", id);
  }
}

// Carga todas las schedules activas al iniciar el servidor
function loadAll() {
  if (!db) return console.error("DB no inicializada en scheduler");

  db.all(
    `SELECT s.id, s.video_path, s.caption, s.cron_expr, s.active, a.username, a.password_enc
     FROM schedules s
     JOIN accounts a ON s.account_id = a.id
     WHERE s.active = 1`,
    [],
    (err, rows) => {
      if (err) return console.error("Error cargando schedules:", err);
      if (!rows || !Array.isArray(rows) || rows.length === 0) return;
      rows.forEach(startTask);
      console.log(`Cargados ${rows.length} schedules activos`);
    }
  );
}

// Exportamos todo correctamente
module.exports = { setDB, addSchedule, stopSchedule, loadAll };
