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
const WEBSITE_NAME = process.env.WEBSITE_NAME || 'STFIX.com';
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://blogspot.com';

// বট ইনিশিয়ালাইজ করা
const bot = new TelegramBot(token, { polling: true });

// বটের নিজের ইউজারনেম অটোমেটিকভাবে সেভ করার ভ্যারিয়েবল
let botUsername = '';

bot.getMe().then((me) => {
    botUsername = me.username;
    console.log(`Bot initialized with username: @${botUsername}`);
}).catch((err) => {
    console.error("Failed to fetch bot username:", err.message);
});

// ইন-মেমোরি ডেটাবেস (লিঙ্ক ছোট করার জন্য ফাইল আইডি সেভ করে রাখার অবজেক্ট)
const linkDatabase = {};
let linkCounter = Date.now(); // ইউনিক ছোট আইডি জেনারেট করার জন্য টাইমস্ট্যাম্প

// =======================================================
// ৩. ফাইল আইডি ছোট (Short) করার ফাংশন
// =======================================================
function generateShortCode(fileId) {
    linkCounter++;
    // নাম্বারকে Base36 এ রূপান্তর করে ছোট স্ট্রিং তৈরি করা (যেমন: l7x9z2)
    const shortCode = linkCounter.toString(36); 
    linkDatabase[shortCode] = fileId;
    return shortCode;
}

function getFileIdFromCode(shortCode) {
    return linkDatabase[shortCode] || null;
}

// =======================================================
// ৪. চ্যানেল সাবস্ক্রিপশন চেক ফাংশন
// =======================================================
async function checkSubscription(userId) {
    if (userId == ADMIN_ID) return true; // অ্যাডমিন হলে চেক করার প্রয়োজন নেই
    
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
// ৫. অ্যাডমিন ফাইল হ্যান্ডলিং ফাংশন (অটো ইউজারনেম ও অতি সংক্ষিপ্ত লিঙ্ক)
// =======================================================
async function handleAdminFile(msg, fileId) {
    if (msg.from.id == ADMIN_ID) {
        try {
            // যদি কোনো কারণে ইউজারনেম লোড না হয়ে থাকে, আবার ট্রাই করবে
            if (!botUsername) {
                const me = await bot.getMe();
                botUsername = me.username;
            }

            const shortCode = generateShortCode(fileId);
            // অতি সংক্ষিপ্ত লিঙ্ক জেনারেট (কোনো বড় Base64 টেক্সট থাকবে না)
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

bot.on('video', (msg) => handleAdminFile(msg, msg.video.file_id));
bot.on('document', (msg) => handleAdminFile(msg, msg.document.file_id));

bot.on('message', async (msg) => {
    if (msg.video || msg.document) return; 
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const textInput = msg.text;

    try {
        // ১. সাবস্ক্রিপশন চেক (জয়েন না থাকলে আটকে দেওয়া হবে)
        const isSubscribed = await checkSubscription(userId);

        if (!isSubscribed) {
            const cleanChannel = CHANNEL_ID ? CHANNEL_ID.replace('@', '') : 'MobileInsight001';

            return await bot.sendMessage(chatId, `👋 **স্বাগতম! বটের সার্ভিস ব্যবহার করতে আপনাকে আমাদের চ্যানেলে জয়েন করতে হবে।**\n\n⚠️ **সতর্কবার্তা:** আপনি আমাদের পাবলিক টেলিগ্রাম চ্যানেলে জয়েন না করা পর্যন্ত বটের কোনো মুভি লিঙ্ক, মেনু বা অন্য কোনো সুবিধা কাজ করবে না!\n\n👇 নিচের বাটনে ক্লিক করে দ্রুত জয়েন করে নিন।`, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { 
                                text: "📢 আমাদের চ্যানেলে জয়েন করুন (Join Channel)", 
                                url: `https://t.me{cleanChannel}` 
                            }
                        ]
                    ]
                }
            });
        }

        // =======================================================
        // ২. ইউজার জয়েন থাকলে নিচের মেইন ফিচারগুলো কাজ করবে
        // =======================================================

        // ক) ওয়েবসাইট থেকে শর্টলিংক এর মাধ্যমে আসলে (যেমন: /start l7x9z2)
        if (textInput.startsWith('/start') && textInput.split(' ').length > 1) {
            const parts = textInput.split(' ');
            const shortCode = parts[1]; // সঠিক প্যারামিটারটি নেওয়া হলো
            const originalFileId = getFileIdFromCode(shortCode);

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
                await bot.sendMessage(chatId, "❌ দুঃখিত, এই লিঙ্কটির মেয়াদ শেষ হয়ে গেছে অথবা লিঙ্কটি সঠিক নয়।", { parse_mode: "Markdown" });
            }
        } 
        
        // খ) সাধারণ /start কমান্ড দিলে
        else if (textInput === '/start') {
            const firstName = msg.from.first_name || 'ইউজার';
            await bot.sendMessage(chatId, `👋 স্বাগতম **${firstName}**!\n\nআমাদের বটটি সফলভাবে আপনার অ্যাকাউন্টের সাথে যুক্ত হয়েছে। [${WEBSITE_NAME}](${WEBSITE_URL}) এ ভিজিট করতে নিচের বাটনে ক্লিক করুন।`, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [[{ text: "🌐 Visit Website", url: WEBSITE_URL }]]
                }
            });
        } 
        
        // গ) সাধারণ /menu কমান্ড দিলে
        else if (textInput === '/menu') {
            const cleanChannelMenu = CHANNEL_ID ? CHANNEL_ID.replace('@', '') : 'MobileInsight001';

            await bot.sendMessage(chatId, "📱 **মেনু অপশনসমূহ:**\n\nনিচের বাটনগুলো ব্যবহার করে আপনার প্রয়োজনীয় অপশনটি বেছে নিন।", {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [ { text: "🌐 আমাদের ওয়েবসাইট", url: WEBSITE_URL } ],
                        [ { text: "🔗 অফিসিয়াল চ্যানেল", url: `https://t.me{cleanChannelMenu}` } ]
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

bot.on("polling_error", (err) => console.log("Polling error handled:", err.message));
bot.on("error", (err) => console.log("General error handled:", err.message));
    
