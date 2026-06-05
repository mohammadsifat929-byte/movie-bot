const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// এনভায়রনমেন্ট ভেরিয়েবল
const token = process.env.BOT_TOKEN;
const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID;
const ADMIN_ID = '8695023288';
const MAIN_CHANNEL = '@mobileinsight001';
const WEBSITE_LINK = 'https://stfix.blogspot.com/';
const CHANNEL_LINK = 'https://t.me/mobileinsight001';

console.log('=================================');
console.log('🤖 Mobile Insight Bot Starting...');
console.log(`📁 STORAGE_CHANNEL_ID: ${STORAGE_CHANNEL_ID}`);
console.log(`👑 ADMIN_ID: ${ADMIN_ID}`);
console.log('=================================');

const bot = new TelegramBot(token, { polling: true });
let BOT_USERNAME = null;

app.get('/', (req, res) => {
    res.send('Mobile Insight Bot is running!');
});

app.listen(PORT, () => {
    console.log(`✅ Server on port ${PORT}`);
});

bot.getMe().then((me) => {
    BOT_USERNAME = me.username;
    console.log(`✅ Bot: @${BOT_USERNAME}`);
    bot.sendMessage(ADMIN_ID, `✅ বট অনলাইন হয়েছে!`).catch(() => {});
}).catch(err => console.error('GetMe error:', err.message));

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

// 📋 হেল্প কমান্ড
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 
        `📋 *বটের ফিচারসমূহ*\n\n` +
        `✅ শর্ট লিংকের মাধ্যমে ফাইল পাওয়া\n` +
        `✅ চ্যানেল সাবস্ক্রাইব বাধ্যতামূলক\n` +
        `✅ ২৪/৭ অনলাইন সাপোর্ট\n` +
        `✅ দ্রুত ফাইল ডেলিভারি\n\n` +
        `📢 আমাদের চ্যানেল: [Join Now](${CHANNEL_LINK})\n` +
        `🌐 ওয়েবসাইট: [ST Flix](${WEBSITE_LINK})`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
});

// 📊 স্ট্যাটাস কমান্ড (শুধু অ্যাডমিন)
bot.onText(/\/stats/, async (msg) => {
    if (String(msg.from.id) !== String(ADMIN_ID)) return;
    
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    await bot.sendMessage(msg.chat.id, 
        `📊 *বট স্ট্যাটাস*\n\n` +
        `⏰ চলমান: ${hours}ঘ ${minutes}মি ${seconds}সে\n` +
        `📁 স্টোরেজ চ্যানেল: ${STORAGE_CHANNEL_ID ? '✅ সেট' : '❌ সেট নেই'}\n` +
        `🔄 মোড: পোলিং\n` +
        `✅ স্ট্যাটাস: লাইভ\n\n` +
        `🔗 বটের ইউজারনাম: @${BOT_USERNAME}`,
        { parse_mode: 'Markdown' }
    );
});

// 💬 অটো রিপ্লাই
bot.on('message', async (msg) => {
    const text = msg.text?.toLowerCase();
    const chatId = msg.chat.id;
    
    if (msg.photo || msg.video || msg.document) return;
    if (text?.startsWith('/')) return;
    
    const replies = {
        'hi': 'হ্যালো! 👋 কিভাবে সাহায্য করতে পারি?',
        'hello': 'হ্যালো! 👋 স্বাগতম!',
        'help': 'দয়া করে /help লিখুন।',
        'thanks': 'আপনাকে ধন্যবাদ! 😊',
        'thank you': 'আপনাকে ধন্যবাদ! 😊',
        'link': 'লিংক পেতে আমাদের চ্যানেল জয়েন করুন!',
        'channel': `আমাদের চ্যানেল: ${CHANNEL_LINK}`,
        'website': `আমাদের ওয়েবসাইট: ${WEBSITE_LINK}`
    };
    
    if (text && replies[text]) {
        await bot.sendMessage(chatId, replies[text], { parse_mode: 'Markdown' });
    }
});

// 🔥 ফাইল আপলোড হ্যান্ডলার
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    if (text && text.startsWith('/')) return;
    
    if (String(userId) === String(ADMIN_ID)) {
        if (msg.photo || msg.video || msg.document) {
            console.log(`📁 File received, saving to storage...`);
            
            // ফাইল ইনফো
            let fileName = 'ফাইল';
            let fileSize = '';
            
            if (msg.document) {
                fileName = msg.document.file_name;
                fileSize = (msg.document.file_size / 1024 / 1024).toFixed(2) + ' MB';
            } else if (msg.video) {
                fileName = '🎬 ভিডিও ফাইল';
                fileSize = (msg.video.file_size / 1024 / 1024).toFixed(2) + ' MB';
            } else if (msg.photo) {
                fileName = '🖼️ ছবি ফাইল';
                fileSize = (msg.photo[0].file_size / 1024).toFixed(2) + ' KB';
            }
            
            try {
                const forwarded = await bot.forwardMessage(STORAGE_CHANNEL_ID, chatId, msg.message_id);
                if (forwarded && forwarded.message_id) {
                    const code = forwarded.message_id;
                    const link = `https://t.me/${BOT_USERNAME}?start=${code}`;
                    
                    await bot.sendMessage(chatId, 
                        `✅ *ফাইল সংরক্ষিত!*\n\n` +
                        `📄 নাম: ${fileName}\n` +
                        `📦 সাইজ: ${fileSize}\n` +
                        `🔗 লিংক: ${link}\n\n` +
                        `📝 কোড: \`${code}\``,
                        { parse_mode: 'Markdown' }
                    );
                    console.log(`✅ LINK CREATED: ${link}`);
                }
            } catch (err) {
                console.error(`❌ Error: ${err.message}`);
                await bot.sendMessage(chatId, `❌ স্টোরেজ চ্যানেলে সমস্যা!\n\nError: ${err.message}`);
            }
        }
    }
});

// शॉर्ट লিংক হ্যান্ডলার
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const code = match[1];
    
    if (isNaN(code)) {
        return bot.sendMessage(chatId, "❌ ভুল লিংক!");
    }
    
    const isSubscribed = await checkSubscription(userId);
    
    if (!isSubscribed && String(userId) !== String(ADMIN_ID)) {
        return bot.sendMessage(chatId, 
            `❌ *চ্যানেলে জয়েন করুন*\n\nকন্টেন্ট পেতে জয়েন করুন:\n${CHANNEL_LINK}`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: '📢 জয়েন করুন', url: CHANNEL_LINK }]]
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

// সাধারণ /start
bot.onText(/\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'ইউজার';
    const userId = msg.from.id;
    
    const isSubscribed = await checkSubscription(userId);
    
    if (!isSubscribed && String(userId) !== String(ADMIN_ID)) {
        await bot.sendMessage(chatId, 
            `❌ *স্বাগতম ${firstName}!*\n\nবট ব্যবহার করতে চ্যানেলে জয়েন করুন:\n${CHANNEL_LINK}`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: '📢 জয়েন করুন', url: CHANNEL_LINK }]]
                }
            }
        );
    } else {
        await bot.sendMessage(chatId, 
            `🎉 *স্বাগতম ${firstName}!*\n\n🎬 *ST Flix Web* বটে স্বাগতম!\n\n` +
            `🌐 ওয়েবসাইট: ${WEBSITE_LINK}\n📢 চ্যানেল: ${CHANNEL_LINK}`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Error handling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error.message);
});

console.log('🚀 Bot started with new features!');
