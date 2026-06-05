const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const token = '8737121129:AAG1QxHJZ4WPbFSrEyfdyeBUCXZ8wBMcl2Y';
const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID;
const ADMIN_ID = '1690553120';
const MAIN_CHANNEL = '@mobileinsight001';

// শুধু পোলিং মোড (ওয়েবহুক ছাড়া)
const bot = new TelegramBot(token, { polling: true });

app.get('/', (req, res) => {
    res.send('Mobile Insight Bot is running with Polling!');
});

app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
});

let BOT_USERNAME = null;

bot.getMe().then((me) => {
    BOT_USERNAME = me.username;
    console.log(`Bot: @${BOT_USERNAME}`);
    bot.sendMessage(ADMIN_ID, `Bot is online! Username: @${BOT_USERNAME}`).catch(() => {});
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

// ফাইল আপলোড (অ্যাডমিন)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (msg.text && msg.text.startsWith('/start')) return;
    
    if (String(userId) === String(ADMIN_ID)) {
        if (msg.photo || msg.video || msg.document) {
            try {
                const forwarded = await bot.forwardMessage(STORAGE_CHANNEL_ID, chatId, msg.message_id);
                if (forwarded && forwarded.message_id) {
                    const code = forwarded.message_id;
                    const link = `https://t.me/${BOT_USERNAME}?start=${code}`;
                    await bot.sendMessage(chatId, `✅ File Saved!\nLink: ${link}\nCode: ${code}`);
                }
            } catch (err) {
                await bot.sendMessage(chatId, `Error: ${err.message}`);
            }
        }
    }
});

// শর্ট লিংক
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const code = match[1];
    
    if (isNaN(code)) return bot.sendMessage(chatId, "Invalid link!");
    
    const subscribed = await checkSubscription(userId);
    
    if (!subscribed && String(userId) !== String(ADMIN_ID)) {
        const channelLink = `https://t.me/${MAIN_CHANNEL.replace('@', '')}`;
        return bot.sendMessage(chatId, `Join Channel: ${channelLink}`);
    }
    
    try {
        await bot.sendMessage(chatId, "Sending file...");
        await bot.copyMessage(chatId, STORAGE_CHANNEL_ID, parseInt(code));
    } catch (err) {
        bot.sendMessage(chatId, "File not found!");
    }
});

// সাধারণ /start
bot.onText(/\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'User';
    await bot.sendMessage(chatId, `Hello ${firstName}!\nWelcome to Mobile Insight Bot!`);
});

console.log('Bot is running with Polling mode...');
