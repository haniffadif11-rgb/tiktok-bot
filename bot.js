const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ================== TOKEN BOT ==================
const TOKEN = '8823917633:AAE5uhfmXJNrRFBi4-emN8Er2jiXhnFO6oc';

// ================== BUAT BOT ==================
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🎵 @Mp3titkok_bot AKTIF!');
console.log('📌 Hantar link TikTok untuk download MP3 atau MP4');

// ================== FUNGSI DOWNLOAD ==================
function downloadWithYtDlp(url, format = 'mp3') {
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
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
🎵 @Mp3titkok_bot 🎵

Tukar video TikTok ke MP3 atau MP4!

📌 CARA GUNA:
• Hantar link TikTok → dapat MP3 (audio)
• /mp4 [link] → dapat MP4 (video)

CONTOH:
https://www.tiktok.com/@user/video/123456789
/mp4 https://www.tiktok.com/@user/video/123456789

⚡ Cepat & Percuma!
`);
});

// /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
📖 BANTUAN @Mp3titkok_bot

Hantar link TikTok terus ke chat → dapat MP3
/mp4 [link] → dapat MP4 (video)

PERINTAH:
/start → Mulakan bot
/help → Bantuan ini
/mp4 → Download video MP4
/status → Cek status bot
/about → Info bot
`);
});

// /mp4 - Download video
bot.onText(/\/mp4 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();

    if (!url.includes('tiktok.com')) {
        return bot.sendMessage(chatId, '❌ Sila hantar link TikTok yang sah.');
    }

    const statusMsg = await bot.sendMessage(chatId, '⏳ Memproses video...');

    try {
        const result = await downloadWithYtDlp(url, 'mp4');
        await bot.sendVideo(chatId, result.filePath, {
            caption: '🎬 TikTok Video',
            supports_streaming: true
        });
        fs.unlink(result.filePath, () => {});
        await bot.deleteMessage(chatId, statusMsg.message_id);
    } catch (error) {
        await bot.editMessageText(
            `❌ Gagal: ${error.message}`,
            { chat_id: chatId, message_id: statusMsg.message_id }
        );
    }
});

// /status
bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
✅ BOT AKTIF
🎵 TikTok MP3/MP4 Downloader
📱 @Mp3titkok_bot
🕒 ${new Date().toLocaleString()}
`);
});

// /about
bot.onText(/\/about/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
🎵 @Mp3titkok_bot v3.0

Support:
• MP3 (audio) - hantar link sahaja
• MP4 (video) - guna /mp4

Dibuat untuk muat turun media dari TikTok.
`);
});

// ================== HANDLE LINK TIKTOK (AUTO MP3) ==================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    if (!text.includes('tiktok.com')) {
        return;
    }

    const statusMsg = await bot.sendMessage(chatId, '⏳ Memproses link... (MP3)');

    try {
        const result = await downloadWithYtDlp(text, 'mp3');
        await bot.sendAudio(chatId, result.filePath, {
            caption: '🎵 TikTok Audio',
            title: 'TikTok Audio'
        });
        fs.unlink(result.filePath, () => {});
        await bot.deleteMessage(chatId, statusMsg.message_id);
    } catch (error) {
        console.error('Error:', error.message);
        await bot.editMessageText(
            `❌ Gagal memproses link.\n\nKemungkinan:\n• Video private\n• Link tidak sah\n• Server sibuk`,
            {
                chat_id: chatId,
                message_id: statusMsg.message_id
            }
        );
    }
});

console.log('✅ @Mp3titkok_bot siap!');
console.log('📌 Hantar link → MP3 | /mp4 [link] → MP4');

