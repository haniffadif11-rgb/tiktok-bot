const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');

// ================== TOKEN ==================
const TOKEN = process.env.TOKEN || '8823917633:AAECyeZnDmIKGWzucHscYnprvfe_P92hl4k';

// ================== API KEYS ==================
const HASDATA_API_KEY = process.env.HASDATA_API_KEY || '079afdcc-5489-47bf-ad8a-582d4ceb29c7';
const SYLVATICA_API_KEY = 'sylva-0JAIzVjb';

// ================== GAMBAR UNTUK BOT ==================
const BOT_IMAGE = 'https://ibb.co/gZgrYtnP';

// ================== BUAT BOT ==================
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🎵 @Mp3titkok_bot AKTIF! (Vernux Project - Final)');

// ================== FUNGSI TIKTOK ==================
async function downloadTikTok(url, format = 'mp3') {
    const API_LIST = [
        {
            name: 'TikWM',
            url: (u) => `https://www.tikwm.com/api/?url=${encodeURIComponent(u)}`,
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
            name: 'TikMate',
            url: (u) => `https://tikmate.cc/api/download?url=${encodeURIComponent(u)}`,
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
        {
            name: 'SSSTik',
            url: (u) => `https://api.ssstik.com/api/download?url=${encodeURIComponent(u)}`,
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

    for (const api of API_LIST) {
        try {
            console.log(`📡 Trying TikTok API: ${api.name}...`);
            const response = await axios.get(api.url(url), {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const result = api.extractor(response.data);
            const mediaUrl = format === 'mp3' ? result?.audio : result?.video;
            if (mediaUrl) {
                console.log(`✅ TikTok API ${api.name} berjaya!`);
                return {
                    filePath: mediaUrl,
                    isUrl: true,
                    title: result?.title || 'TikTok'
                };
            }
        } catch (error) {
            console.log(`❌ TikTok API ${api.name} failed: ${error.message}`);
        }
    }
    throw new Error('Semua API TikTok gagal. Cuba link lain.');
}

// ================== FUNGSI YOUTUBE (API VEVIOS - FREE & STABIL) ==================
async function downloadYouTube(url, format = 'mp3') {
    const API_LIST = [
        // API 1: Vevioz (free, stabil)
        {
            name: 'Vevioz',
            url: (u, f) => `https://api.vevioz.com/api/button/${f === 'mp3' ? 'mp3' : 'mp4'}/${encodeURIComponent(u)}`,
            extractor: (data) => {
                if (data && data.download) {
                    return {
                        url: data.download,
                        title: data.title || 'YouTube'
                    };
                }
                return null;
            }
        },
        // API 2: YT-Downloader (backup)
        {
            name: 'YTDownloader',
            url: (u, f) => `https://yt-downloader.vercel.app/api/download?url=${encodeURIComponent(u)}&type=${f === 'mp3' ? 'audio' : 'video'}`,
            extractor: (data) => {
                if (data && data.downloadUrl) {
                    return {
                        url: data.downloadUrl,
                        title: data.title || 'YouTube'
                    };
                }
                return null;
            }
        },
        // API 3: Y2Mate (backup 2)
        {
            name: 'Y2Mate',
            url: (u) => `https://y2mate.com/api/convert?url=${encodeURIComponent(u)}`,
            extractor: (data) => {
                if (data && data.downloadUrl) {
                    return {
                        url: data.downloadUrl,
                        title: data.title || 'YouTube'
                    };
                }
                return null;
            }
        }
    ];

    for (const api of API_LIST) {
        try {
            console.log(`📡 Trying YouTube API: ${api.name}...`);
            const response = await axios.get(api.url(url, format), {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });
            const result = api.extractor(response.data);
            if (result && result.url) {
                console.log(`✅ YouTube API ${api.name} berjaya!`);
                return {
                    filePath: result.url,
                    isUrl: true,
                    title: result.title || 'YouTube'
                };
            }
        } catch (error) {
            console.log(`❌ YouTube API ${api.name} failed: ${error.message}`);
        }
    }
    throw new Error('Semua API YouTube gagal. Cuba link lain.');
}

// ================== URL CHECKER ==================
async function checkURL(url) {
    try {
        const response = await axios.post(
            'https://urlhaus-api.abuse.ch/v1/url/',
            new URLSearchParams({ url: url }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            }
        );
        
        const data = response.data;
        
        if (data.query_status === 'no_results') {
            return {
                status: 'clean',
                message: '✅ URL ini SELAMAT — tiada rekod malware.'
            };
        }
        
        if (data.query_status === 'ok' && data.url) {
            return {
                status: 'malware',
                message: `⚠️ URL ini MALWARE / PHISHING!`,
                threat: data.threat || 'Unknown',
                tags: data.tags || [],
                first_seen: data.firstseen || 'Unknown',
                reporter: data.reporter || 'Unknown',
                url: data.url
            };
        }
        
        return {
            status: 'unknown',
            message: '❌ Gagal check URL. Cuba link lain.'
        };
    } catch (error) {
        console.error('URL Check Error:', error.message);
        return {
            status: 'error',
            message: '❌ Error check URL. Cuba lagi nanti.'
        };
    }
}

// ================== EXPAND SHORT URL ==================
async function expandURL(shortUrl) {
    try {
        const response = await axios.get(shortUrl, {
            maxRedirects: 5,
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        return response.request.res.responseUrl || shortUrl;
    } catch (error) {
        console.log('Expand URL error:', error.message);
        return shortUrl;
    }
}

// ================== IQC ==================
async function createiPhoneQuote(text, sender = 'Me', time = '12:00', battery = '85%') {
    try {
        const apiUrl = `https://quotefancy.com/api/quote?text=${encodeURIComponent(text)}&author=${encodeURIComponent(sender)}`;
        const response = await axios.get(apiUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data && response.data.image) {
            return {
                imageUrl: response.data.image,
                text: text,
                sender: sender,
                time: time,
                battery: battery
            };
        } else {
            throw new Error('API tidak memberi gambar.');
        }
    } catch (error) {
        console.error('IQC API Error:', error.message);
        throw new Error('Gagal create iPhone quote. Cuba lagi nanti.');
    }
}

// ================== STALK TIKTOK ==================
async function stalkTikTokHasData(username) {
    try {
        const cleanUsername = username.replace('@', '');
        
        const response = await axios.get('https://api.hasdata.com/scrape/tiktok/profile', {
            params: {
                handle: cleanUsername
            },
            headers: {
                'x-api-key': HASDATA_API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        
        const data = response.data;
        console.log('HasData Raw Response:', JSON.stringify(data, null, 2));
        
        if (data && data.profile && data.profile.username) {
            const profile = data.profile;
            
            return {
                username: profile.username || username,
                nickname: profile.nickname || 'Tiada nama',
                bio: profile.biography || 'Tiada bio',
                avatar: profile.avatarUrl || '',
                followerCount: profile.followers || 0,
                followingCount: profile.friends || 0,
                heartCount: profile.likes || 0,
                videoCount: profile.videos || 0,
                isVerified: profile.verified || false,
                createTime: profile.createTime || 'Unknown',
                bioLink: profile.bioLink || '',
                source: 'HasData'
            };
        } else {
            throw new Error('Profil TikTok tidak dijumpai.');
        }
    } catch (error) {
        console.error('HasData Error:', error.response?.data || error.message);
        
        if (error.response && error.response.status === 401) {
            throw new Error('API key tidak sah. Dapatkan key baru dari hasdata.com');
        }
        
        console.log('HasData fail, falling back to TikWM...');
        return await stalkTikTokTikWM(username);
    }
}

async function stalkTikTokTikWM(username) {
    try {
        const cleanUsername = username.replace('@', '');
        
        const response = await axios.get(`https://www.tikwm.com/api/user/?username=${cleanUsername}`, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const data = response.data;
        console.log('TikWM Response:', JSON.stringify(data).substring(0, 300));
        
        if (data && data.code === 0 && data.data && data.data.user) {
            const user = data.data.user;
            const stats = data.data.stats || {};
            
            return {
                username: user.uniqueId || username,
                nickname: user.nickname || 'Tiada nama',
                bio: user.signature || 'Tiada bio',
                avatar: user.avatar || '',
                followerCount: stats.followerCount || 0,
                followingCount: stats.followingCount || 0,
                heartCount: stats.heartCount || 0,
                videoCount: stats.videoCount || 0,
                isVerified: user.verified || false,
                createTime: 'Unknown',
                bioLink: '',
                source: 'TikWM (fallback)'
            };
        } else {
            throw new Error('Profil TikTok tidak dijumpai.');
        }
    } catch (error) {
        console.error('TikWM Stalk Error:', error.message);
        throw new Error('Gagal mendapatkan data profil. Cuba username lain.');
    }
}

async function stalkTikTok(username) {
    return await stalkTikTokHasData(username);
}

// ================== FUNGSI LYRICS (SYLVATICA) ==================
async function getLyrics(query) {
    try {
        const apiUrl = `https://sylvatica.my.id/api/search/lyrics?q=${encodeURIComponent(query)}&apikey=${SYLVATICA_API_KEY}`;
        console.log(`📡 Trying Sylvatica API...`);
        
        const response = await axios.get(apiUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const data = response.data;
        console.log('Sylvatica Response:', JSON.stringify(data).substring(0, 500));
        
        if (data && data.status === true && data.result && data.result.length > 0) {
            const firstResult = data.result[0];
            let lyrics = '';
            let title = firstResult.trackName || firstResult.name || query;
            let artist = firstResult.artistName || 'Unknown';
            
            if (firstResult.plainLyrics) {
                lyrics = firstResult.plainLyrics;
            } else if (firstResult.lyricsfile && firstResult.lyricsfile.plain) {
                lyrics = firstResult.lyricsfile.plain;
            } else if (firstResult.syncedLyrics) {
                lyrics = firstResult.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2}\]\s*/g, '');
            }
            
            if (lyrics) {
                return {
                    title: title,
                    artist: artist,
                    lyrics: lyrics,
                    source: 'Sylvatica'
                };
            } else {
                throw new Error('Lirik tidak dijumpai dalam response.');
            }
        } else {
            throw new Error(data?.message || 'Lirik tidak dijumpai.');
        }
    } catch (error) {
        console.error('Sylvatica Error:', error.response?.data || error.message);
        
        // Fallback: lyrics.ovh
        console.log('🔄 Sylvatica failed, trying lyrics.ovh...');
        try {
            const parts = query.split(/ - | by | By /i);
            let title = query;
            let artist = '';

            if (parts.length > 1) {
                title = parts[0].trim();
                artist = parts[1].trim();
            }

            if (artist) {
                const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, {
                    timeout: 10000
                });
                
                if (response.data && response.data.lyrics) {
                    return {
                        title: `${title} - ${artist}`,
                        artist: artist,
                        lyrics: response.data.lyrics,
                        source: 'lyrics.ovh (fallback)'
                    };
                }
            }
            
            const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(query)}`, {
                timeout: 10000
            });
            
            if (response.data && response.data.lyrics) {
                return {
                    title: query,
                    artist: 'Unknown',
                    lyrics: response.data.lyrics,
                    source: 'lyrics.ovh (fallback)'
                };
            }
        } catch (fallbackError) {
            console.log('❌ Fallback failed:', fallbackError.message);
        }
        
        throw new Error('Lirik tidak dijumpai. Cuba judul lain.');
    }
}

// ================== FUNGSI TEMP MAIL ==================
async function createTempMail() {
    try {
        const response = await axios.get('https://api.temp-mail.io/api/v3/email/new', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data && response.data.email) {
            return {
                email: response.data.email,
                inbox: []
            };
        }
        throw new Error('Gagal cipta email.');
    } catch (error) {
        console.error('Temp Mail Error:', error.message);
        
        const randomName = Math.random().toString(36).substring(2, 10);
        const email = `${randomName}@tempmail.com`;
        return {
            email: email,
            inbox: []
        };
    }
}

async function checkTempMail(email) {
    try {
        const username = email.split('@')[0];
        const domain = email.split('@')[1];
        
        if (domain === 'temp-mail.io' || domain === 'tempmail.com') {
            const response = await axios.get(`https://api.temp-mail.io/api/v3/email/${username}/messages`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            return response.data || [];
        } else {
            const response = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${username}&domain=${domain}`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            });
            return response.data || [];
        }
    } catch (error) {
        console.error('Check Mail Error:', error.message);
        return [];
    }
}

// ================== MENU UTAMA ==================
const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '🎵 TikTok MP3', callback_data: 'tiktok_mp3' },
                { text: '🎬 TikTok MP4', callback_data: 'tiktok_mp4' }
            ],
            [
                { text: '🎵 YouTube MP3', callback_data: 'yt_mp3' },
                { text: '🎬 YouTube MP4', callback_data: 'yt_mp4' }
            ],
            [
                { text: '🛡️ Check URL', callback_data: 'check_url' },
                { text: '📱 IQC', callback_data: 'iqc' }
            ],
            [
                { text: '🎵 Lyrics', callback_data: 'lyrics' },
                { text: '👤 Stalk TikTok', callback_data: 'stalk' }
            ],
            [
                { text: '📧 Temp Mail', callback_data: 'tempmail' },
                { text: '📊 Status', callback_data: 'status' }
            ],
            [
                { text: '❓ Help', callback_data: 'help' }
            ]
        ]
    }
};

// ================== HANDLE CALLBACK ==================
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    await bot.answerCallbackQuery(query.id);
    
    switch(data) {
        case 'tiktok_mp3':
            await bot.sendMessage(chatId, '📌 Hantar link TikTok untuk dapatkan MP3.\n\nContoh: https://vm.tiktok.com/xxxxx');
            break;
        case 'tiktok_mp4':
            await bot.sendMessage(chatId, '📌 Hantar link TikTok untuk dapatkan MP4.\n\nFormat: /mp4 [link]\nContoh: /mp4 https://vm.tiktok.com/xxxxx');
            break;
        case 'yt_mp3':
            await bot.sendMessage(chatId, '📌 Hantar link YouTube untuk dapatkan MP3.\n\nFormat: /ytmp3 [link]\nContoh: /ytmp3 https://youtu.be/xxxxx');
            break;
        case 'yt_mp4':
            await bot.sendMessage(chatId, '📌 Hantar link YouTube untuk dapatkan MP4.\n\nFormat: /ytmp4 [link]\nContoh: /ytmp4 https://youtu.be/xxxxx');
            break;
        case 'check_url':
            await bot.sendMessage(chatId, '📌 Hantar URL untuk check malware/phishing.\n\nFormat: /check [url]\nContoh: /check https://example.com');
            break;
        case 'iqc':
            await bot.sendMessage(chatId, '📱 iPhone Quote Creator\n\nFormat: /iqc "quote" | "sender" | "time" | "battery"\n\nContoh: /iqc "Hello World!" | "XSO" | "9:41 PM" | "87%"');
            break;
        case 'lyrics':
            await bot.sendMessage(chatId, '📌 Hantar judul lagu atau artis.\n\nFormat: /lyrics [judul lagu]\nContoh: /lyrics ariana grande bye');
            break;
        case 'stalk':
            await bot.sendMessage(chatId, '📌 Hantar username TikTok untuk stalk.\n\nFormat: /stalk [username]\nContoh: /stalk tiktok');
            break;
        case 'tempmail':
            await bot.sendMessage(chatId, '📧 Temp Mail\n\n/tempmail - Cipta email sementara\n/checkmail [email] - Check inbox');
            break;
        case 'status':
            const statusCaption = `
╔═══════════════════════════╗
║  📊 STATUS BOT
╚═══════════════════════════╝

🕒 ${new Date().toLocaleString()}

🎵 TikTok: ✅
🎬 YouTube: ✅ (Vevioz API)
🛡️ URL Checker: ✅
📱 IQC: ✅
🎵 Lyrics: ✅ (Sylvatica)
👤 Stalk TikTok: ✅ (HasData + TikWM)
📧 Temp Mail: ✅ (temp-mail.io)

🚀 Vernux Project
`;
            try {
                await bot.sendPhoto(chatId, BOT_IMAGE, { 
                    caption: statusCaption
                });
            } catch (error) {
                await bot.sendMessage(chatId, statusCaption);
            }
            break;
        case 'help':
            const helpCaption = `
╔═══════════════════════════╗
║  📖 TUTORIAL VERNUX
╚═══════════════════════════╝

🎵 TIKTOK:
Hantar link TikTok → MP3
/mp4 [link] → MP4

🎬 YOUTUBE:
/ytmp3 [link] → MP3
/ytmp4 [link] → MP4

🛡️ URL CHECKER:
/check [url] → Check malware

📱 IQC:
/iqc "quote" | "sender" | "time" | "battery"

🎵 LYRICS:
/lyrics [judul lagu] → Cari lirik

👤 STALK TIKTOK:
/stalk [username] → Dapatkan info profil

📧 TEMP MAIL:
/tempmail → Cipta email sementara
/checkmail [email] → Check inbox

🚀 Vernux Project
`;
            try {
                await bot.sendPhoto(chatId, BOT_IMAGE, { 
                    caption: helpCaption
                });
            } catch (error) {
                await bot.sendMessage(chatId, helpCaption);
            }
            break;
        default:
            await bot.sendMessage(chatId, '❌ Pilihan tidak dikenali.');
    }
});

// ================== PERINTAH ==================

// /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    
    const caption = `
╔═══════════════════════════╗
║  🚀 VERNUX PROJECT  🚀    ║
╚═══════════════════════════╝

Pilih menu di bawah untuk mula:
`;
    
    try {
        await bot.sendPhoto(chatId, BOT_IMAGE, { 
            caption: caption,
            ...mainMenu
        });
    } catch (error) {
        await bot.sendMessage(chatId, caption, mainMenu);
    }
});

// /menu
bot.onText(/\/menu/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '📌 Pilih menu di bawah:', mainMenu);
});

// /help
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    const caption = `
╔═══════════════════════════╗
║  📖 TUTORIAL VERNUX
╚═══════════════════════════╝

🎵 TIKTOK:
Hantar link TikTok → MP3
/mp4 [link] → MP4

🎬 YOUTUBE:
/ytmp3 [link] → MP3
/ytmp4 [link] → MP4

🛡️ URL CHECKER:
/check [url] → Check malware

📱 IQC:
/iqc "quote" | "sender" | "time" | "battery"

🎵 LYRICS:
/lyrics [judul lagu] → Cari lirik

👤 STALK TIKTOK:
/stalk [username] → Dapatkan info profil

📧 TEMP MAIL:
/tempmail → Cipta email sementara
/checkmail [email] → Check inbox

🚀 Vernux Project
`;
    
    try {
        await bot.sendPhoto(chatId, BOT_IMAGE, { 
            caption: caption
        });
    } catch (error) {
        await bot.sendMessage(chatId, caption);
    }
});

// ================== PERINTAH TIKTOK ==================

// /mp4 - TikTok video
bot.onText(/\/mp4 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();

    if (!url.includes('tiktok.com')) {
        return bot.sendMessage(chatId, '❌ Hantar link TikTok sahaja.');
    }

    const status = await bot.sendMessage(chatId, '⏳ Memproses video TikTok...');

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

// ================== PERINTAH YOUTUBE ==================

// /ytmp3 - YouTube audio
bot.onText(/\/ytmp3 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        return bot.sendMessage(chatId, '❌ Hantar link YouTube sahaja.');
    }

    const status = await bot.sendMessage(chatId, '⏳ Memproses audio YouTube...');

    try {
        const result = await downloadYouTube(url, 'mp3');
        await bot.sendAudio(chatId, result.filePath, {
            caption: `🎵 ${result.title}`,
            title: result.title
        });
        await bot.deleteMessage(chatId, status.message_id);
    } catch (error) {
        await bot.editMessageText(`❌ Gagal: ${error.message}`, {
            chat_id: chatId,
            message_id: status.message_id
        });
    }
});

// /ytmp4 - YouTube video
bot.onText(/\/ytmp4 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        return bot.sendMessage(chatId, '❌ Hantar link YouTube sahaja.');
    }

    const status = await bot.sendMessage(chatId, '⏳ Memproses video YouTube...');

    try {
        const result = await downloadYouTube(url, 'mp4');
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

// ================== PERINTAH URL CHECKER ==================

// /check - URL Malware Checker
bot.onText(/\/check (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let url = match[1].trim();
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return bot.sendMessage(chatId, '❌ Sila masukkan URL lengkap (contoh: https://example.com)');
    }
    
    const statusMsg = await bot.sendMessage(chatId, '🔍 Expanding short URL...');
    
    try {
        const fullUrl = await expandURL(url);
        console.log(`Expanded: ${url} -> ${fullUrl}`);
        
        await bot.editMessageText('🔍 Checking URL with URLhaus...', {
            chat_id: chatId,
            message_id: statusMsg.message_id
        });
        
        const result = await checkURL(fullUrl);
        
        let report = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃  🔍 URL CHECK REPORT
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📎 Original: ${url}
📎 Full URL: ${fullUrl}
📊 Status: ${result.status}

${result.message}
`;
        
        if (result.status === 'malware') {
            report += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 THREAT: ${result.threat}
🏷️ Tags: ${result.tags.join(', ')}
📅 First Seen: ${result.first_seen}
👤 Reporter: ${result.reporter}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ JANGAN buka link ini!`;
        }
        
        await bot.editMessageText(report, {
            chat_id: chatId,
            message_id: statusMsg.message_id
        });
    } catch (error) {
        console.error('Check Error:', error.message);
        await bot.editMessageText('❌ Error check URL. Cuba lagi nanti.', {
            chat_id: chatId,
            message_id: statusMsg.message_id
        });
    }
});

// ================== PERINTAH IQC ==================

// /iqc - iPhone Quote Creator
bot.onText(/\/iqc (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1].split('|').map(arg => arg.trim());
    
    const text = args[0] || 'Hello World!';
    const sender = args[1] || 'Me';
    const time = args[2] || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const battery = args[3] || '85%';
    
    const statusMsg = await bot.sendMessage(chatId, '📱 Creating iPhone quote...');
    
    try {
        const result = await createiPhoneQuote(text, sender, time, battery);
        
        await bot.sendPhoto(chatId, result.imageUrl, {
            caption: `
📱 **iPhone Quote Created**

💬 "${result.text}"
👤 Sender: ${result.sender}
🕒 Time: ${result.time}
🔋 Battery: ${result.battery}

📌 /iqc "quote" | "sender" | "time" | "battery"
💡 Contoh: /iqc "Hello World!" | "XSO" | "9:41 PM" | "87%"
`,
            parse_mode: 'Markdown'
        });
        
        await bot.deleteMessage(chatId, statusMsg.message_id);
    } catch (error) {
        await bot.editMessageText(`❌ Gagal: ${error.message}`, {
            chat_id: chatId,
            message_id: statusMsg.message_id
        });
    }
});

// ================== PERINTAH LYRICS ==================

// /lyrics - Cari lirik
bot.onText(/\/lyrics (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1].trim();
    
    if (!query) {
        return bot.sendMessage(chatId, '❌ Sila masukkan judul lagu atau artis.\nContoh: /lyrics ariana grande bye');
    }
    
    const statusMsg = await bot.sendMessage(chatId, `🔍 Mencari lirik untuk "${query}"...`);

    try {
        const result = await getLyrics(query);
        
        let reply = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃  🎵 LYRICS
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 **${result.title}**
🎤 Artis: ${result.artist || 'Unknown'}
📡 Sumber: ${result.source || 'Sylvatica'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${result.lyrics}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 /lyrics [judul lagu]
💡 Contoh: /lyrics ariana grande bye
`;
        
        if (reply.length > 4096) {
            const lyricsFile = Buffer.from(result.lyrics, 'utf-8');
            await bot.sendDocument(chatId, lyricsFile, {
                filename: `${result.title}.txt`,
                caption: `🎵 Lirik: ${result.title}`
            });
            await bot.deleteMessage(chatId, statusMsg.message_id);
        } else {
            await bot.editMessageText(reply, {
                chat_id: chatId,
                message_id: statusMsg.message_id,
                parse_mode: 'Markdown'
            });
        }
    } catch (error) {
        await bot.editMessageText(`❌ Gagal: ${error.message}`, {
            chat_id: chatId,
            message_id: statusMsg.message_id
        });
    }
});

// ================== PERINTAH STALK ==================

// /stalk - Stalk profil TikTok
bot.onText(/\/stalk (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].trim();
    
    if (!username) {
        return bot.sendMessage(chatId, '❌ Sila masukkan username TikTok.\n\nContoh: /stalk tiktok');
    }
    
    const statusMsg = await bot.sendMessage(chatId, `🔍 Mencari profil @${username}...`);
    
    try {
        const result = await stalkTikTok(username);
        
        let report = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃  👤 STALK TIKTOK
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Username: @${result.username}
📛 Nama: ${result.nickname}
🔗 Bio: ${result.bio || 'Tiada bio'}
${result.isVerified ? '✅ Verified' : '❌ Not Verified'}
${result.bioLink ? `🔗 Link: ${result.bioLink}` : ''}
📅 Sertai: ${result.createTime ? new Date(result.createTime).toLocaleDateString() : 'Unknown'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 STATISTIK:
👥 Pengikut: ${result.followerCount.toLocaleString()}
👣 Mengikuti: ${result.followingCount.toLocaleString()}
❤️ Like Diterima: ${result.heartCount.toLocaleString()}
🎬 Video: ${result.videoCount.toLocaleString()}

🔗 https://tiktok.com/@${result.username}
📡 Sumber: ${result.source}
`;
        
        if (result.avatar) {
            try {
                await bot.sendPhoto(chatId, result.avatar, {
                    caption: report
                });
                await bot.deleteMessage(chatId, statusMsg.message_id);
            } catch (photoError) {
                await bot.editMessageText(report, {
                    chat_id: chatId,
                    message_id: statusMsg.message_id
                });
            }
        } else {
            await bot.editMessageText(report, {
                chat_id: chatId,
                message_id: statusMsg.message_id
            });
        }
    } catch (error) {
        console.error('Stalk Error:', error.message);
        await bot.editMessageText(`❌ Gagal: ${error.message}\n\n💡 Cuba username lain.`, {
            chat_id: chatId,
            message_id: statusMsg.message_id
        });
    }
});

// ================== PERINTAH TEMP MAIL ==================

// /tempmail - Cipta email sementara
bot.onText(/\/tempmail/, async (msg) => {
    const chatId = msg.chat.id;
    const statusMsg = await bot.sendMessage(chatId, '📧 Mencipta email sementara...');
    
    try {
        const result = await createTempMail();
        
        let reply = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃  📧 TEMPORARY EMAIL
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Email: ${result.email}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 /checkmail [email] - Check inbox
💡 Email akan tamat dalam 10 minit
`;
        
        await bot.editMessageText(reply, {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        await bot.editMessageText(`❌ Gagal: ${error.message}`, {
            chat_id: chatId,
            message_id: statusMsg.message_id
        });
    }
});

// /checkmail - Check inbox
bot.onText(/\/checkmail (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const email = match[1].trim();
    
    if (!email.includes('@')) {
        return bot.sendMessage(chatId, '❌ Sila masukkan email yang sah.\n\nContoh: /checkmail abc123@tempmail.com');
    }
    
    const statusMsg = await bot.sendMessage(chatId, `🔍 Mencari mesej untuk ${email}...`);
    
    try {
        const messages = await checkTempMail(email);
        
        if (!messages || messages.length === 0) {
            await bot.editMessageText(`📭 Tiada mesej untuk ${email}\n\n💡 Tunggu beberapa minit, atau hantar email ke alamat ini.`, {
                chat_id: chatId,
                message_id: statusMsg.message_id
            });
            return;
        }
        
        let reply = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃  📥 INBOX
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 ${email}
📊 ${messages.length} mesej

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        
        for (const m of messages.slice(0, 5)) {
            reply += `
📩 From: ${m.from || 'Unknown'}
📌 Subject: ${m.subject || '(No subject)'}
📅 Date: ${m.date || m.timestamp || 'Unknown'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        }
        
        await bot.editMessageText(reply, {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        await bot.editMessageText(`❌ Gagal: ${error.message}`, {
            chat_id: chatId,
            message_id: statusMsg.message_id
        });
    }
});

// ================== PERINTAH STATUS ==================

// /status
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    
    const caption = `
╔═══════════════════════════╗
║  📊 STATUS BOT
╚═══════════════════════════╝

🕒 ${new Date().toLocaleString()}

🎵 TikTok: ✅
🎬 YouTube: ✅ (Vevioz API)
🛡️ URL Checker: ✅
📱 IQC: ✅
🎵 Lyrics: ✅ (Sylvatica)
👤 Stalk TikTok: ✅ (HasData + TikWM)
📧 Temp Mail: ✅ (temp-mail.io)

🚀 Vernux Project
`;
    
    try {
        await bot.sendPhoto(chatId, BOT_IMAGE, { 
            caption: caption
        });
    } catch (error) {
        await bot.sendMessage(chatId, caption);
    }
});

// ================== AUTO-DETECT LINK ==================

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    // TikTok
    if (text.includes('tiktok.com')) {
        const status = await bot.sendMessage(chatId, '⏳ Memproses audio TikTok...');
        try {
            const result = await downloadTikTok(text, 'mp3');
            await bot.sendAudio(chatId, result.filePath, {
                caption: `🎵 ${result.title}`,
                title: result.title
            });
            await bot.deleteMessage(chatId, status.message_id);
        } catch (error) {
            await bot.editMessageText(`❌ Gagal: ${error.message}`, {
                chat_id: chatId,
                message_id: status.message_id
            });
        }
        return;
    }

    // YouTube
    if (text.includes('youtube.com') || text.includes('youtu.be')) {
        const status = await bot.sendMessage(chatId, '⏳ Memproses audio YouTube...');
        try {
            const result = await downloadYouTube(text, 'mp3');
            await bot.sendAudio(chatId, result.filePath, {
                caption: `🎵 ${result.title}`,
                title: result.title
            });
            await bot.deleteMessage(chatId, status.message_id);
        } catch (error) {
            await bot.editMessageText(`❌ Gagal: ${error.message}`, {
                chat_id: chatId,
                message_id: status.message_id
            });
        }
        return;
    }
});

// ================== FAKE WEB SERVER ==================
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🎵 @Mp3titkok_bot is running! (Vernux Project - Final)');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Fake web server running on port ${port}`);
});

console.log('✅ @Mp3titkok_bot siap!');
console.log('📌 TikTok: Hantar link → MP3 | /mp4 [link] → MP4');
console.log('📌 YouTube: /ytmp3 [link] → MP3 | /ytmp4 [link] → MP4 (Vevioz API)');
console.log('📌 URL Checker: /check [url] → Check malware/phishing');
console.log('📱 IQC: /iqc "quote" | "sender" | "time" | "battery"');
console.log('🎵 Lyrics: /lyrics [judul lagu] → Cari lirik (Sylvatica)');
console.log('👤 Stalk: /stalk [username] → Dapatkan info profil TikTok (HasData)');
console.log('📧 Temp Mail: /tempmail → Cipta email sementara');
console.log('🚀 Vernux Project');
