require('dotenv').config();
const scheduler = require('./src/scheduler');

// Cron format: minute hour day month weekday
// '*/5 * * * *'  - Every 5 minutes (for testing)
// '0 */3 * * *'  - Every 3 hours
// '0 9,15,21 * * *' - 9 AM, 3 PM, 9 PM daily

const UPLOAD_INTERVAL = process.env.UPLOAD_INTERVAL || '*/5 * * * *';

console.log('🚀 TikTok Auto-Uploader Started');
scheduler.start(UPLOAD_INTERVAL);

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});