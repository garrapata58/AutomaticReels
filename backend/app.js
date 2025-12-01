// app.js
const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

const { init } = require("./db");
const { encrypt, decrypt } = require("./cryptoUtil");
const scheduler = require("./scheduler");
const { uploadReel } = require("./instagram/uploadReel");

const app = express();
const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

(async () => {
  const db = await init();

  if (!process.env.MASTER_KEY) {
    console.error("ERROR: MASTER_KEY no definida en el .env");
    process.exit(1);
  }

  // Crear o actualizar cuenta
  app.post("/api/accounts", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username o password faltante" });

    try {
      console.log(`[DEBUG] Creando cuenta para: ${username}`);
      const enc = encrypt(password, process.env.MASTER_KEY);
      console.log(`[DEBUG] Password encriptada: ${enc ? 'OK' : 'FAIL'}`);

      // Insertar o actualizar la cuenta
      await db.run(
        "INSERT INTO accounts (username, password_enc) VALUES (?, ?) " +
        "ON CONFLICT(username) DO UPDATE SET password_enc=excluded.password_enc",
        [username, enc]
      );

      // Obtener la cuenta recién creada/actualizada
      const row = await db.get(
        "SELECT id, username, password_enc FROM accounts WHERE username = ?",
        [username]
      );
      
      console.log(`[DEBUG] Cuenta guardada:`, { 
        id: row.id, 
        username: row.username, 
        hasPassword: !!row.password_enc,
        passwordLength: row.password_enc ? row.password_enc.length : 0
      });

      res.json({ ok: true, account: { id: row.id, username: row.username } });
    } catch (err) {
      console.error('[ERROR] Al crear cuenta:', err);
      res.status(500).json({ error: err.toString() });
    }
  });

  // Obtener cuentas
  app.get("/api/accounts", async (req, res) => {
    try {
      const rows = await db.all("SELECT id, username, created_at FROM accounts");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.toString() });
    }
  });

  // Subir video y publicar ahora
  app.post("/api/upload-now", upload.single("video"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No video uploaded" });

      const { account_id, caption } = req.body;
      if (!account_id) return res.status(400).json({ error: "No account_id provided" });

      console.log(`[DEBUG] Buscando cuenta con ID: ${account_id}`);

      const acc = await db.get(
        "SELECT username, password_enc FROM accounts WHERE id = ?",
        [account_id]
      );
      
      console.log(`[DEBUG] Cuenta encontrada:`, { 
        found: !!acc, 
        username: acc?.username, 
        hasPassword: !!acc?.password_enc,
        passwordLength: acc?.password_enc ? acc.password_enc.length : 0
      });

      if (!acc) return res.status(400).json({ error: "Account not found" });
      if (!acc.password_enc) return res.status(500).json({ error: "No password stored" });

      const pwd = decrypt(acc.password_enc, process.env.MASTER_KEY);
      console.log(`[DEBUG] Password desencriptada: ${pwd ? 'OK' : 'FAIL'}`);
      
      if (!pwd) return res.status(500).json({ error: "Error decrypting password" });

      console.log(`[DEBUG] Iniciando subida de reel para: ${acc.username}`);

      const r = await uploadReel(
        acc.username,
        pwd,
        req.file.path,
        caption || "",
        process.env.PUPPETEER_HEADLESS === "true"
      );
      
      console.log(`[DEBUG] Resultado de subida:`, r);
      res.json(r);
    } catch (e) {
      console.error('[ERROR] Al subir reel:', e);
      res.status(500).json({ error: e.toString() });
    }
  });

  // Programar publicación
  app.post("/api/schedule", upload.single("video"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No video uploaded" });

      const { account_id, caption, intervalHours } = req.body;
      if (!account_id || !intervalHours)
        return res.status(400).json({ error: "Faltan parámetros account_id o intervalHours" });

      const expr = `0 */${parseInt(intervalHours)} * * *`;
      const row = await scheduler.addSchedule(account_id, req.file.path, caption, expr);
      res.json({ ok: true, schedule: row });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // Obtener schedules
  app.get("/api/schedules", async (req, res) => {
    try {
      const rows = await db.all(`
        SELECT s.id, s.video_path, s.caption, s.cron_expr, s.active, s.last_run, a.username
        FROM schedules s
        JOIN accounts a ON s.account_id = a.id
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.toString() });
    }
  });

  // Detener schedule
  app.post("/api/schedule/stop", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "No schedule id provided" });
      await scheduler.stopSchedule(id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    scheduler.loadAll(db._db);
  });
})();