const TelegramBot = require('node-telegram-bot-api');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const axios = require('axios');

// ================== TOKEN ==================
const TOKEN = '8823917633:AAE5uhfmXJNrRFBi4-emN8Er2jiXhnFO6oc';

// ================== BUAT BOT ==================
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🎵 @Mp3titkok_bot AKTIF!');

// ================== API LIST (CEPAT) ==================
const API_LIST = [
    {
        name: 'TikWM',
        url: (url) => `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
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
    {
        name: 'Snaptik',
        url: (url) => `https://api.snaptik.app/api/download?url=${encodeURIComponent(url)}`,
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

// ================== FUNGSI DOWNLOAD API (CEPAT) ==================
async function downloadWithAPI(url) {
    for (const api of API_LIST) {
        try {
            console.log(`📡 Trying API: ${api.name}`);
            const response = await axios.get(api.url(url), {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const result = api.extractor(response.data);
            if (result && (result.audio || result.video)) {
                console.log(`✅ API ${api.name} berjaya!`);
                return result;
            }
        } catch (error) {
            console.log(`❌ API ${api.name} failed: ${error.message}`);
        }
    }
    return null;
}

// ================== FUNGSI YT-DLP (LAMBAT TAPI STABIL) ==================
function downloadWithYtDlp(url, format = 'mp3') {
    return new Promise((resolve, reject) => {
        const tmpDir = os.tmpdir();
        const jobId = Date.now();
        const ext = format === 'mp3' ? 'mp3' : 'mp4';
        const outFile = path.join(tmpDir, `${jobId}.${ext}`);

        // OPTIMIZED yt-dlp args
        let args = [
            '--no-check-certificate',
            '--no-warnings',
            '--quiet'
        ];

        if (format === 'mp3') {
            args = args.concat([
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '2', // Lower quality = faster
                '-o', outFile,
                url
            ]);
        } else {
            args = args.concat([
                '-f', 'mp4',
                '-o', outFile,
                url
            ]);
        }

        console.log(`⚡ Running yt-dlp (optimized)...`);
        const ytdlp = spawn('yt-dlp', args);
        let errorOutput = '';

        ytdlp.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        ytdlp.on('close', (code) => {
            if (code !== 0 || !fs.existsSync(outFile)) {
                return reject(new Error('Download failed'));
            }
            const fileSize = fs.statSync(outFile).size;
            if (fileSize < 10000) {
                fs.unlinkSync(outFile);
                return reject(new Error('File terlalu kecil'));
            }
            resolve({ filePath: outFile });
        });
    });
}

// ================== FUNGSI UTAMA (HYBRID) ==================
async function downloadTikTok(url, format = 'mp3') {
    // Step 1: Try API (cepat)
    console.log('🚀 Trying API first...');
    const apiResult = await downloadWithAPI(url);
    
    if (apiResult) {
        const mediaUrl = format === 'mp3' ? apiResult.audio : apiResult.video;
        if (mediaUrl) {
            console.log(`✅ Using API result for ${format}`);
            return {
                filePath: mediaUrl,
                isUrl: true,
                title: apiResult.title || 'TikTok'
            };
        }
    }

    // Step 2: Fallback to yt-dlp (lambat tapi stabil)
    console.log(`⏳ Fallback to yt-dlp for ${format}...`);
    const result = await downloadWithYtDlp(url, format);
    return {
        filePath: result.filePath,
        isUrl: false,
        title: 'TikTok'
    };
}

// ================== PERINTAH BOT ==================

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
🎵 @Mp3titkok_bot

Hantar link TikTok → dapat MP3 (cepat!)
/mp4 [link] → dapat MP4 (cepat!)
/help → Bantuan
`);
});

bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, `
📖 BANTUAN
Hantar link → MP3 (API dulu, yt-dlp backup)
/mp4 [link] → MP4 (API dulu, yt-dlp backup)
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
        if (result.isUrl) {
            await bot.sendVideo(chatId, result.filePath, {
                caption: `🎬 ${result.title}`,
                supports_streaming: true
            });
        } else {
            await bot.sendVideo(chatId, result.filePath, {
                caption: '🎬 TikTok Video',
                supports_streaming: true
            });
            fs.unlink(result.filePath, () => {});
        }
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
        if (result.isUrl) {
            await bot.sendAudio(chatId, result.filePath, {
                caption: `🎵 ${result.title}`,
                title: result.title
            });
        } else {
            await bot.sendAudio(chatId, result.filePath, {
                caption: '🎵 TikTok Audio',
                title: 'TikTok Audio'
            });
            fs.unlink(result.filePath, () => {});
        }
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
