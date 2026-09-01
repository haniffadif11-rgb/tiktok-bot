const { default: TelegramBot } = require('node-telegram-bot-api');
const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');

// ================== TOKEN ==================
const TOKEN = '8823917633:AAE5uhfmXJNrRFBi4-emN8Er2jiXhnFO6oc';

// ================== BUAT BOT ==================
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🎵 @Mp3titkok_bot AKTIF!');

// ================== FUNGSI DOWNLOAD GUNA YT-DLP ==================
function downloadTikTok(url, format = 'mp3') {
    return new Promise((resolve, reject) => {
        const tmpDir = os.tmpdir();
        const jobId = Date.now();
        const ext = format === 'mp3' ? 'mp3' : 'mp4';
        const outFile = path.join(tmpDir, `${jobId}.${ext}`);

        let args = [];
        if (format === 'mp3') {
            args = [
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '0',
                '-o', outFile,
                url
            ];
        } else {
            args = [
                '-f', 'mp4',
                '-o', outFile,
                url
            ];
        }

        const ytdlp = spawn('yt-dlp', args);
        let errorOutput = '';

        ytdlp.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        ytdlp.on('close', (code) => {
            if (code !== 0 || !fs.existsSync(outFile)) {
                console.error('yt-dlp error:', errorOutput);
                return reject(new Error('Gagal muat turun.'));
            }

            const fileSize = fs.statSync(outFile).size;
            if (fileSize < 10000) {
                fs.unlinkSync(outFile);
                return reject(new Error('File terlalu kecil/rosak.'));
            }

            resolve({
                filePath: outFile,
                fileName: `${jobId}.${ext}`
            });
        });
    });
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
        const result = await downloadTikTok(url, 'mp4');
        await bot.sendVideo(chatId, result.filePath, { 
            caption: '🎬 TikTok Video',
            supports_streaming: true
        });
        fs.unlink(result.filePath, () => {});
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
        const result = await downloadTikTok(text, 'mp3');
        await bot.sendAudio(chatId, result.filePath, { 
            caption: '🎵 TikTok Audio',
            title: 'TikTok Audio'
        });
        fs.unlink(result.filePath, () => {});
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

app.listen(port, () => {
    console.log(`Fake web server running on port ${port}`);
});

console.log('✅ @Mp3titkok_bot siap!');
console.log('📌 Hantar link → MP3 | /mp4 [link] → MP4');
