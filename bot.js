const { default: TelegramBot } = require('node-telegram-bot-api');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ========== TOKEN BOT ==========
// GANTI DENGAN TOKEN DARI @BotFather
const TOKEN = '8628863096:AAF0eKUbT2B3O2MK7qd5gbCYTqmnijVoFz8';

// ========== BUAT BOT ==========
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('✅ BOT AKTIF!');

// ========== FUNGSI DOWNLOAD ==========
function downloadTikTok(url, format = 'mp3') {
    return new Promise((resolve, reject) => {
        const tmpDir = os.tmpdir();
        const jobId = Date.now();
        const ext = format === 'mp3' ? 'mp3' : 'mp4';
        const outFile = path.join(tmpDir, `${jobId}.${ext}`);

        let args = [];
        if (format === 'mp3') {
            args = ['--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0', '-o', outFile, url];
        } else {
            args = ['-f', 'mp4', '-o', outFile, url];
        }

        const ytdlp = spawn('yt-dlp', args);
        let errorOutput = '';

        ytdlp.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        ytdlp.on('close', (code) => {
            if (code !== 0 || !fs.existsSync(outFile)) {
                return reject(new Error('Gagal muat turun.'));
            }
            resolve({ filePath: outFile, fileName: `${jobId}.${ext}` });
        });
    });
}

// ========== PERINTAH BOT ==========

// /start
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
🎵 BOT TIKTOK MP3

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
        await bot.sendVideo(chatId, result.filePath, { caption: '🎬 TikTok Video' });
        fs.unlink(result.filePath, () => {});
        await bot.deleteMessage(chatId, status.message_id);
    } catch (error) {
        await bot.editMessageText(`❌ Gagal: ${error.message}`, { chat_id: chatId, message_id: status.message_id });
    }
});

// Handle link TikTok → MP3
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/') || !text.includes('tiktok.com')) return;

    const status = await bot.sendMessage(chatId, '⏳ Memproses audio...');

    try {
        const result = await downloadTikTok(text, 'mp3');
        await bot.sendAudio(chatId, result.filePath, { caption: '🎵 TikTok Audio' });
        fs.unlink(result.filePath, () => {});
        await bot.deleteMessage(chatId, status.message_id);
    } catch (error) {
        await bot.editMessageText(`❌ Gagal: ${error.message}`, { chat_id: chatId, message_id: status.message_id });
    }
});

console.log('✅ @Mp3titkok_bot siap!');
