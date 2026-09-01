const TelegramBot = require('node-telegram-bot-api');
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

        console.log(`Running yt-dlp with args: ${args.join(' ')}`);
        const ytdlp = spawn('yt-dlp', args);
        let errorOutput = '';

        ytdlp.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.log('yt-dlp stderr:', data.toString());
        });

        ytdlp.stdout.on('data', (data) => {
            console.log('yt-dlp stdout:', data.toString());
        });

        ytdlp.on('close', (code) => {
            if (code !== 0) {
                console.error('yt-dlp error code:', code);
                console.error('yt-dlp error output:', errorOutput);
                return reject(new Error('Gagal muat turun. Sila cuba link lain.'));
            }

            if (!fs.existsSync(outFile)) {
                return reject(new Error('File tidak dijumpai selepas download.'));
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

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
🎵 @Mp3titkok_bot

Hantar link TikTok → dapat MP3
/mp4 [link] → dapat MP4
/help → Bantuan
`);
});

bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, `
📖 BANTUAN
Hantar link TikTok → MP3
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

    const status = await bot.sendMessage(chatId, '⏳ Memproses video... (ini mungkin mengambil masa)');

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

bot.onText(/\/status/, (msg) => {
    bot.sendMessage(msg.chat.id, `✅ BOT AKTIF\n🕒 ${new Date().toLocaleString()}`);
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/') || !text.includes('tiktok.com')) return;

    const status = await bot.sendMessage(chatId, '⏳ Memproses audio... (ini mungkin mengambil masa)');

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
            `❌ Gagal memproses link.\n\nKemungkinan:\n• Video private\n• Link tidak sah\n• Server sibuk\n\nError: ${error.message}`,
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
