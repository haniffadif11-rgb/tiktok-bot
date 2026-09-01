const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// ================== TOKEN ==================
// GANTI DENGAN TOKEN DARI @BotFather
const TOKEN = '8823917633:AAE5uhfmXJNrRFBi4-emN8Er2jiXhnFO6oc';

// ================== BUAT BOT ==================
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🎵 @Mp3titkok_bot AKTIF!');

// ================== FUNGSI DOWNLOAD GUNA API TIKWM (FULL) ==================
async function downloadTikTokAPI(url) {
    try {
        // API TikWM
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { 
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const data = response.data;

        console.log('API Response:', JSON.stringify(data).substring(0, 500));

        if (data && data.code === 0 && data.data) {
            const videoData = data.data;
            
            // AUDIO (MP3) - multiple possible sources
            let audioUrl = null;
            if (videoData.music) {
                audioUrl = videoData.music;
            } else if (videoData.audio) {
                audioUrl = videoData.audio;
            } else if (videoData.hd_audio) {
                audioUrl = videoData.hd_audio;
            }
            
            // VIDEO (MP4) - multiple possible sources
            let videoUrl = null;
            if (videoData.play) {
                videoUrl = videoData.play;
            } else if (videoData.hd_play) {
                videoUrl = videoData.hd_play;
            } else if (videoData.wmplay) {
                videoUrl = videoData.wmplay;
            } else if (videoData.nowm) {
                videoUrl = videoData.nowm;
            }
            
            const title = videoData.title || 'TikTok Media';
            
            // Return both if available
            return {
                audioUrl: audioUrl,
                videoUrl: videoUrl,
                title: title,
                _raw: videoData
            };
        } else {
            throw new Error('API returned error: ' + (data.msg || 'Unknown error'));
        }
    } catch (error) {
        console.error('API Error:', error.message);
        throw new Error('Gagal memproses link. Cuba link lain.');
    }
}

// ================== PERINTAH BOT ==================

// /start
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
🎵 @Mp3titkok_bot

Hantar link TikTok → dapat MP3
/mp4 [link] → dapat MP4
/help → Bantuan
`);
});

// /help
bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, `
📖 BANTUAN
Hantar link TikTok → MP3
/mp4 [link] → MP4
/status → Cek status
`);
});

// /mp4 - Download video (UPDATED)
bot.onText(/\/mp4 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();

    if (!url.includes('tiktok.com')) {
        return bot.sendMessage(chatId, '❌ Hantar link TikTok sahaja.');
    }

    const status = await bot.sendMessage(chatId, '⏳ Memproses video...');

    try {
        const result = await downloadTikTokAPI(url);
        
        // Try multiple video sources
        let videoUrl = result.videoUrl;
        
        // If no video, try to get from raw data
        if (!videoUrl && result._raw) {
            const raw = result._raw;
            videoUrl = raw.play || raw.hd_play || raw.wmplay || raw.nowm;
        }
        
        if (videoUrl) {
            await bot.sendVideo(chatId, videoUrl, { 
                caption: `🎬 ${result.title}`,
                supports_streaming: true
            });
        } else {
            // If no video, try to send audio as fallback
            if (result.audioUrl) {
                await bot.sendAudio(chatId, result.audioUrl, { 
                    caption: `🎵 ${result.title} (Video tidak tersedia, audio sahaja)`,
                    title: result.title
                });
            } else {
                throw new Error('Video tidak dijumpai.');
            }
        }
        await bot.deleteMessage(chatId, status.message_id);
    } catch (error) {
        await bot.editMessageText(`❌ Gagal: ${error.message}`, { 
            chat_id: chatId, 
            message_id: status.message_id 
        });
    }
});

// /status
bot.onText(/\/status/, (msg) => {
    bot.sendMessage(msg.chat.id, `✅ BOT AKTIF\n🕒 ${new Date().toLocaleString()}`);
});

// ================== HANDLE LINK TIKTOK (AUTO MP3) ==================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/') || !text.includes('tiktok.com')) return;

    const status = await bot.sendMessage(chatId, '⏳ Memproses audio...');

    try {
        const result = await downloadTikTokAPI(text);
        
        // Try multiple audio sources
        let audioUrl = result.audioUrl;
        
        // If no audio, try to get from raw data
        if (!audioUrl && result._raw) {
            const raw = result._raw;
            audioUrl = raw.music || raw.audio || raw.hd_audio;
        }
        
        if (audioUrl) {
            await bot.sendAudio(chatId, audioUrl, { 
                caption: `🎵 ${result.title}`,
                title: result.title
            });
        } else {
            throw new Error('Audio tidak dijumpai.');
        }
        await bot.deleteMessage(chatId, status.message_id);
    } catch (error) {
        console.error('Error:', error.message);
        await bot.editMessageText(
            `❌ Gagal memproses link.\n\nKemungkinan:\n• Video private\n• Link tidak sah\n• Server sibuk`,
            { chat_id: chatId, message_id: status.message_id }
        );
    }
});

// ================== FAKE WEB SERVER UNTUK RENDER ==================
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🎵 @Mp3titkok_bot is running!');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Fake web server running on port ${port}`);
});

console.log('✅ @Mp3titkok_bot siap!');
console.log('📌 Hantar link → MP3 | /mp4 [link] → MP4');
