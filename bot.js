const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// ================== TOKEN ==================
// GANTI DENGAN TOKEN DARI @BotFather
const TOKEN = '8823917633:AAE5uhfmXJNrRFBi4-emN8Er2jiXhnFO6oc';

// ================== BUAT BOT ==================
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🎵 @Mp3titkok_bot AKTIF!');

// ================== FUNGSI DOWNLOAD DENGAN MULTI API ==================
async function downloadTikTokAPI(url) {
    // Senarai API (try satu-satu)
    const apis = [
        {
            name: 'TikWM',
            url: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
            extractor: (data) => {
                if (data && data.code === 0 && data.data) {
                    const d = data.data;
                    return {
                        audioUrl: d.music || d.audio || null,
                        videoUrl: d.play || d.hd_play || d.wmplay || d.nowm || null,
                        title: d.title || 'TikTok Media'
                    };
                }
                return null;
            }
        },
        {
            name: 'Snaptik',
            url: `https://api.snaptik.app/api/download?url=${encodeURIComponent(url)}`,
            extractor: (data) => {
                if (data && data.audio) {
                    return {
                        audioUrl: data.audio,
                        videoUrl: data.video || null,
                        title: data.title || 'TikTok Media'
                    };
                }
                return null;
            }
        },
        {
            name: 'SSSTik',
            url: `https://api.ssstik.com/api/download?url=${encodeURIComponent(url)}`,
            extractor: (data) => {
                if (data && data.audio) {
                    return {
                        audioUrl: data.audio,
                        videoUrl: data.video || null,
                        title: data.title || 'TikTok Media'
                    };
                } else if (data && data.data && data.data.play) {
                    return {
                        audioUrl: data.data.play,
                        videoUrl: data.data.hd_play || null,
                        title: data.data.title || 'TikTok Media'
                    };
                }
                return null;
            }
        }
    ];

    // Try each API
    for (const api of apis) {
        try {
            console.log(`Trying API: ${api.name}`);
            const response = await axios.get(api.url, { 
                timeout: 20000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.tikwm.com/'
                }
            });
            
            const result = api.extractor(response.data);
            if (result && (result.audioUrl || result.videoUrl)) {
                console.log(`✅ API ${api.name} berjaya!`);
                return result;
            }
            console.log(`⚠️ API ${api.name} returned no media`);
        } catch (error) {
            console.log(`❌ API ${api.name} failed:`, error.message);
        }
    }

    // If all APIs fail
    throw new Error('Semua API gagal. Cuba lagi nanti.');
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

// /mp4 - Download video
bot.onText(/\/mp4 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();

    if (!url.includes('tiktok.com')) {
        return bot.sendMessage(chatId, '❌ Hantar link TikTok sahaja.');
    }

    const status = await bot.sendMessage(chatId, '⏳ Memproses video...');

    try {
        const result = await downloadTikTokAPI(url);
        
        if (result.videoUrl) {
            await bot.sendVideo(chatId, result.videoUrl, { 
                caption: `🎬 ${result.title}`,
                supports_streaming: true
            });
        } else if (result.audioUrl) {
            await bot.sendAudio(chatId, result.audioUrl, { 
                caption: `🎵 ${result.title} (Video tidak tersedia)`,
                title: result.title
            });
        } else {
            throw new Error('Media tidak dijumpai.');
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
        
        if (result.audioUrl) {
            await bot.sendAudio(chatId, result.audioUrl, { 
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
            `❌ Gagal memproses link.\n\nKemungkinan:\n• Video private\n• Link tidak sah\n• Server sibuk\n\nCuba lagi nanti.`,
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
