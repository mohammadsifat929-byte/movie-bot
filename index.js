const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const token = '8737121129:AAG1QxHJZ4WPbFSrEyfdyeBUCXZ8wBMcl2Y';
const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID;
const ADMIN_ID = '1690553120';
const MAIN_CHANNEL = '@mobileinsight001';
const RENDER_URL = 'https://movie-bot-4ytg.onrender.com';

console.log('=================================');
console.log('🤖 Mobile Insight Bot Starting...');
console.log('=================================');

let bot = null;
let BOT_USERNAME = null;
let webhookActive = false;

// ওয়েবহুক সেট করার চেষ্টা
async function setupWebhook() {
    try {
        const webhookUrl = `${RENDER_URL}/webhook/${token}`;
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
        const data = await res.json();
        
        if (data.ok) {
            console.log(`✅ Webhook set to: ${webhookUrl}`);
            webhookActive = true;
            return true;
        }
    } catch (err) {
        console.log('⚠️ Webhook setup failed:', err.message);
    }
    
    console.log('⚠️ Webhook failed, falling back to polling mode');
    return false;
}

// বট স্টার্ট
async function startBot() {
    const webhookSet = await setupWebhook();
    
    if (webhookSet) {
        // ওয়েবহুক মোড
        bot = new TelegramBot(token, { webHook: true });
        console.log('✅ Bot running in WEBHOOK mode');
    } else {
        // পোলিং মোড (ব্যাকআপ)
        bot = new TelegramBot(token, { polling: true });
        console.log('✅ Bot running in POLLING mode');
    }
    
    const me = await bot.getMe();
    BOT_USERNAME = me.username;
    console.log(`🤖 Bot Username: @${BOT_USERNAME}`);
    
    // অ্যাডমিনকে জানান
    const mode = webhookSet ? 'WEBHOOK' : 'POLLING';
    await bot.sendMessage(ADMIN_ID, `✅ Bot is online!\nUsername: @${BOT_USERNAME}\nMode: ${mode}`).catch(() => {});
    
    // হ্যান্ডলার সেট করুন
    setupHandlers();
}

// ওয়েবহুক এন্ডপয়েন্ট (শুধু ওয়েবহুক মোডে)
if (RENDER_URL) {
    app.post(`/webhook/${token}`, (req, res) => {
        if (bot) {
            bot.processUpdate(req.body);
        }
        res.sendStatus(200);
    });
}

// হোম পেজ
app.get('/', (req, res) => {
    res.send('Mobile Insight Bot is running!');
});

// Keep-alive - প্রতি 4 মিনিটে নিজেকে পিং করে
setInterval(async () => {
    try {
        await fetch(RENDER_URL);
        console.log('💓 Keep-alive ping sent');
    } catch (e) {}
}, 240000);

// প্রতি 10 মিনিটে ওয়েবহুক চেক ও রিসেট
setInterval(async () => {
    if (!webhookActive) return;
    
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        const data = await res.json();
        
        if (data.result && !data.result.url) {
            console.log('⚠️ Webhook lost, resetting...');
            await setupWebhook();
        }
    } catch (err) {
        console.log('Webhook check error:', err.message);
    }
}, 600000); // 10 minutes

// মেসেজ হ্যান্ডলার
function setupHandlers() {
    if (!bot) return;
    
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
                        await bot.sendMessage(chatId, `✅ File Saved!\n\nLink: ${link}\nCode: ${code}`);
                        console.log(`✅ Link: ${link}`);
                    }
                } catch (err) {
                    await bot.sendMessage(chatId, `Error: ${err.message}`);
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
            return bot.sendMessage(chatId, "Invalid link!");
        }
        
        const isSubscribed = await checkSubscription(userId);
        
        if (!isSubscribed && String(userId) !== String(ADMIN_ID)) {
            const channelLink = `https://t.me/${MAIN_CHANNEL.replace('@', '')}`;
            return bot.sendMessage(chatId, `❌ Join Channel First!\n\nJoin: ${channelLink}`);
        }
        
        try {
            await bot.sendMessage(chatId, "Sending file...");
            await bot.copyMessage(chatId, STORAGE_CHANNEL_ID, parseInt(code));
            console.log(`✅ File sent: ${code}`);
        } catch (err) {
            await bot.sendMessage(chatId, "File not found!");
        }
    });
    
    // সাধারণ /start
    bot.onText(/\/start$/, async (msg) => {
        const chatId = msg.chat.id;
        const firstName = msg.from.first_name || 'User';
        await bot.sendMessage(chatId, `👋 Hello ${firstName}!\n\nWelcome to Mobile Insight Bot!`);
    });
}

// সার্ভার চালু
app.listen(PORT, () => {
    console.log(`✅ Server on port ${PORT}`);
});

startBot();

console.log('🚀 Bot starting with auto-recovery...');
