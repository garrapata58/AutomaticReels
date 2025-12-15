const axios = require('axios');
const fs = require('fs');
const config = require('../config/tiktok.config');

class TikTokService {
  async uploadVideo() {
    try {
      console.log('🎬 Starting TikTok upload...');
      
      // Step 1: Initialize upload
      const initResponse = await this.initializeUpload();
      const uploadUrl = initResponse.data.data.upload_url;
      const publishId = initResponse.data.data.publish_id;
      
      // Step 2: Upload video file
      await this.uploadVideoFile(uploadUrl);
        
      // Step 3: Check publish status
      await this.checkPublishStatus(publishId);
      
      console.log('✅ Video uploaded successfully!');
      return { success: true, publishId };
    } catch (error) {
      console.error('❌ Upload failed:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async initializeUpload() {
    const videoStats = fs.statSync(config.VIDEO_PATH);
    
    return await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        post_info: {
          title: config.CAPTION,
          privacy_level: config.PRIVACY_LEVEL,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoStats.size,
          chunk_size: videoStats.size,
          total_chunk_count: 1
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.ACCESS_TOKEN}`,
          'Content-Type': 'application/json; charset=UTF-8'
        }
      }
    );
  }

  async uploadVideoFile(uploadUrl) {
    const videoBuffer = fs.readFileSync(config.VIDEO_PATH);
    
    return await axios.put(uploadUrl, videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoBuffer.length
      }
    });
  }

  async checkPublishStatus(publishId) {
    return await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
      { publish_id: publishId },
      {
        headers: {
          'Authorization': `Bearer ${config.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

module.exports = new TikTokService();