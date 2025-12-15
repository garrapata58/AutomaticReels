const cron = require('node-cron');
const tiktokService = require('./services/tiktok.service');

class Scheduler {
  start(interval = '*/30 * * * *') {
    console.log(`⏰ Scheduler started. Upload interval: ${interval}`);
    
    // Schedule recurring uploads
    cron.schedule(interval, async () => {
      console.log(`\n🕐 [${new Date().toISOString()}] Triggering scheduled upload...`);
      await tiktokService.uploadVideo();
    });
  }
}

module.exports = new Scheduler();