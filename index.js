const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// ১. এক্সপ্রেস সার্ভার সেটআপ (Render জ্যান্ত রাখার জন্য)
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Database-less Movie Bot is running!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// ২. এনভায়রনমেন্ট ভেরিয়েবল সেটআপ
const token = process.env.BOT_TOKEN;
const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID; // আপনার প্রাইভেট স্টোরেজ চ্যানেল আইডি
const ADMIN_ID = process.env.ADMIN_ID || 1690553120;
const MAIN_CHANNEL = process.env.CHANNEL_ID || '@Mobileinsightbot'; // সাবস্ক্রিপশন চেক করার চ্যানেল

// ৩. বট ইনিশিয়ালাইজেশন
const bot = new TelegramBot(token, { polling: true });
let botUsername = '';

bot.getMe().then((me) => {
    botUsername = me.username;
    console.log(`🤖 Bot @${botUsername} is alive and active!`);
});

// ৪. সাবস্ক্রিপশন চেক ফাংশন
async function checkSubscription(userId) {
    if (Number(userId) === Number(ADMIN_ID)) return true;
    try {
        const member = await bot.getChatMember(MAIN_CHANNEL, userId);
        return ['creator', 'administrator', 'member'].includes(member.status);
    } catch (error) {
        console.error('Sub check error:', error.message);
        return false;
    }
}

// 📂 ৫. যখন অ্যাডমিন বটে কোনো ফাইল (ভিডিও/ডকুমেন্ট/ফটো) পাঠাবে, তখন সেটি স্টোরেজ চ্যানেলে যাবে
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // যদি মেসেজটি টেক্সট হয় এবং /start দিয়ে শুরু হয়, তবে এটি এখানে প্রসেস হবে না
    if (msg.text && msg.text.startsWith('/start')) return;

    // শুধুমাত্র অ্যাডমিন ফাইল পাঠালে শর্ট লিংক তৈরি হবে
    if (Number(userId) === Number(ADMIN_ID)) {
        let forwardedMsg = null;

        try {
            // ইউজারের পাঠানো ফাইলটি সরাসরি আমাদের প্রাইভেট স্টোরেজ চ্যানেলে ফরওয়ার্ড করা হচ্ছে
            forwardedMsg = await bot.forwardMessage(STORAGE_CHANNEL_ID, chatId, msg.message_id);
            
            if (forwardedMsg && forwardedMsg.message_id) {
                // টেলিগ্রামের মেসেজ আইডিটিই আমাদের শর্ট কোড হিসেবে কাজ করবে
                const shortCode = forwardedMsg.message_id;
                
               // শর্ট লিংকের তৈরি করা (যা দেখতে এমন হবে: https://t.me)
                const finalLink = 'https://t.me' + shortCode;
                const responseText = `✅ **আপনার ফাইলের শর্ট লিংক তৈরি হয়ে গেছে (No Database!):**\n\n🔗 ${finalLink}`;

                await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
            }
        } catch (err) {
            console.error('Forwarding Error:', err.message);
            await bot.sendMessage(chatId, `❌ স্টোরেজ চ্যানেলে ফাইল পাঠাতে সমস্যা হয়েছে। বটটিকে চ্যানেলের অ্যাডমিন করা আছে কি না চেক করুন।\nError: ${err.message}`);
        }
    }
});

// 🚀 ৬. যখন সাধারণ ইউজার শর্ট লিংকে ক্লিক করে বটের ভেতর আসবে
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const shortCode = match[1]; // লিংকের শেষের মেসেজ আইডিটি এখানে আসবে

    try {
        // ১. আগে চেক করব ইউজার মূল চ্যানেলে জয়েন আছে কি না (Force Subscribe)
        const isSubscribed = await checkSubscription(userId);

        if (!isSubscribed) {
            const cleanChannel = MAIN_CHANNEL.replace('@', '');
            return await bot.sendMessage(chatId, `❌ **অ্যাক্সেস অস্বীকৃত (Access Denied)!**\n\nআমাদের বট থেকে ফাইলটি ডাউনলোড করতে হলে আপনাকে অবশ্যই আমাদের অফিসিয়াল চ্যানেলে জয়েন থাকতে হবে।\n\nনিচের বোতামে ক্লিক করে জয়েন করুন এবং নিচে আবার স্টার্ট করুন।`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📢 আমাদের চ্যানেলে জয়েন করুন', url: `https://t.me{cleanChannel}` },
                        { text: '🔄 জয়েন করেছি (Try Again)', url: `https://t.me{botUsername}?start=${shortCode}` }
                    ]]
                }
            });
        }

        // ২. ইউজার যদি জয়েন থাকে, তবে বট প্রাইভেট স্টোরেজ চ্যানেল থেকে ওই নির্দিষ্ট মেসেজ আইডি তুলে এনে ইউজারকে পাঠাবে
        const loadingMsg = await bot.sendMessage(chatId, '⏳ **আপনার ফাইলটি প্রসেস করা হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন**', { parse_mode: 'Markdown' });

        try {
            // কপি মেসেজ মেথড দিয়ে সরাসরি স্টোরেজ চ্যানেল থেকে ফাইলটি ইউজারের চ্যাটে পাঠিয়ে দেওয়া হচ্ছে
            await bot.copyMessage(chatId, STORAGE_CHANNEL_ID, shortCode);
            await bot.deleteMessage(chatId, loadingMsg.message_id);
        } catch (sendErr) {
            console.error('File Send Error:', sendErr.message);
            await bot.sendMessage(chatId, "❌ দুঃখিত, ফাইলটি মূল স্টোরেজ চ্যানেল থেকে মুছে ফেলা হয়েছে অথবা লিংকটি ভুল।");
        }

    } catch (err) {
        console.error('Start Param Error:', err.message);
    }
});

// ৭. সাধারণ /start মেসেজ হ্যান্ডলার (যখন কোনো লিংক ছাড়া শুধু স্টার্ট করবে)
bot.on('message', async (msg) => {
    const textInput = msg.text ? msg.text.trim() : '';
    if (textInput === '/start') {
        await bot.sendMessage(msg.chat.id, `👋 হ্যালো **${msg.from.first_name || 'ইউজার'}**!\n\nআমি একটি ফাইল শেয়ারিং বট। ফাইল বা মুভি পাওয়ার জন্য দয়া করে আমাদের দেওয়া শর্ট লিংক ব্যবহার করুন।\n\nআপনি যদি অ্যাডমিন হন, তবে যেকোনো ফাইল ফরওয়ার্ড করে এখানে পাঠান, লিংক তৈরি হয়ে যাবে।`, { parse_mode: 'Markdown' });
    }
});

bot.on('polling_error', (error) => console.log('Polling error:', error.message));
