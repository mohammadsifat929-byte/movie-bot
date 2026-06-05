const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// এক্সপ্রেস সার্ভার
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Movie Bot is running!');
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// এনভায়রনমেন্ট ভেরিয়েবল
const token = process.env.BOT_TOKEN;
const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID;
const ADMIN_ID = process.env.ADMIN_ID || '1690553120';
const MAIN_CHANNEL = '@mobileinsight001';

// বট ইনিশিয়ালাইজেশন
const bot = new TelegramBot(token, { polling: true });
let BOT_USERNAME = null;

// বট নিজের সঠিক ইউজারনাম ডিটেক্ট করবে
bot.getMe().then((me) => {
    BOT_USERNAME = me.username;
    console.log('=================================');
    console.log(`Bot Username: @${BOT_USERNAME}`);
    console.log(`Link Format: https://t.me/${BOT_USERNAME}?start=message_id`);
    console.log('=================================');
    
    // অ্যাডমিনকে নোটিফিকেশন
    bot.sendMessage(ADMIN_ID, `Bot is running!\nUsername: @${BOT_USERNAME}`).catch(() => {
        console.log('Cannot send message to admin');
    });
}).catch((err) => {
    console.error('Error getting bot info:', err.message);
});

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

// ফাইল আপলোড ও লিংক জেনারেশন (শুধু অ্যাডমিন)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!BOT_USERNAME) return;
    if (msg.text && msg.text.startsWith('/start')) return;
    
    // শুধু অ্যাডমিন ফাইল পাঠাতে পারবেন
    if (String(userId) === String(ADMIN_ID)) {
        if (msg.photo || msg.video || msg.document) {
            try {
                const forwardedMsg = await bot.forwardMessage(STORAGE_CHANNEL_ID, chatId, msg.message_id);
                
                if (forwardedMsg && forwardedMsg.message_id) {
                    const shortCode = forwardedMsg.message_id;
                    const finalLink = `https://t.me/${BOT_USERNAME}?start=${shortCode}`;
                    
                    await bot.sendMessage(chatId, 
                        `✅ File Saved!\n\n` +
                        `Link: ${finalLink}\n\n` +
                        `Code: ${shortCode}`,
                        { parse_mode: 'Markdown' }
                    );
                    
                    console.log(`Link generated: ${finalLink}`);
                }
            } catch (err) {
                console.error('Error:', err.message);
                await bot.sendMessage(chatId, `Error: ${err.message}`);
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
        return await bot.sendMessage(chatId, "Invalid link!");
    }
    
    const isSubscribed = await checkSubscription(userId);
    
    if (!isSubscribed && String(userId) !== String(ADMIN_ID)) {
        const channelLink = `https://t.me/${MAIN_CHANNEL.replace('@', '')}`;
        return await bot.sendMessage(chatId, 
            `Join Channel First!\n\n` +
            `Please join our channel to get the file:\n${channelLink}`,
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: 'Join Channel', url: channelLink }
                    ]]
                }
            }
        );
    }
    
    try {
        await bot.sendMessage(chatId, `Sending file...`);
        await bot.copyMessage(chatId, STORAGE_CHANNEL_ID, parseInt(shortCode));
        console.log(`File sent: ${shortCode} -> ${userId}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        await bot.sendMessage(chatId, "File not found!");
    }
});

// সাধারণ /start (লিংক ফরম্যাট ছাড়া)
bot.onText(/\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'User';
    
    if (!BOT_USERNAME) {
        await bot.sendMessage(chatId, 'Bot is starting...');
        return;
    }
    
    const isSubscribed = await checkSubscription(msg.from.id);
    
    if (!isSubscribed && String(msg.from.id) !== String(ADMIN_ID)) {
        const channelLink = `https://t.me/${MAIN_CHANNEL.replace('@', '')}`;
        await bot.sendMessage(chatId, 
            `Join Channel First!\n\nPlease join our channel:\n${channelLink}`,
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: 'Join Channel', url: channelLink }
                    ]]
                }
            }
        );
    } else {
        // সহজ ওয়েলকাম মেসেজ
        await bot.sendMessage(chatId, 
            `Hello ${firstName}!\n\nWelcome to ST Flix Web Bot!`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Error handling
bot.on('polling_error', (error) => {
    console.log('Polling error:', error.message);
});

console.log('Bot is starting...');
