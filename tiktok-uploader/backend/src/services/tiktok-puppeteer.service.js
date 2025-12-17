const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const COOKIES_PATH = path.join(__dirname, '../../cookies.json');

class TikTokPuppeteerService {
  async uploadVideo(username, password, videoPath, caption) {
    let browser;
    try {
      console.log('🎬 Launching browser...');
      
      browser = await puppeteer.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      
      // Load saved cookies if they exist
      if (fs.existsSync(COOKIES_PATH)) {
        console.log('🍪 Loading saved cookies...');
        const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'));
        await page.setCookie(...cookies);
        
        // Go directly to upload page
        console.log('📤 Going to upload page with saved session...');
        await page.goto('https://www.tiktok.com/creator-center/upload', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Check if still logged in
        await wait(2000);
        const isLoggedIn = await page.evaluate(() => {
          return !window.location.href.includes('login');
        });
        
        if (isLoggedIn) {
          console.log('✅ Already logged in via cookies!');
          // Skip to upload
          return await this.performUpload(page, videoPath, caption, browser);
        } else {
          console.log('⚠️ Cookies expired, logging in again...');
        }
      }
      
      // Login flow (only if cookies don't work)
      console.log('📱 Navigating to TikTok login...');
      await page.goto('https://www.tiktok.com/login/phone-or-email/email', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      await wait(2000);
      
      console.log('🔐 Entering credentials...');
      await page.waitForSelector('input[name="username"]', { timeout: 10000 });
      await page.type('input[name="username"]', username, { delay: 100 });
      
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.type('input[type="password"]', password, { delay: 100 });
      
      await page.click('button[type="submit"]');
      
      console.log('⏳ Waiting for login...');
      console.log('');
      console.log('🧩 IF YOU SEE A CAPTCHA: Please solve it manually in the browser');
      console.log('⏰ You have 60 seconds...');
      console.log('');
      
      // Wait longer for manual CAPTCHA solving
      await wait(60000); // 60 seconds for user to solve CAPTCHA
      
      // Check if we're logged in
      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        throw new Error('Login failed - still on login page');
      }
      
      console.log('✅ Logged in successfully!');
      
      // Save cookies for next time
      const cookies = await page.cookies();
      fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
      console.log('🍪 Cookies saved for future logins!');
      
      // Proceed with upload
      return await this.performUpload(page, videoPath, caption, browser);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      if (browser) {
        console.log('💡 Browser will stay open for 30 seconds...');
        await wait(30000);
        await browser.close();
      }
      return { success: false, error: error.message };
    }
  }
  
  async performUpload(page, videoPath, caption, browser) {
    try {
      // Go to upload page if not already there
      if (!page.url().includes('upload')) {
        console.log('📤 Navigating to upload page...');
        await page.goto('https://www.tiktok.com/creator-center/upload', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
      }
      
      await wait(3000);
      
      console.log('📹 Uploading video...');
      const inputUploadHandle = await page.$('input[type="file"]');
      
      if (!inputUploadHandle) {
        throw new Error('Upload input not found');
      }
      
      await inputUploadHandle.uploadFile(videoPath);
      
      console.log('⏳ Processing video...');
      await wait(15000);
      
      console.log('✍️ Adding caption...');
      try {
        const captionSelector = 'div[contenteditable="true"]';
        await page.waitForSelector(captionSelector, { timeout: 10000 });
        await page.click(captionSelector);
        await page.keyboard.type(caption, { delay: 50 });
      } catch (e) {
        console.log('⚠️ Could not add caption automatically');
      }
      
      await wait(3000);
      
      console.log('🚀 Looking for Post button...');
      try {
        await page.waitForFunction(
          () => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.some(btn => 
              btn.textContent.includes('Post') && !btn.disabled
            );
          },
          { timeout: 20000 }
        );
        
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const postButton = buttons.find(btn => btn.textContent.includes('Post'));
          if (postButton) postButton.click();
        });
        
        console.log('✅ Post button clicked!');
        await wait(15000);
        console.log('✅ Upload complete!');
      } catch (e) {
        console.log('⚠️ Could not click post - click manually in next 30 seconds');
        await wait(30000);
      }
      
      await browser.close();
      return { success: true };
      
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new TikTokPuppeteerService();