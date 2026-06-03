const Tconst TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// ১. এক্সপ্রেস (Express) সার্ভার সেটআপ (Render Port Timeout Fix)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Movie Bot is alive and running!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server successfully listening on port ${PORT}`);
});

// ২. এনভায়রনমেন্ট ভেরিয়েবল এবং কনফিগারেশন
const token = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID || 8695023288;
const CHANNEL_ID = process.env.CHANNEL_ID || '@MobileInsight001';
const WEBSITE_NAME = process.env.WEBSITE_NAME || 'ST FLIX WEB';
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://blogspot.com';

// বট ইনিশিয়ালাইজ করা
const bot = new TelegramBot(token, { polling: true });

let botUsername = '';

// ৩. বট চালু হওয়ার পর মেনু বাটন সেটআপ
bot.getMe().then((me) => {
    botUsername = me.username;
    console.log(`Bot initialized with username: @${botUsername}`);

    // চ্যাট মেনু বাটন (Web App) সেট করা
    bot.setChatMenuButton({
        menu_button: JSON.stringify({
            type: 'web_app',
            text: 'Visit Web',
            web_app: { url: WEBSITE_URL }
        })
    }).then(() => {
        console.log("Menu Button configured successfully!");
    }).catch((err) => {
        console.error("Menu Button Error: ", err);
    });

}).catch((err) => {
    console.error("Failed to fetch bot username:", err.message);
});

// ৪. আইডি এনকোড ও ডিকোড করার ফাংশন
function encodeFileId(fileId) {
    return Buffer.from(fileId).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeFileId(shortCode) {
    try {
        let base64 = shortCode.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        return Buffer.from(base64, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

// ৫. চ্যানেল সাবস্ক্রিপশন চেক করার ফাংশন
async function checkSubscription(userId) {
    if (Number(userId) === Number(ADMIN_ID)) return true;
    try {
        const member = await bot.getChatMember(CHANNEL_ID, userId);
        const status = member.status;
        return ['creator', 'administrator', 'member'].includes(status);
    } catch (error) {
        console.error("Subscription check error:", error.message);
        return false;
    }
}

// ৬. অ্যাডমিন ফাইল পাঠালে শর্ট লিঙ্ক তৈরি করা
async function handleAdminFile(msg, fileId) {
    if (Number(msg.from.id) !== Number(ADMIN_ID)) return;
    try {
        const shortCode = encodeFileId(fileId);
        const finalLink = `https://t.me{botUsername}?start=${shortCode}`;
        
        const responseText = `✅ **আপনার ফাইলের শর্ট লিঙ্ক তৈরি হয়েছে!** \n\nনিচের লিঙ্কটি কপি করে আপনার ওয়েবসাইটে বসিয়ে দিন:\n\n\`${finalLink}\``;
        
        await bot.sendMessage(msg.chat.id, responseText, { parse_mode: "Markdown" });
    } catch (error) {
        console.error("Link creation error:", error.message);
        await bot.sendMessage(msg.chat.id, "❌ লিঙ্ক তৈরি করতে সমস্যা হয়েছে!");
    }
}

bot.on("video", (msg) => handleAdminFile(msg, msg.video.file_id));
bot.on("document", (msg) => handleAdminFile(msg, msg.document.file_id));

// ৭. ইউজার মেসেজ হ্যান্ডেলার
bot.on("message", async (msg) => {
    if (msg.video || msg.document) return; 
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const textInput = msg.text;

    // লিঙ্ক থেকে আসা স্টার্ট কমান্ড চেক করা
    if (textInput.startsWith('/start') && textInput.split(' ').length > 1) {
        const parts = textInput.split(' ');
        const shortCode = parts[1];
        
        try {
            const isSubscribed = await checkSubscription(userId);
            
            if (!isSubscribed) {
                const cleanChannel = CHANNEL_ID.replace('@', '');
                return await bot.sendMessage(chatId, `⚠️ **আমাদের ফাইল ডাউনলোড করতে হলে আমাদের অফিশিয়াল চ্যানেলে জয়েন হতে হবে।**`, {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📢 আমাদের চ্যানেল জয়েন করুন",
                                    url: `https://t.me{cleanChannel}`
                                }
                            ]
                        ]
                    }
                });
            }

            const originalFileId = decodeFileId(shortCode);
            
            if (originalFileId) {
                const loadingMsg = await bot.sendMessage(chatId, `⏳ **আপনার ফাইলটি প্রসেস করা হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।**`);
                
                try {
                    await bot.sendVideo(chatId, originalFileId, {
                        caption: `🎬 **আপনার অনুরোধ করা ফাইলটি রেডি!**\n\n🌐 **আমাদের ওয়েবসাইট:** [${WEBSITE_NAME}](${WEBSITE_URL})`,
                        parse_mode: "Markdown"
                    });
                    await bot.deleteMessage(chatId, loadingMsg.message_id);
                } catch (error) {
                    console.error("File sending error:", error.message);
                    await bot.sendMessage(chatId, "❌ দুঃখিত! ফাইলটি টেলিগ্রাম সার্ভার থেকে খুঁজে পাওয়া যায়নি।");
                }
            } else {
                await bot.sendMessage(chatId, "❌ **দুঃখিত, এই লিঙ্কটি সঠিক নয়।**", { parse_mode: "Markdown" });
            }

        } catch (error) {
            console.error("Subscription Check Flow Error:", error.message);
        }

    } else if (textInput === '/start') {
        // সাধারণ স্টার্ট কমান্ড
        await bot.sendMessage(chatId, `👋 **হ্যালো ${msg.from.first_name || 'ইউজার'}!**\n\nআমি [${WEBSITE_NAME}](${WEBSITE_URL}) এর অফিসিয়াল ফাইল শেয়ারিং বট। মুভি বা ফাইল ডাউনলোড করতে দয়া করে ওয়েবসাইটের লিঙ্ক ব্যবহার করুন।`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🌐 Visit Website", url: WEBSITE_URL }
                    ]
                ]
            }
        });

    } else if (textInput === '/menu') {
        // মেনু কমান্ড লজিক
        const cleanChannelMenu = CHANNEL_ID.replace('@', '');
        await bot.sendMessage(chatId, `**👇 মেনু অপশনসমূহ:**\n\nনিচের বাটনগুলো ব্যবহার করে আপনার প্রয়োজনীয় অপশনটি বেছে নিন।`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🌐 আমাদের ওয়েবসাইট", url: WEBSITE_URL }
                    ],
                    [
                        { text: "📢 অফিশিয়াল চ্যানেল", url: `https://t.me{cleanChannelMenu}` }
                    ]
                ]
            }
        });
    }
});

// ৮. এরর হ্যান্ডেলিং (যেন বট ক্র্যাশ না করে)
bot.on("polling_error", (err) => console.log("Polling error handled: ", err.message));
bot.on("error", (err) => console.log("General error handled: ", err.message));

