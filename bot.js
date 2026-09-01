const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// ================== TOKEN ==================
const TOKEN = '8628863096:AAF0eKUbT2B3O2MK7qd5gbCYTqmnijVoFz8';

// ================== BUAT BOT ==================
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🎵 @Mp3titkok_bot AKTIF!');

// ================== FUNGSI DOWNLOAD GUNA API ==================
async function downloadTikTokAPI(url) {
    try {
        const apiUrl = `https://api.bliztik.web.id/apitiktok?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        const data = response.data;

        if (data && data.audio) {
            return {
                audioUrl: data.audio,
                title: data.title || 'TikTok Audio'
            };
        } else if (data && data.video) {
            return {
                videoUrl: data.video,
                title: data.title || 'TikTok Video'
            };
        } else {
            throw new Error('Media tidak dijumpai.');
        }
    } catch (error) {
        console.error('API Error:', error.message);
        throw new Error('Gagal memproses link.');
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

// /mp4 - Download video
bot.onText(/\/mp4 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();

    if (!url.includes('tiktok.com')) {
        return bot.sendMessage(chatId, '❌ Link TikTok sahaja.');
    }

    const status = await bot.sendMessage(chatId, '⏳ Memproses video...');

    try {
        const result = await downloadTikTokAPI(url);
        if (result.videoUrl) {
            await bot.sendVideo(chatId, result.videoUrl, { caption: `🎬 ${result.title}` });
        } else {
            throw new Error('Video tidak dijumpai.');
        }
        await bot.deleteMessage(chatId, status.message_id);
    } catch (error) {
        await bot.editMessageText(`❌ Gagal: ${error.message}`, { chat_id: chatId, message_id: status.message_id });
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
            await bot.sendAudio(chatId, result.audioUrl, { caption: `🎵 ${result.title}` });
        } else {
            throw new Error('Audio tidak dijumpai.');
        }
        await bot.deleteMessage(chatId, status.message_id);
    } catch (error) {
        await bot.editMessageText(`❌ Gagal: ${error.message}`, { chat_id: chatId, message_id: status.message_id });
    }
});

// ================== FAKE WEB SERVER UNTUK RENDER ==================
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🎵 @Mp3titkok_bot is running!');
});

app.listen(port, () => {
    console.log(`Fake web server running on port ${port}`);
});

console.log('✅ @Mp3titkok_bot siap!');
