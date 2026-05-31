const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

// ১. কনফিগারেশন এবং টোকেন সেটআপ
const token = process.env.BOT_TOKEN; // রেন্ডারের Env-এ BOT_TOKEN সেট করা থাকতে হবে
const bot = new TelegramBot(token, { polling: true });

const app = express();
const port = process.env.PORT || 3000;

// ২. আপনার টেলিগ্রাম চ্যানেল ও অফিশিয়াল তথ্য
const CHANNEL_ID = "@Mobileinsight001";
const ADMIN_ID = 578493021; // ⚠️ এখানে আপনার আসল টেলিগ্রাম ইউজার আইডি বসান
const WEBSITE_NAME = "🍿 MobileInsight Web";
const WEBSITE_URL = "https://onrender.com"; // আপনার রেন্ডার ওয়েবসাইটের লিংক

// ৩. রেন্ডার সার্ভারের হোমপেজ ডিজাইন (প্রিমিয়াম ডার্ক মুভি থিম)
app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MobileInsight - Premium Movie Bot</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
            body { background: linear-gradient(135deg, #0f0c20, #06040a); color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; text-align: center; }
            .container { background: rgba(255, 255, 255, 0.03); padding: 40px 30px; border-radius: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5); max-width: 450px; width: 90%; animation: fadeIn 1s ease-in-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .logo { font-size: 60px; margin-bottom: 15px; display: inline-block; animation: pulse 2s infinite; }
            @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
            h1 { font-size: 28px; font-weight: 700; letter-spacing: 1px; background: linear-gradient(45deg, #ff416c, #ff4b2b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; }
            p { color: #b3b3b3; font-size: 15px; line-height: 1.6; margin-bottom: 25px; }
            .status-tag { background: rgba(46, 213, 115, 0.1); color: #2ed573; padding: 6px 15px; border-radius: 50px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(46, 213, 115, 0.2); margin-bottom: 25px; }
            .status-dot { width: 8px; height: 8px; background-color: #2ed573; border-radius: 50%; box-shadow: 0 0 8px #2ed573; }
            .btn { display: flex; align-items: center; justify-content: center; gap: 10px; background: linear-gradient(45deg, #7026ff, #3d148a); color: white; text-decoration: none; padding: 14px 20px; border-radius: 12px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 5px 15px rgba(112, 38, 255, 0.3); }
            .btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(112, 38, 255, 0.5); background: linear-gradient(45deg, #8242ff, #491aa1); }
            .footer { margin-top: 30px; font-size: 11px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🍿</div>
            <h1>MobileInsight Bot</h1>
            <p>আপনার প্রিয় মুভি ও ভিডিও ফাইল সরাসরি টেলিগ্রামে পাওয়ার সবচেয়ে দ্রুত এবং প্রিমিয়াম প্ল্যাটফর্ম।</p>
            <div class="status-tag"><div class="status-dot"></div>ST Flix Multi-Movie Backend Active</div>
            <a href="https://t.me" class="btn" target="_blank">🤖 ওপেন টেলিগ্রাম বট</a>
            <div class="footer">&copy; 2026 MobileInsight. All Rights Reserved.</div>
        </div>
    </body>
    </html>
    `);
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
});

// ৪. সাবস্ক্রিপশন চেক ফাংশন
async function checkSubscription(userId) {
    try {
        const member = await bot.getChatMember(CHANNEL_ID, userId);
        const status = member.status;
        return status === "member" || status === "administrator" || status === "creator";
    } catch (error) {
        return false;
    }
}

// ৫. Base64 এনকোড এবং ডিকোড ফাংশন
function encodeFileId(fileId) {
    return Buffer.from(fileId).toString('base64').replace(/=/g, '');
}
function decodeFileId(shortCode) {
    try {
        let padding = '='.repeat((4 - shortCode.length % 4) % 4);
        return Buffer.from(shortCode + padding, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

// 🎯 ৬. অ্যাডমিন ভিডিও দিলে বট অটোমেটিক নিজের ইউজারনেমসহ শর্ট লিংক বানিয়ে দেবে
async function handleAdminFile(msg, fileId) {
    if (msg.from.id === ADMIN_ID) {
        try {
            const botInfo = await bot.getMe();
            const botUsername = botInfo.username;
            const shortCode = encodeFileId(fileId);
            const finalLink = `https://t.me{botUsername}?start=${shortCode}`;
            
            const responseText = `🔗 *আপনার ওয়েবসাইটের জন্য লিংক তৈরি রেডি!*\n\n` +
                                 `এই লিংকটি কপি করে আপনার ওয়েবসাইটের ডাউনলোড বাটনে বসিয়ে দিন:\n\n` +
                                 `\`${finalLink}\``;
                                 
            bot.sendMessage(msg.chat.id, responseText, { parse_mode: "Markdown" });
        } catch (error) {
            bot.sendMessage(msg.chat.id, "❌ লিংক তৈরি করতে সমস্যা হয়েছে।");
        }
    }
}

bot.on("video", (msg) => handleAdminFile(msg, msg.video.file_id));
bot.on("document", (msg) => handleAdminFile(msg, msg.document.file_id));

// 📥 ৭. মেসেজ এবং স্টার্ট কমান্ড হ্যান্ডলার
bot.on("message", async (msg) => {
    if (msg.video || msg.document) return;
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const textInput = msg.text;

    // চ্যানেলে জয়েন করা আছে কিনা চেক
    const isSubscribed = await checkSubscription(userId);
    if (!isSubscribed) {
        return bot.sendMessage(chatId, "⚠️ *মুভিটি সরাসরি বটের ভেতর পেতে হলে আপনাকে আমাদের অফিশিয়াল চ্যানেলে জয়েন করতে হবে।*", {
            reply_markup: {
                inline_keyboard: [[{ text: "📢 Join Channel", url: `https://t.me{CHANNEL_ID.replace('@', '')}` }]]
            }
        });
    }

    // ইউজার যদি ওয়েবসাইট বা শর্ট লিংক থেকে আসে
    if (textInput.startsWith('/start ') && textInput.split(' ').length > 1) {
        const shortCode = textInput.split(' ')[1];
        const originalFileId = decodeFileId(shortCode);

        if (originalFileId && originalFileId.startsWith('BAACAg')) {
            const loadingMsg = await bot.sendMessage(chatId, "⏳ *আপনার ফাইলটি প্রসেস করা হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।*", { parse_mode: "Markdown" });
            try {
                await bot.sendVideo(chatId, originalFileId, {
                    caption: `✨ *আপনার অনুরোধ করা ভিডিও ফাইলটি রেডি!*\n\n🌐 আমাদের ওয়েবসাইট: [${WEBSITE_NAME}](${WEBSITE_URL})`,
                    parse_mode: "Markdown"
                });
                bot.deleteMessage(chatId, loadingMsg.message_id);
            } catch (error) {
                bot.sendMessage(chatId, "❌ *দুঃখিত! ফাইলটি টেলিগ্রাম সার্ভার থেকে মুছে ফেলা হয়েছে।*", { parse_mode: "Markdown" });
            }
        } else {
            bot.sendMessage(chatId, "⚠️ *দুঃখিত, এই লিংকটি সঠিক নয়।*", { parse_mode: "Markdown" });
        }
    } 
    // সাধারণ ভাবে /start লিখলে
    else if (textInput === '/start') {
        bot.sendMessage(chatId, `👋 *হ্যালো, ${msg.from.first_name || 'ইউজার'}!*\n\n🚀 *${WEBSITE_NAME}* এর অফিশিয়াল বটের ভেতর আপনাকে স্বাগতম।\n\n📥 বটের মাধ্যমে সরাসরি মুভি ফাইল পেতে প্রথমে আমাদের ওয়েবসাইটে যান এবং আপনার পছন্দের মুভির লিংকে ক্লিক করুন।`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [[{ text: `🌐 Visit ${WEBSITE_NAME}`, url: WEBSITE_URL }]]
            }
        });
    }
    // ইউজার যদি /menu লেখে তবে ইনলাইন বাটন মেনু আসবে
    else if (textInput === '/menu') {
        bot.sendMessage(chatId, `🛠️ *MobileInsight বটের প্রধান মেনু* \n\nনিচের বাটনগুলো ব্যবহার করে আপনার প্রয়োজনীয় অপশনটি বেছে নিন:`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🌐 আমাদের ওয়েবসাইট", url: WEBSITE_URL },
                        { text: "📢 অফিশিয়াল চ্যানেল", url: `https://t.me{CHANNEL_ID.replace('@', '')}` }
                    ]
                ]
            }
        });
    }
});

// 🛠️ ৮. বটের ইনপুট বক্সে স্থায়ী "Visit Web" মেনু বাটন সেটআপ
bot.setChatMenuButton({
    menu_button: JSON.stringify({
        type: "web_app",
        text: "🌐 Visit Web",
        web_app: { url: WEBSITE_URL }
    })
}).then(() => {
    console.log("Menu Button configured successfully!");
}).catch((err) => {
    console.log("Menu Button Error: ", err);
});

// ৯. বট সচল রাখা
bot.infinity_polling();
            
