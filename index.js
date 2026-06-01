const TelegramBot = require('node-telegram-bot-api');

// ১. এনভায়রনমেন্ট ভ্যারিয়েবল থেকে ডাটা নেওয়া (Render ড্যাশবোর্ড থেকে মিলবে)
const token = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID || 8695023288;
const CHANNEL_ID = process.env.CHANNEL_ID || '@MobileInsight001';
const WEBSITE_NAME = process.env.WEBSITE_NAME || 'STFIX.com';
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://stfix.blogspot.com/?m=1';

// বট ইনিশিয়ালাইজ করা
const bot = new TelegramBot(token, { polling: true });

// ২. ফাইলের আইডি এনকোড করার ফাংশন (লিংক তৈরির জন্য)
function encodeFileId(fileId) {
    return Buffer.from(fileId).toString('base64').replace(/=/g, '');
}

// ৩. ফাইলের আইডি ডিকোড করার ফাংশন (লিংক থেকে ফাইল বের করার জন্য)
function decodeFileId(shortCode) {
    try {
        return Buffer.from(shortCode, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

// ৪. চ্যানেল মেম্বারশিপ বা সাবস্ক্রিপশন চেক করার ফাংশন
async function checkSubscription(userId) {
    try {
        const member = await bot.getChatMember(CHANNEL_ID, userId);
        const status = member.status;
        return ['creator', 'administrator', 'member'].includes(status);
    } catch (error) {
        console.error("Subscription check error:", error.message);
        return false; // কোনো এরর হলে তাকে আন-সাবস্ক্রাইবড ধরা হবে
    }
}

// ۵. অ্যাডমিন ভিডিও বা ডকুমেন্ট পাঠালে শর্ট লিংক তৈরি করার ফাংশন
async function handleAdminFile(msg, fileId) {
    if (msg.from.id == ADMIN_ID) {
        try {
            const botInfo = await bot.getMe();
            const botUsername = botInfo.username;
            const shortCode = encodeFileId(fileId);
            const finallink = `https://t.me{botUsername}?start=${shortCode}`;

            const responseText = `✅ **আপনার ফাইলের শর্ট লিংক রেডি!**\n\nনিচের লিংকটি কপি করে আপনার ওয়েবসাইটের বাটনে বসিয়ে দিন:\n\n\`${finallink}\``;

            await bot.sendMessage(msg.chat.id, responseText, { parse_mode: "Markdown" });
        } catch (error) {
            console.error("Link creation error:", error.message);
            await bot.sendMessage(msg.chat.id, "❌ লিংক তৈরি করতে সমস্যা হয়েছে!");
        }
    }
}

// অ্যাডমিন কোনো ফাইল বা ভিডিও দিলে তা রিসিভ করা
bot.on("video", (msg) => handleAdminFile(msg, msg.video.file_id));
bot.on("document", (msg) => handleAdminFile(msg, msg.document.file_id));

// ৬. ইউজার মেসেজ হ্যান্ডল করার প্রধান লজিক
bot.on("message", async (msg) => {
    if (msg.video || msg.document) return; // অ্যাডমিন ফাইল দিলে এই লজিক কাজ করবে না
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const textInput = msg.text;

    // 🚨 ফিচার ১: চ্যানেল সাবস্ক্রিপশন কঠোরভাবে চেক করা
    try {
        const isSubscribed = await checkSubscription(userId);
        
        if (!isSubscribed) {
            const cleanChannel = CHANNEL_ID ? CHANNEL_ID.replace('@', '') : 'MobileInsight001';
            
            // ইউজার জয়েন না থাকলে সরাসরি শুধু এই নোটিশটি যাবে এবং কোড এখানেই আটকে যাবে
            return await bot.sendMessage(chatId, `⚠️ **অনুগ্রহ করে আগে আমাদের পাবলিক চ্যানেলে জয়েন হোন, তারপর বটের কাজ করতে পারবেন।**`, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { 
                                text: "📢 পাবলিক চ্যানেলে জয়েন করুন", 
                                url: `https://t.me{cleanChannel}` 
                            }
                        ]
                    ]
                }
            });
        }
    } catch (error) {
        console.error("Subscription Check Flow Error:", error.message);
    }

    // --- ইউজার জয়েন থাকলে কেবল নিচের এই ফিচারগুলো কাজ করবে ---

    // 🚨 ফিচার ২: ইউনিক কোড চেক করে মুভি/ফাইল পাঠানো (যেমন: /start BAAChg...)
    if (textInput.startsWith('/start') && textInput.split(' ').length > 1) {
        const parts = textInput.split(' ');
        const shortCode = parts[1]; // শর্ট কোডটি আলাদা করা
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
            await bot.sendMessage(chatId, "❌ দুঃখিত, এই লিংকটি সঠিক নয়।", { parse_mode: "Markdown" });
        }
    } 
    // 🚨 ফিচার ৩: সাধারণ /start কমান্ড হ্যান্ডেল করা
    else if (textInput === '/start') {
        await bot.sendMessage(chatId, `👋 হ্যালো ${msg.from.first_name || 'ইউজার'}! [${WEBSITE_NAME}](${WEBSITE_URL}) এর অফিশিয়াল বটে আপনাকে স্বাগত।`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [[{ text: "🌐 Visit Website", url: WEBSITE_URL }]]
            }
        });
    } 
    // 🚨 িফিচার ৪: সাধারণ /menu কমান্ড হ্যান্ডেল করা
    else if (textInput === '/menu') {
        const cleanChannelMenu = CHANNEL_ID ? CHANNEL_ID.replace('@', '') : 'MobileInsight001';
        await bot.sendMessage(chatId, `📋 **মেনু অপশনসমূহ:**\n\nনিচের বাটনগুলো ব্যবহার করে আপনার প্রয়োজনীয় অপশনটি বেছে নিন।`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🌐 আমাদের ওয়েবসাইট", url: WEBSITE_URL }],
                    [{ text: "📢 অফিশিয়াল চ্যানেল", url: `https://t.me{cleanChannelMenu}` }]
                ]
            }
        });
    }
});

// 🚨 ফিচার ৫: সাইটের নিচের দিকে টেক্সট মেনু বাটন (Web App) সেট করা
bot.setChatMenuButton({
    menu_button: JSON.stringify({
        type: 'web_app',
        text: 'Visit Web',
        web_app: { url: WEBSITE_URL }
    })
})
.then(() => console.log("Menu Button configured successfully!"))
.catch((err) => console.log("Menu Button Error: ", err));

// 🚨 ফিচার ৬: গ্লোবাল এরর হ্যান্ডলিং (যা বটকে কখনোই ক্র্যাশ করতে দেবে না)
bot.on("polling_error", (err) => console.log("Polling error handled:", err.message));
bot.on("error", (err) => console.log("General error handled:", err.message));
