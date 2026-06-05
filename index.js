const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// এনভায়রনমেন্ট ভেরিয়েবল
const token = process.env.BOT_TOKEN;
const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID;
const ADMIN_ID = process.env.ADMIN_ID || '1690553120';
const MAIN_CHANNEL = '@mobileinsight001';
const RENDER_URL = process.env.RENDER_URL;

// ওয়েবসাইট লিংক
const WEBSITE_LINK = 'https://stfix.blogspot.com/';
const CHANNEL_LINK = 'https://t.me/mobileinsight001';

console.log('=================================');
console.log('🤖 Mobile Insight Bot Starting...');
console.log('=================================');

let bot = null;
let BOT_USERNAME = null;

// ওয়েবহুক সেটআপ
async function setupWebhook() {
    if (!RENDER_URL) return false;
    
    try {
        const webhookUrl = `${RENDER_URL}/webhook/${token}`;
        await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
        const data = await res.json();
        
        if (data.ok) {
            console.log(`✅ Webhook set to: ${webhookUrl}`);
            return true;
        }
    } catch (err) {
        console.log('⚠️ Webhook setup failed:', err.message);
    }
    return false;
}

// বট স্টার্ট
async function startBot() {
    const webhookSet = await setupWebhook();
    
    if (webhookSet) {
        bot = new TelegramBot(token, { webHook: true });
        console.log('✅ Bot running in WEBHOOK mode');
    } else {
        bot = new TelegramBot(token, { polling: true });
        console.log('✅ Bot running in POLLING mode');
    }
    
    const me = await bot.getMe();
    BOT_USERNAME = me.username;
    console.log(`🤖 Bot Username: @${BOT_USERNAME}`);
    
    await bot.sendMessage(ADMIN_ID, `✅ Bot is online!`).catch(() => {});
    
    setupHandlers();
}

// ওয়েবহুক এন্ডপয়েন্ট
app.post(`/webhook/${token}`, (req, res) => {
    if (bot) {
        bot.processUpdate(req.body);
    }
    res.sendStatus(200);
});

// হোম পেজ
app.get('/', (req, res) => {
    res.send('Mobile Insight Bot is running!');
});

// Keep-alive ping
setInterval(async () => {
    try {
        await fetch(RENDER_URL);
        console.log('💓 Keep-alive ping');
    } catch (e) {}
}, 240000);

// মেসেজ হ্যান্ডলার
function setupHandlers() {
    if (!bot) return;
    
    // সাবস্ক্রিপশন চেক ফাংশন
    async function checkSubscription(userId) {
        if (String(userId) === String(ADMIN_ID)) return true;
        try {
            const member = await bot.getChatMember(MAIN_CHANNEL, userId);
            return ['creator', 'administrator', 'member'].includes(member.status);
        } catch (error) {
            return false;
        }
    }
    
    // অ্যাডমিনের ফাইল আপলোড
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text;
        
        if (text && text.startsWith('/start')) return;
        
        if (String(userId) === String(ADMIN_ID)) {
            if (msg.photo || msg.video || msg.document) {
                try {
                    const forwarded = await bot.forwardMessage(STORAGE_CHANNEL_ID, chatId, msg.message_id);
                    if (forwarded && forwarded.message_id) {
                        const code = forwarded.message_id;
                        const link = `https://t.me/${BOT_USERNAME}?start=${code}`;
                        
                        await bot.sendMessage(chatId, 
                            `✅ **ফাইল সংরক্ষিত!**\n\n` +
                            `🔗 ${link}\n\n` +
                            `📝 কোড: \`${code}\``,
                            { parse_mode: 'Markdown' }
                        );
                        console.log(`✅ Link created: ${link}`);
                    }
                } catch (err) {
                    await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
                }
            }
        }
    });
    
    // শর্ট লিংক হ্যান্ডলার
    bot.onText(/\/start (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const code = match[1];
        
        console.log(`🎯 Request: Code=${code}, User=${userId}`);
        
        if (isNaN(code)) {
            return bot.sendMessage(chatId, "❌ Invalid link!");
        }
        
        const isSubscribed = await checkSubscription(userId);
        
        if (!isSubscribed && String(userId) !== String(ADMIN_ID)) {
            return bot.sendMessage(chatId, 
                `❌ **চ্যানেলে জয়েন করুন**\n\n` +
                `কন্টেন্ট পেতে আমাদের চ্যানেলে জয়েন করুন:\n\n` +
                `${CHANNEL_LINK}\n\n` +
                `জয়েন করার পর আবার লিংকে ক্লিক করুন।`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '📢 চ্যানেলে জয়েন করুন', url: CHANNEL_LINK }
                        ]]
                    }
                }
            );
        }
        
        try {
            await bot.sendMessage(chatId, "⏳ ফাইল পাঠানো হচ্ছে...");
            await bot.copyMessage(chatId, STORAGE_CHANNEL_ID, parseInt(code));
            console.log(`✅ File sent: ${code}`);
        } catch (err) {
            await bot.sendMessage(chatId, "❌ ফাইল পাওয়া যায়নি!");
        }
    });
    
    // সাধারণ /start (ওয়েলকাম মেসেজ)
    bot.onText(/\/start$/, async (msg) => {
        const chatId = msg.chat.id;
        const firstName = msg.from.first_name || 'ইউজার';
        const userId = msg.from.id;
        
        const isSubscribed = await checkSubscription(userId);
        
        if (!isSubscribed && String(userId) !== String(ADMIN_ID)) {
            // জয়েন না থাকলে
            await bot.sendMessage(chatId, 
                `❌ **স্বাগতম ${firstName}!**\n\n` +
                `বট ব্যবহার করতে প্রথমে চ্যানেলে জয়েন করুন:\n\n` +
                `${CHANNEL_LINK}\n\n` +
                `জয়েন করার পর আবার /start দিন।`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '📢 চ্যানেলে জয়েন করুন', url: CHANNEL_LINK }
                        ]]
                    }
                }
            );
        } else {
            // জয়েন থাকলে ওয়েলকাম মেসেজ
            await bot.sendMessage(chatId, 
                `🎉 **স্বাগতম ${firstName}!** 🎉\n\n` +
                `🎬 **ST Flix Web** বটে আপনাকে স্বাগতম!\n\n` +
                `💡 **আপনি যেভাবে কন্টেন্ট পাবেন:**\n` +
                `• আমাদের দেওয়া লিংকে ক্লিক করুন\n` +
                `• ওয়েবসাইট থেকে সংগ্রহ করুন\n\n` +
                `🌐 **ওয়েবসাইট:** ${WEBSITE_LINK}\n\n` +
                `📢 **আমাদের চ্যানেল:** ${CHANNEL_LINK}`,
                {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: false
                }
            );
        }
    });
}

// সার্ভার চালু
app.listen(PORT, () => {
    console.log(`✅ Server on port ${PORT}`);
});

startBot();

console.log('🚀 Bot starting...');
