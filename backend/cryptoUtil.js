const crypto = require("crypto");
const ALGO = "aes-256-gcm";

function encrypt(text, masterKeyHex) {
  const key = Buffer.from(masterKeyHex, "hex");
  if (key.length !== 32) throw new Error("MASTER_KEY debe ser 32 bytes hex (64 chars).");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("hex");
}

function decrypt(hexPayload, masterKeyHex) {
  const key = Buffer.from(masterKeyHex, "hex");
  const b = Buffer.from(hexPayload, "hex");
  const iv = b.slice(0, 12);
  const tag = b.slice(12, 28);
  const ciphertext = b.slice(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

module.exports = { encrypt, decrypt };
