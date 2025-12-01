const puppeteer = require("puppeteer");
const path = require("path");
const winston = require("winston");

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'upload.log' }),
    new winston.transports.Console()
  ]
});

async function uploadReel(username, password, videoPath, caption, headless = true) {
  const browser = await puppeteer.launch({
    headless: headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=412,915"
    ]
  });

  const page = await browser.newPage();

  try {
    await page.setUserAgent("Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36");
    await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "networkidle2" });
    await page.waitForSelector('input[name="username"]', { timeout: 20000 });
    await page.type('input[name="username"]', username, { delay: 50 });
    await page.type('input[name="password"]', password, { delay: 50 });
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(()=>{})
    ]);

    // navigate to create flow
    await page.goto("https://www.instagram.com/create/details/", { waitUntil: "networkidle2" });

    await page.waitForSelector('input[type="file"]', { timeout: 20000 });
    const inputUpload = await page.$('input[type="file"]');
    await inputUpload.uploadFile(path.resolve(videoPath));

    // wait a bit for upload + processing
    await page.waitForTimeout(8000);

    // try textarea or editable div
    try {
      await page.waitForSelector('textarea', { timeout: 7000 });
      await page.type('textarea', caption, { delay: 20 });
    } catch(e) {
      try { await page.type('div[role="textbox"]', caption, { delay: 20 }); } catch(err){ logger.warn("No caption selector found."); }
    }

    // find publish button by heuristics
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const txt = await page.evaluate(el => el.innerText || "", b);
      if (txt && (txt.toLowerCase().includes("share") || txt.toLowerCase().includes("publicar") || txt.toLowerCase().includes("compartir"))) {
        await b.click();
        break;
      }
    }

    await page.waitForTimeout(8000);
    logger.info(`Upload done for ${username} -> ${videoPath}`);
    await browser.close();
    return { ok: true, message: "Reel subido (intento)" };
  } catch (err) {
    logger.error("Upload error: " + err.toString());
    await browser.close();
    return { ok: false, message: err.toString() };
  }
}

module.exports = { uploadReel };
