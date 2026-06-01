const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// =======================================================
// ১. এক্সপ্রেস (Express) সার্ভার সেটআপ (Render Port Timeout Fix)
// =======================================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Movie Bot is alive and running!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server successfully listening on port ${PORT}`);
});

// =======================================================
// ২. এনভায়রনমেন্ট ভেরিয়েবল এবং কনফিগারেশন
// =======================================================
const token = process.env.BOT_TOKEN;

const ADMIN_ID = process.env.ADMIN_ID || 8695023288;
const CHANNEL_ID = process.env.CHANNEL_ID || '@MobileInsight001';
const WEBSITE_NAME = process.env.WEBSITE_NAME || 'ST FLIX.WEB';
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://stfix.blogspot.com/?m=1'; // ইউআরএলটি সাধারণ রাখা হলো এরর এড়াতে

// বট ইনিশিয়ালাইজ করা
const bot = new TelegramBot(token, { polling: true });

// =======================================================
// ৩. ফাইল আইডি এনকোড ও ডিকোড ফাংশন
// =======================================================
function encodeFileId(fileId) {
    return Buffer.from(fileId).toString('base64').replace(/=/g, '');
}

function decodeFileId(shortCode) {
    try {
        return Buffer.from(shortCode, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

// =======================================================
// ৪. চ্যানেল সাবস্ক্রিপশন চেক ফাংশন
// =======================================================
async function checkSubscription(userId) {
    try {
        const member = await bot.getChatMember(CHANNEL_ID, userId);
        const status = member.status;
        return ['creator', 'administrator', 'member'].includes(status);
    } catch (error) {
        console.error("Subscription check error:", error.message);
        return false; 
    }
}

// =======================================================
// ৫. অ্যাডমিন ফাইল হ্যান্ডলিং ফাংশন
// =======================================================
async function handleAdminFile(msg, fileId) {
    if (msg.from.id == ADMIN_ID) {
        try {
            const botInfo = await bot.getMe();
            const botUsername = botInfo.username;
            const shortCode = encodeFileId(fileId);
            const finalLink = `https://t.me{botUsername}?start=${shortCode}`;

            const responseText = `✅ **আপনার ফাইলের শর্ট লিঙ্ক রেডি!**\n\nনিচের লিঙ্কটি কপি করে আপনার ওয়েবসাইটের বাটনে বসিয়ে দিন:\n\n\`${finalLink}\``;

            await bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error("Link creation error:", error.message);
            await bot.sendMessage(msg.chat.id, "❌ লিঙ্ক তৈরি করতে সমস্যা হয়েছে!");
        }
    }
}

// =======================================================
// ৬. ইনকামিং মেসেজ ও কমান্ড হ্যান্ডলার
// =======================================================

// অ্যাডমিন ভিডিও বা ডকুমেন্ট দিলে তা রিসিভ করা
bot.on('video', (msg) => handleAdminFile(msg, msg.video.file_id));
bot.on('document', (msg) => handleAdminFile(msg, msg.document.file_id));

// সাধারণ মেসেজ, স্টার্ট ও মেনু হ্যান্ডলিং
bot.on('message', async (msg) => {
    if (msg.video || msg.document) return; // অ্যাডমিন ফাইল দিলে এই লজিক কাজ করবে না
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const textInput = msg.text;

    // --- চ্যানেল সাবস্ক্রিপশন চেক ---
    try {
        const isSubscribed = await checkSubscription(userId);

        if (!isSubscribed) {
            const cleanChannel = CHANNEL_ID ? CHANNEL_ID.replace('@', '') : 'MobileInsight001';

            return await bot.sendMessage(chatId, `⚠️ **অনুগ্রহ করে প্রথমে আমাদের পাবলিক চ্যানেলে জয়েন করুন, তারপর আবার বাটন ক্লিক করুন!**`, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { 
                                text: "📢 পাবলিক চ্যানেলে জয়েন করুন", 
                                url: `https://t.me{cleanChannel}` // ব্যাকটিক ও স্ল্যাশ ফিক্স
                            }
                        ]
                    ]
                }
            });
        }

        // --- ইউজার জয়েন থাকলে মেইন ফিচার কাজ করবে ---

        // ক) শর্টলিংক চেক করে মুভি/ফাইল পাঠানো (যেমন: /start BAAchg...)
        if (textInput.startsWith('/start') && textInput.split(' ').length > 1) {
            const parts = textInput.split(' ');
            const shortCode = parts[1];
            const originalFileId = decodeFileId(shortCode);

            if (originalFileId) {
                const loadingMsg = await bot.sendMessage(chatId, "⏳ আপনার ফাইলটি প্রসেস করা হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।");
                
                try {
                    await bot.sendVideo(chatId, originalFileId, {
                        caption: `✨ **আপনার অনুরোধ করা ফাইলটি রেডি!**\n\n🌐 আমাদের ওয়েবসাইট: [${WEBSITE_NAME}](${WEBSITE_URL})`,
                        parse_mode: "Markdown"
                    });

                    await bot.deleteMessage(chatId, loadingMsg.message_id);
                } catch (error) {
                    console.error("File sending error:", error.message);
                    await bot.sendMessage(chatId, "❌ দুঃখিত! ফাইলটি টেলিগ্রাম সার্ভার থেকে খুঁজে পাওয়া যায়নি।");
                }
            } else {
                await bot.sendMessage(chatId, "❌ দুঃখিত, এই লিঙ্কটি সঠিক নয়।", { parse_mode: "Markdown" });
            }
        } 
        
        // খ) সাধারণ /start কমান্ড হ্যান্ডল করা
        else if (textInput === '/start') {
            const firstName = msg.from.first_name || 'ইউজার';
            await bot.sendMessage(chatId, `👋 স্বাগতম **${firstName}**!\n\n[${WEBSITE_NAME}](${WEBSITE_URL}) এ ভিজিট করার জন্য নিচের বাটনে ক্লিক করুন।`, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [[{ text: "🌐 Visit Website", url: WEBSITE_URL }]]
                }
            });
        } 
        
        // গ) সাধারণ /menu কমান্ড হ্যান্ডল করা
        else if (textInput === '/menu') {
            const cleanChannelMenu = CHANNEL_ID ? CHANNEL_ID.replace('@', '') : 'MobileInsight001';

            await bot.sendMessage(chatId, "📱 **মেনু অপশনসমূহ:**\n\nনিচের বাটনগুলো ব্যবহার করে আপনার প্রয়োজনীয় অপশনটি বেছে নিন।", {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [ { text: "🌐 আমাদের ওয়েবসাইট", url: WEBSITE_URL } ],
                        [ { text: "🔗 অফিসিয়াল চ্যানেল", url: `https://t.me{cleanChannelMenu}` } ] // ব্যাকটিক ও স্ল্যাশ ফিক্স
                    ]
                }
            });
        }

    } catch (error) {
        console.error("Subscription Check Flow Error:", error.message);
    }
});

// =======================================================
// ৭. বট মেনু বাটন এবং এরর হ্যান্ডলিং
// =======================================================

bot.setChatMenuButton({
    menu_button: JSON.stringify({
        type: 'web_app',
        text: 'Visit Web',
        web_app: { url: WEBSITE_URL }
    })
})
.then(() => console.log("Menu Button configured successfully!"))
.catch((err) => console.log("Menu Button Error: ", err));

// গ্লোবাল এরর হ্যান্ডলিং (যাতে বট ক্র্যাশ না করে)
bot.on("polling_error", (err) => console.log("Polling error handled:", err.message));
bot.on("error", (err) => console.log("General error handled:", err.message));
