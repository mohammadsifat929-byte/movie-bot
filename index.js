const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// এক্সপ্রেস সার্ভার
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Movie Bot is running!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// এনভায়রনমেন্ট ভেরিয়েবল
const token = process.env.BOT_TOKEN;
const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID;
const ADMIN_ID = process.env.ADMIN_ID || '1690553120';
const MAIN_CHANNEL = '@mobileinsight001';

// বট ইনিশিয়ালাইজেশন
const bot = new TelegramBot(token, { polling: true });
let BOT_USERNAME = null;

// 📝 সব মেসেজ এখানে কাস্টমাইজ করুন
const MESSAGES = {
    // ফোর্স সাবস্ক্রাইব মেসেজ (সব ক্ষেত্রেই এই মেসেজ দেখাবে)
    forceSubscribe: (channelLink, botUsername, userId) => `❌ **অ্যাক্সেস অস্বীকৃত!** ❌

হ্যালো! এই বট ব্যবহার করতে হলে আপনাকে আমাদের **অফিসিয়াল চ্যানেলে** জয়েন করতে হবে।

🔴 **আপনি এখনও জয়েন করেননি!**

📢 **চ্যানেল লিংক:** ${channelLink}

👇 **নিচের বাটনে ক্লিক করে জয়েন করুন** 👇

জয়েন করার পর আবার **/start** কমান্ড দিন।`,

    // জয়েন করার পর স্বাগতম
    welcome: (firstName, botUsername) => `✅ **স্বাগতম** ${firstName}! ✅

আপনি এখন আমাদের চ্যানেলে জয়েন করেছেন।

🎬 এখন আপনি আমাদের সব কন্টেন্ট পেতে পারবেন।

📌 **লিংক ফরম্যাট:** 
\`https://t.me/${botUsername}?start=কোড\`

🔗 **ভিজিট ওয়েবসাইট:** [ST Flix Web](https://stflix.com)`,

    // ফাইল প্রসেসিং মেসেজ
    processing: `⏳ **ফাইল প্রসেস করা হচ্ছে...**`,
    
    // ফাইল নট ফাউন্ড
    fileNotFound: `❌ ফাইল পাওয়া যায়নি!`,
    
    // অ্যাডমিন লিংক জেনারেশন
    linkGenerated: (link, shortCode, botUsername) => `✅ লিংক তৈরি: ${link}\n📝 কোড: ${shortCode}`,
    
    // বট তথ্য
    botInfo: (botUsername, channel) => `🤖 বট: @${botUsername}\n📢 চ্যানেল: ${channel}`
};

// বট নিজের ইউজারনাম বের করে নিচ্ছে
bot.getMe().then((me) => {
    BOT_USERNAME = me.username;
    console.log(`🤖 বটের ইউজারনাম: @${BOT_USERNAME}`);
});

// সাবস্ক্রিপশন চেক ফাংশন
async function checkSubscription(userId) {
    if (String(userId) === String(ADMIN_ID)) return true;
    try {
        const member = await bot.getChatMember(MAIN_CHANNEL, userId);
        const status = member.status;
        return ['creator', 'administrator', 'member'].includes(status);
    } catch (error) {
        console.log(`Subscription check failed for ${userId}:`, error.message);
        return false;
    }
}

// 🔥 সব মেসেজের আগে চেক করার ফাংশন (Middleware)
async function checkAndReply(chatId, userId, callback) {
    const isSubscribed = await checkSubscription(userId);
    
    if (!isSubscribed && String(userId) !== String(ADMIN_ID)) {
        const channelLink = `https://t.me/${MAIN_CHANNEL.replace('@', '')}`;
        const subscribeMsg = MESSAGES.forceSubscribe(channelLink, BOT_USERNAME, userId);
        
        await bot.sendMessage(chatId, subscribeMsg, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📢 চ্যানেলে জয়েন করুন', url: channelLink }],
                    [{ text: '🔄 জয়েন করেছি', callback_data: 'check_join' }]
                ]
            }
        });
        return false;
    }
    
    return await callback();
}

// ✅ জয়েন চেক করার জন্য Callback
bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const messageId = callbackQuery.message.message_id;
    
    if (action === 'check_join') {
        const isSubscribed = await checkSubscription(userId);
        
        if (isSubscribed) {
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: "✅ ধন্যবাদ! এখন আপনি বট ব্যবহার করতে পারবেন!", 
                show_alert: true 
            });
            await bot.deleteMessage(chatId, messageId).catch(() => {});
            
            // ওয়েলকাম মেসেজ পাঠান
            const welcomeMsg = MESSAGES.welcome(callbackQuery.from.first_name || 'ইউজার', BOT_USERNAME);
            await bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
        } else {
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: "❌ আপনি এখনও চ্যানেলে জয়েন করেননি! দয়া করে জয়েন করুন।", 
                show_alert: true 
            });
        }
    }
});

// 🎯 ১. যখন কেউ সার্চ করে বট পাবে এবং /start দিবে
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // লিংক সহ /start হলে (শর্ট কোড আছে)
    const match = msg.text.match(/\/start (.+)/);
    const shortCode = match ? match[1] : null;
    
    await checkAndReply(chatId, userId, async () => {
        if (shortCode && !isNaN(shortCode)) {
            // শর্ট লিংক থেকে ফাইল পাঠান
            try {
                const loadingMsg = await bot.sendMessage(chatId, MESSAGES.processing);
                await bot.copyMessage(chatId, STORAGE_CHANNEL_ID, parseInt(shortCode));
                await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
            } catch (err) {
                await bot.sendMessage(chatId, MESSAGES.fileNotFound);
            }
        } else {
            // সাধারণ /start
            const welcomeMsg = MESSAGES.welcome(msg.from.first_name || 'ইউজার', BOT_USERNAME);
            await bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
        }
        return true;
    });
});

// 🎯 ২. যখন কেউ সরাসরি বটে টাইপ করে মেসেজ দেয় (সার্চ করে পেয়ে)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    // কমান্ড ইতিমধ্যে হ্যান্ডেল করা হয়েছে
    if (text && text.startsWith('/start')) return;
    if (text && text.startsWith('/info')) return;
    
    await checkAndReply(chatId, userId, async () => {
        // চেক করা যে এটা ফাইল কিনা (অ্যাডমিনের জন্য)
        if (String(userId) === String(ADMIN_ID) && (msg.photo || msg.video || msg.document)) {
            try {
                const forwardedMsg = await bot.forwardMessage(STORAGE_CHANNEL_ID, chatId, msg.message_id);
                if (forwardedMsg && forwardedMsg.message_id) {
                    const shortCode = forwardedMsg.message_id;
                    const finalLink = `https://t.me/${BOT_USERNAME}?start=${shortCode}`;
                    await bot.sendMessage(chatId, MESSAGES.linkGenerated(finalLink, shortCode, BOT_USERNAME), { parse_mode: 'Markdown' });
                }
            } catch (err) {
                await bot.sendMessage(chatId, `❌ লিংক তৈরি ব্যর্থ: ${err.message}`);
            }
        } else if (text && !text.startsWith('/')) {
            // সাধারণ টেক্সট মেসেজের জবাব
            await bot.sendMessage(chatId, `👋 হ্যালো! এই বট ব্যবহার করতে শর্ট লিংক দিন অথবা /start দিন।`);
        }
        return true;
    });
});

// 🎯 ৩. /info কমান্ড
bot.onText(/\/info/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    await checkAndReply(chatId, userId, async () => {
        await bot.sendMessage(chatId, MESSAGES.botInfo(BOT_USERNAME, MAIN_CHANNEL), { parse_mode: 'Markdown' });
        return true;
    });
});

// 🎯 ৪. অন্য যেকোনো কিছু (যেমন স্টিকার, ভয়েস ইত্যাদি)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // আগের হ্যান্ডলারগুলোতে যা প্রসেস হয়নি
    if (msg.sticker || msg.voice || msg.video_note) {
        await checkAndReply(chatId, userId, async () => {
            await bot.sendMessage(chatId, `ℹ️ এই বট শুধু ভিডিও, ডকুমেন্ট এবং ফটো সাপোর্ট করে।`);
            return true;
        });
    }
});

console.log('🚀 বট চালু হয়েছে!');
console.log(`📢 ফোর্স সাবস্ক্রাইব চ্যানেল: ${MAIN_CHANNEL}`);
console.log(`✅ বট এখন সব ইন্টারঅ্যাকশনের আগে চেক করবে ইউজার চ্যানেলে জয়েন করেছে কিনা!`);
