const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// ================== TOKEN ==================
const TOKEN = '8823917633:AAE5uhfmXJNrRFBi4-emN8Er2jiXhnFO6oc';

// ================== BUAT BOT ==================
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🎵 @Mp3titkok_bot AKTIF!');

// ================== API LIST (OPTIMIZED) ==================
const API_LIST = [
    // API 1: TikWM (paling stabil)
    {
        name: 'TikWM',
        url: (url) => `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
        timeout: 8000,
        extractor: (data) => {
            if (data?.code === 0 && data?.data) {
                const d = data.data;
                return {
                    audio: d.music || d.audio || null,
                    video: d.play || d.hd_play || d.wmplay || d.nowm || null,
                    title: d.title || 'TikTok'
                };
            }
            return null;
        }
    },
    // API 2: TikMate (cepat)
    {
        name: 'TikMate',
        url: (url) => `https://tikmate.cc/api/download?url=${encodeURIComponent(url)}`,
        timeout: 8000,
        extractor: (data) => {
            if (data?.audio) {
                return {
                    audio: data.audio,
                    video: data.video || null,
                    title: data.title || 'TikTok'
                };
            }
            return null;
        }
    },
    // API 3: Snaptik (backup)
    {
        name: 'Snaptik',
        url: (url) => `https://api.snaptik.app/api/download?url=${encodeURIComponent(url)}`,
        timeout: 10000,
        extractor: (data) => {
            if (data?.audio) {
                return {
                    audio: data.audio,
                    video: data.video || null,
                    title: data.title || 'TikTok'
                };
            }
            return null;
        }
    }
];

// ================== FUNGSI DOWNLOAD (CEPAT) ==================
async function downloadTikTok(url, format = 'mp3') {
    // Try each API (with timeout)
    for (const api of API_LIST) {
        try {
            console.log(`📡 Trying API: ${api.name}...`);
            const response = await axios.get(api.url(url), {
                timeout: api.timeout || 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            });
            
            const result = api.extractor(response.data);
            const mediaUrl = format === 'mp3' ? result?.audio : result?.video;
            
            if (mediaUrl) {
                console.log(`✅ API ${api.name} berjaya! (${format})`);
                return {
                    filePath: mediaUrl,
                    isUrl: true,
                    title: result?.title || 'TikTok'
                };
            }
        } catch (error) {
            console.log(`❌ API ${api.name} failed: ${error.message}`);
        }
    }
    
    // If all APIs fail
    throw new Error('Semua API gagal. Cuba link lain atau tunggu sebentar.');
}

// ================== PERINTAH BOT ==================

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
🎵 @Mp3titkok_bot (CEPAT!)

Hantar link TikTok → dapat MP3 (cepat)
/mp4 [link] → dapat MP4 (cepat)
/help → Bantuan
`);
});

bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, `
📖 BANTUAN
Hantar link → MP3
/mp4 [link] → MP4
/status → Cek status
`);
});

bot.onText(/\/mp4 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();

    if (!url.includes('tiktok.com')) {
        return bot.sendMessage(chatId, '❌ Hantar link TikTok sahaja.');
    }

    const status = await bot.sendMessage(chatId, '⏳ Memproses video...');

    try {
        const result = await downloadTikTok(url, 'mp4');
        await bot.sendVideo(chatId, result.filePath, {
            caption: `🎬 ${result.title}`,
            supports_streaming: true
        });
        await bot.deleteMessage(chatId, status.message_id);
    } catch (error) {
        await bot.editMessageText(`❌ Gagal: ${error.message}`, {
            chat_id: chatId,
            message_id: status.message_id
        });
    }
});

bot.onText(/\/status/, (msg) => {
    bot.sendMessage(msg.chat.id, `✅ BOT AKTIF\n🕒 ${new Date().toLocaleString()}`);
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/') || !text.includes('tiktok.com')) return;

    const status = await bot.sendMessage(chatId, '⏳ Memproses audio...');

    try {
        const result = await downloadTikTok(text, 'mp3');
        await bot.sendAudio(chatId, result.filePath, {
            caption: `🎵 ${result.title}`,
            title: result.title
        });
        await bot.deleteMessage(chatId, status.message_id);
    } catch (error) {
        await bot.editMessageText(
            `❌ Gagal: ${error.message}`,
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
console.log('📌 Hantar link → MP3 (cepat) | /mp4 [link] → MP4 (cepat)');
