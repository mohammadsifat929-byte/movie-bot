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
let BOT_USERNAME = null; // বট নিজেই এটি সেট করবে

// বট নিজের ইউজারনাম বের করে নিচ্ছে
bot.getMe().then((me) => {
    BOT_USERNAME = me.username;
    console.log(`🤖 আমার ইউজারনাম: @${BOT_USERNAME}`);
    console.log(`✅ লিংক ফরম্যাট হবে: https://t.me/${BOT_USERNAME}?start=মেসেজ_আইডি`);
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

// ফাইল আপলোড ও লিংক জেনারেশন
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // ওয়েট করা যতক্ষণ না বটের ইউজারনাম আসছে
    if (!BOT_USERNAME) {
        await bot.sendMessage(chatId, '⏳ একটু অপেক্ষা করুন, বট স্টার্ট হচ্ছে...');
        return;
    }
    
    if (msg.text && msg.text.startsWith('/start')) return;
    if (msg.text && !msg.photo && !msg.video && !msg.document) return;

    if (String(userId) === String(ADMIN_ID)) {
        try {
            const forwardedMsg = await bot.forwardMessage(STORAGE_CHANNEL_ID, chatId, msg.message_id);
            
            if (forwardedMsg && forwardedMsg.message_id) {
                const shortCode = forwardedMsg.message_id;
                
                // ✅ বট নিজের ইউজারনাম ব্যবহার করে লিংক বানাচ্ছে
                const finalLink = `https://t.me/${BOT_USERNAME}?start=${shortCode}`;
                
                const responseText = `✅ **আপনার ফাইলের লিংক তৈরি হয়েছে!**\n\n🔗 ${finalLink}\n\n📝 **কোড:** \`${shortCode}\`\n\n⚡ সরাসরি কপি করুন: \`t.me/${BOT_USERNAME}?start=${shortCode}\``;

                await bot.sendMessage(chatId, responseText, { 
                    parse_mode: 'Markdown'
                });
                
                console.log(`📤 লিংক জেনারেট: ${finalLink}`);
            }
        } catch (err) {
            console.error('Error:', err.message);
            await bot.sendMessage(chatId, `❌ লিংক তৈরি ব্যর্থ: ${err.message}`);
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

    if (!isSubscribed) {
        const cleanChannel = MAIN_CHANNEL.replace('@', '');
        return await bot.sendMessage(chatId, `❌ **চ্যানেলে জয়েন করুন**\n\nফাইল পেতে প্রথমে চ্যানেলে জয়েন করুন:\nhttps://t.me/${cleanChannel}`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '📢 চ্যানেলে জয়েন করুন', url: `https://t.me/${cleanChannel}` },
                    { text: '🔄 জয়েন করেছি', url: `https://t.me/${BOT_USERNAME}?start=${shortCode}` }
                ]]
            }
        });
    }

    try {
        const loadingMsg = await bot.sendMessage(chatId, '⏳ ফাইল লোড হচ্ছে...');
        await bot.copyMessage(chatId, STORAGE_CHANNEL_ID, parseInt(shortCode));
        await bot.deleteMessage(chatId, loadingMsg.message_id);
    } catch (err) {
        await bot.sendMessage(chatId, "❌ ফাইল পাওয়া যায়নি।");
    }
});

// সাধারণ /start
bot.onText(/\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (!BOT_USERNAME) {
        await bot.sendMessage(chatId, '⏳ বট স্টার্ট হচ্ছে, একটু অপেক্ষা করুন...');
        return;
    }
    
    await bot.sendMessage(chatId, `👋 হ্যালো!\n\n📌 **লিংক ফরম্যাট:**\n\`https://t.me/${BOT_USERNAME}?start=কোড\`\n\n📌 **অ্যাডমিন:**\nযেকোনো ফাইল পাঠালেই অটো লিংক তৈরি হবে।`, {
        parse_mode: 'Markdown'
    });
});

// বটের তথ্য দেখানোর জন্য
bot.onText(/\/info/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, `🤖 **বটের তথ্য**\n\n📛 ইউজারনাম: @${BOT_USERNAME}\n🔗 লিংক ফরম্যাট: \`https://t.me/${BOT_USERNAME}?start=মেসেজ_আইডি\`\n📢 মেইন চ্যানেল: ${MAIN_CHANNEL}`, {
        parse_mode: 'Markdown'
    });
});

console.log('🚀 বট চালু হচ্ছে...');
