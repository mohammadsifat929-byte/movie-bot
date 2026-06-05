const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// কনফিগারেশন
const token = '8737121129:AAG1QxHJZ4WPbFSrEyfdyeBUCXZ8wBMcl2Y';
const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID;
const ADMIN_ID = '1690553120';
const MAIN_CHANNEL = '@mobileinsight001';
const WEBSITE_LINK = 'https://stfix.blogspot.com/';
const CHANNEL_LINK = 'https://t.me/mobileinsight001';

console.log('=================================');
console.log('🤖 Mobile Insight Bot Starting...');
console.log('=================================');

// পোলিং মোড (ওয়েবহুক ছাড়া)
const bot = new TelegramBot(token, { polling: true });
let BOT_USERNAME = null;

// এক্সপ্রেস সার্ভার (Render কে জাগিয়ে রাখার জন্য)
app.get('/', (req, res) => {
    res.send('Mobile Insight Bot is running!');
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Visit: https://movie-bot-4ytg.onrender.com`);
});

// বটের তথ্য
bot.getMe().then((me) => {
    BOT_USERNAME = me.username;
    console.log(`✅ Bot Username: @${BOT_USERNAME}`);
    console.log(`✅ Bot is ready!`);
    
    // অ্যাডমিনকে জানান
    bot.sendMessage(ADMIN_ID, `✅ Bot is online!\nUsername: @${BOT_USERNAME}`).catch(() => {
        console.log('Cannot send message to admin');
    });
}).catch((err) => {
    console.error('Error getting bot info:', err.message);
});

// সাবস্ক্রিপশন চেক
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
                        `✅ ফাইল সংরক্ষিত!\n\n🔗 ${link}\n\n📝 কোড: ${code}`
                    );
                    console.log(`✅ Link created: ${link}`);
                }
            } catch (err) {
                console.error('Error:', err.message);
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
        return bot.sendMessage(chatId, 
            `❌ চ্যানেলে জয়েন করুন\n\n${CHANNEL_LINK}\n\nজয়েন করার পর আবার চেষ্টা করুন।`,
            {
                reply_markup: {
                    inline_keyboard: [[{ text: '📢 চ্যানেলে জয়েন করুন', url: CHANNEL_LINK }]]
                }
            }
        );
    }
    
    try {
        await bot.sendMessage(chatId, "⏳ ফাইল পাঠানো হচ্ছে...");
        await bot.copyMessage(chatId, STORAGE_CHANNEL_ID, parseInt(code));
        console.log(`✅ File sent: ${code}`);
    } catch (err) {
        console.error('Error:', err.message);
        await bot.sendMessage(chatId, "❌ ফাইল পাওয়া যায়নি!");
    }
});

// সাধারণ /start
bot.onText(/\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'ইউজার';
    const userId = msg.from.id;
    
    console.log(`🎯 /start from: ${userId}`);
    
    const isSubscribed = await checkSubscription(userId);
    
    if (!isSubscribed && String(userId) !== String(ADMIN_ID)) {
        await bot.sendMessage(chatId, 
            `❌ স্বাগতম ${firstName}!\n\nবট ব্যবহার করতে চ্যানেলে জয়েন করুন:\n${CHANNEL_LINK}\n\nজয়েন করার পর আবার /start দিন।`,
            {
                reply_markup: {
                    inline_keyboard: [[{ text: '📢 চ্যানেলে জয়েন করুন', url: CHANNEL_LINK }]]
                }
            }
        );
    } else {
        await bot.sendMessage(chatId, 
            `🎉 স্বাগতম ${firstName}! 🎉\n\n` +
            `🎬 ST Flix Web বটে স্বাগতম!\n\n` +
            `🌐 ওয়েবসাইট: ${WEBSITE_LINK}\n\n` +
            `📢 চ্যানেল: ${CHANNEL_LINK}`
        );
    }
});

// Error handling
bot.on('polling_error', (error) => {
    console.log('Polling error:', error.message);
});

console.log('🚀 Bot is running...');
