require('dotenv').config();
const cron = require('node-cron');
const tiktokService = require('./src/services/tiktok-puppeteer.service');
const path = require('path');

// ========================================
// 🔧 CHANGE THESE TO YOUR TIKTOK CREDENTIALS
// ========================================
const USERNAME = 'user3758485815594';
const PASSWORD = 'Dt12072007@';
// ========================================

async function uploadToTikTok() {
  console.log(`\n🕐 [${new Date().toISOString()}] Starting upload...`);
  
  const videoPath = path.join(__dirname, 'videos', 'default-video.mp4');
  const caption = 'Auto-uploaded video! 🚀 #automation #test';
  
  const result = await tiktokService.uploadVideo(USERNAME, PASSWORD, videoPath, caption);
  
  if (result.success) {
    console.log('✅ Upload session completed successfully');
  } else {
    console.log('❌ Upload session failed:', result.error);
  }
}

console.log('🚀 TikTok Auto-Uploader Started\n');

// Run first upload immediately
uploadToTikTok();

// Schedule uploads every 5 minutes (for testing)
// Change to '0 */3 * * *' for every 3 hours in production
console.log('⏰ Scheduled uploads: Every 5 minutes\n');
cron.schedule('*/5 * * * *', () => {
  console.log('\n⏰ Scheduled upload triggered');
  uploadToTikTok();
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});