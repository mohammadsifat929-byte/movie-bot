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

// বট নিজের ইউজারনাম বের করে নিচ্ছে
bot.getMe().then((me) => {
    BOT_USERNAME = me.username;
    console.log(`🤖 বটের ইউজারনাম: @${BOT_USERNAME}`);
});

// 🎯 রিয়েল টাইম সাবস্ক্রিপশন চেক
async function checkSubscription(userId) {
    if (String(userId) === String(ADMIN_ID)) return true;
    try {
        const member = await bot.getChatMember(MAIN_CHANNEL, userId);
        return ['creator', 'administrator', 'member'].includes(member.status);
    } catch (error) {
        return false;
    }
}

// 🎯 লিংক ফরম্যাট দেখানোর ফাংশন (সব ইউজারের জন্য)
async function showLinkFormat(chatId) {
    const demoCode = Math.floor(Math.random() * 90000) + 10000; // র্যান্ডম ডেমো কোড
    const demoLink = `https://t.me/${BOT_USERNAME}?start=${demoCode}`;
    
    const formatText = `📌 **লিংক ফরম্যাট বুঝে নিন:** 

🔗 **লিংক দেখতে এরকম হবে:**
\`${demoLink}\`

📝 **উদাহরণস্বরূপ:**
\`https://t.me/${BOT_USERNAME}?start=123456\`

⚠️ **মনে রাখবেন:**
• \`123456\` এর জায়গায় আসলে ভিন্ন নম্বর থাকবে
• প্রতিটি ফাইলের জন্য আলাদা নম্বর থাকে
• এই নম্বরটিই আপনার শর্ট লিংক

💡 **লিংক কিভাবে পাবেন:**
✅ অ্যাডমিন ফাইল দিলেই লিংক পাবেন
✅ অথবা ওয়েবসাইট থেকে লিংক সংগ্রহ করুন
✅ আমাদের চ্যানেলে লিংক দেওয়া থাকে

🔗 **ওয়েবসাইট:** [ST Flix Web](https://stflix.com)`;
    
    await bot.sendMessage(chatId, formatText, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: false
    });
}

// 🎯 মেইন হ্যান্ডলার
async function handleWithSubscriptionCheck(msg, callback) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const isSubscribed = await checkSubscription(userId);
    
    if (!isSubscribed && String(userId) !== String(ADMIN_ID)) {
        const channelLink = `https://t.me/${MAIN_CHANNEL.replace('@', '')}`;
        
        const notSubMsg = `❌ **অ্যাক্সেস অস্বীকৃত!** ❌

আমাদের বট ব্যবহার করতে হলে আপনাকে চ্যানেলে জয়েন করতে হবে।

📢 **চ্যানেল লিংক:** ${channelLink}

👇 নিচের বাটনে ক্লিক করে জয়েন করুন 👇

জয়েন করার পর **/start** দিন।`;
        
        await bot.sendMessage(chatId, notSubMsg, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📢 চ্যানেলে জয়েন করুন', url: channelLink }],
                    [{ text: '✅ জয়েন করেছি', callback_data: 'recheck_join' }]
                ]
            }
        });
        return false;
    }
    
    return await callback();
}

// ✅ রিচেক করার জন্য Callback
bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const messageId = callbackQuery.message.message_id;
    const firstName = callbackQuery.from.first_name || 'ইউজার';
    
    if (action === 'recheck_join') {
        const isSubscribed = await checkSubscription(userId);
        
        if (isSubscribed) {
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: "✅ আপনি এখন চ্যানেলে জয়েন আছেন!", 
                show_alert: true 
            });
            await bot.deleteMessage(chatId, messageId).catch(() => {});
            
            // ওয়েলকাম মেসেজ + লিংক ফরম্যাট দেখান
            const welcomeMsg = `🎉 **স্বাগতম** ${firstName}! 🎉

আপনি এখন আমাদের চ্যানেলে জয়েন করেছেন।

✅ এখন আপনি আমাদের সব কন্টেন্ট পেতে পারবেন।`;
            
            await bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
            
            // লিংক ফরম্যাট দেখান
            await showLinkFormat(chatId);
            
        } else {
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: "❌ আপনি এখনও জয়েন করেননি!", 
                show_alert: true 
            });
        }
    }
});

// 🎯 ১. /start কমান্ড
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'ইউজার';
    
    const match = msg.text.match(/\/start (.+)/);
    const shortCode = match ? match[1] : null;
    
    await handleWithSubscriptionCheck(msg, async () => {
        if (shortCode && !isNaN(shortCode)) {
            // শর্ট লিংক থেকে ফাইল পাঠান
            try {
                const loadingMsg = await bot.sendMessage(chatId, '⏳ ফাইল প্রসেস করা হচ্ছে...');
                await bot.copyMessage(chatId, STORAGE_CHANNEL_ID, parseInt(shortCode));
                await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
                console.log(`✅ ফাইল পাঠানো হয়েছে: ${shortCode} -> ${userId}`);
            } catch (err) {
                console.error('File error:', err.message);
                await bot.sendMessage(chatId, "❌ ফাইল পাওয়া যায়নি!");
            }
        } else {
            // সাধারণ /start - ওয়েলকাম + লিংক ফরম্যাট দেখান
            const welcomeMsg = `👋 **হ্যালো** ${firstName}! 👋

🎬 **ST Flix Web** বটে স্বাগতম!

আমি একটি ফাইল শেয়ারিং বট।`;
            
            await bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
            
            // লিংক ফরম্যাট দেখান
            await showLinkFormat(chatId);
        }
        return true;
    });
});

// 🎯 ২. ফাইল আপলোড (শুধু অ্যাডমিন)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    if (text && (text.startsWith('/start') || text.startsWith('/info') || text.startsWith('/linkformat'))) return;
    
    // অ্যাডমিনের ফাইল হ্যান্ডেল করা
    if (String(userId) === String(ADMIN_ID) && (msg.photo || msg.video || msg.document)) {
        try {
            const forwardedMsg = await bot.forwardMessage(STORAGE_CHANNEL_ID, chatId, msg.message_id);
            if (forwardedMsg && forwardedMsg.message_id) {
                const shortCode = forwardedMsg.message_id;
                const finalLink = `https://t.me/${BOT_USERNAME}?start=${shortCode}`;
                
                const linkMsg = `✅ **ফাইল সেভ হয়েছে!** ✅

🔗 **আপনার ফাইলের লিংক:**
${finalLink}

📝 **শর্ট কোড:** \`${shortCode}\`

⚡ **লিংক টেস্ট করুন:**
\`https://t.me/${BOT_USERNAME}?start=${shortCode}\`

💾 এই লিংকটি সেভ করে রাখুন।`;
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Movie Bot is running!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

const token = process.env.BOT_TOKEN;
const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID;
const ADMIN_ID = process.env.ADMIN_ID || '1690553120';
const MAIN_CHANNEL = '@mobileinsight001';

const bot = new TelegramBot(token, { polling: true });
let BOT_USERNAME = null;

// বট নিজের সঠিক ইউজারনাম ডিটেক্ট করবে
bot.getMe().then((me) => {
    BOT_USERNAME = me.username;
    console.log('=================================');
    console.log(`🤖 বটের সঠিক ইউজারনাম: @${BOT_USERNAME}`);
    console.log(`🔗 লিংক ফরম্যাট: https://t.me/${BOT_USERNAME}?start=মেসেজ_আইডি`);
    console.log('=================================');
    
    bot.sendMessage(ADMIN_ID, 
        `✅ বট চালু হয়েছে!\n\n🤖 বটের ইউজারনাম: @${BOT_USERNAME}`
    ).catch(() => console.log('অ্যাডমিনকে মেসেজ পাঠানো যায়নি'));
});

async function checkSubscription(userId) {
    if (String(userId) === String(ADMIN_ID)) return true;
    try {
        const member = await bot.getChatMember(MAIN_CHANNEL, userId);
        return ['creator', 'administrator', 'member'].includes(member.status);
    } catch (error) {
        return false;
    }
}

// ফাইল আপলোড ও লিংক জেনারেশন
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!BOT_USERNAME) return;
    if (msg.text && msg.text.startsWith('/start')) return;
    
    if (String(userId) === String(ADMIN_ID)) {
        if (msg.photo || msg.video || msg.document) {
            try {
                const forwardedMsg = await bot.forwardMessage(STORAGE_CHANNEL_ID, chatId, msg.message_id);
                
                if (forwardedMsg && forwardedMsg.message_id) {
                    const shortCode = forwardedMsg.message_id;
                    const finalLink = `https://t.me/${BOT_USERNAME}?start=${shortCode}`;
                    
                    await bot.sendMessage(chatId, 
                        `✅ **ফাইল সেভ হয়েছে!**\n\n` +
                        `🔗 ${finalLink}\n\n` +
                        `📝 কোড: \`${shortCode}\``,
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (err) {
                console.error('Error:', err.message);
                await bot.sendMessage(chatId, `❌ লিংক তৈরি ব্যর্থ: ${err.message}`);
            }
        }
    }
});

// শর্ট লিংক থেকে ফাইল রিট্রিভ
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const shortCode = match[1];
    
    if (isNaN(shortCode)) {
        return await bot.sendMessage(chatId, "❌ ভুল লিংক!");
    }
    
    const isSubscribed = await checkSubscription(userId);
    
    if (!isSubscribed && String(userId) !== String(ADMIN_ID)) {
        const channelLink = `https://t.me/${MAIN_CHANNEL.replace('@', '')}`;
        return await bot.sendMessage(chatId, 
            `❌ **চ্যানেলে জয়েন করুন**\n\n` +
            `ফাইল পেতে চ্যানেলে জয়েন করুন:\n${channelLink}`,
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📢 চ্যানেলে জয়েন করুন', url: channelLink }
                    ]]
                }
            }
        );
    }
    
    try {
        await bot.sendMessage(chatId, `⏳ ফাইল পাঠানো হচ্ছে...`);
        await bot.copyMessage(chatId, STORAGE_CHANNEL_ID, parseInt(shortCode));
    } catch (err) {
        await bot.sendMessage(chatId, "❌ ফাইল পাওয়া যায়নি!");
    }
});

// সাধারণ /start (কোনো লিংক ফরম্যাট দেখাবে না)
bot.onText(/\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'ইউজার';
    
    if (!BOT_USERNAME) {
        await bot.sendMessage(chatId, '⏳ বট স্টার্ট হচ্ছে...');
        return;
    }
    
    // চেক করা ইউজার চ্যানেলে জয়েন করেছে কিনা
    const isSubscribed = await checkSubscription(msg.from.id);
    
    if (!isSubscribed && String(msg.from.id) !== String(ADMIN_ID)) {
        const channelLink = `https://t.me/${MAIN_CHANNEL.replace('@', '')}`;
        await bot.sendMessage(chatId, 
            `❌ **চ্যানেলে জয়েন করুন**\n\n` +
            `বট ব্যবহার করতে চ্যানেলে জয়েন করুন:\n${channelLink}`,
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📢 চ্যানেলে জয়েন করুন', url: channelLink }
                    ]]
                }
            }
        );
    } else {
        // সহজ ওয়েলকাম মেসেজ (লিংক ফরম্যাট ছাড়া)
        await bot.sendMessage(chatId, 
            `👋 হ্যালো **${firstName}**!\n\n` +
            `🎬 **ST Flix Web** বটে স্বাগতম!`,
            { parse_mode: 'Markdown' }
        );
    }
});

// শুধু অ্যাডমিনের জন্য লিংক ফরম্যাট জানার কমান্ড (অপশনাল)
bot.onText(/\/linkformat/, async (msg) => {
    const userId = msg.from.id;
    
    if (String(userId) === String(ADMIN_ID)) {
        await bot.sendMessage(msg.chat.id, 
            `📌 **লিংক ফরম্যাট:**\n` +
            `\`https://t.me/${BOT_USERNAME}?start=মেসেজ_আইডI\``,
            { parse_mode: 'Markdown' }
        );
    }
});

console.log('🚀 বট চালু হয়েছে!');
