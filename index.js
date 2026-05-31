const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const app = express();
const port = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("ST Flix Multi-Movie Backend is Running!"));
app.listen(port, "0.0.0.0", () => console.log(`Server running on port ${port}`));

const CHANNEL_ID = "@Mobileinsight001";
// 🚨 এখানে আপনার নিজের আসল টেলিগ্রাম অ্যাকাউন্টের User ID দিন (যাতে অন্য কেউ লিংক জেনারেট করতে না পারে)
const ADMIN_ID = 8695023288; 

// বটের ইউজারনেম (অটো লিংক তৈরির জন্য)
const BOT_USERNAME = "Mobileinsight0Bot"; 
const WEBSITE_NAME = "🍿 MobileInsight Web";
const WEBSITE_URL = "https://yourwebsite.com"; 

async function checkSubscription(userId) {
    try {
        const member = await bot.getChatMember(CHANNEL_ID, userId);
        const status = member.status;
        return status === "member" || status === "administrator" || status === "creator";
    } catch (error) {
        return false;
    }
}

// Base64 এনকোড এবং ডিকোড ফাংশন
function encodeFileId(fileId) {
    return Buffer.from(fileId).toString('base64').replace(/=/g, '');
}
function decodeFileId(shortCode) {
    try {
        let padding = '=' * (4 - shortCode.length % 4);
        return Buffer.from(shortCode + padding, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

// 🎯 ১. ফাইল বা ভিডিও দিলে বট অটোমেটিক ওয়েবসাইটের জন্য শর্ট লিংক বানিয়ে দেবে (শুধু অ্যাডমিনের জন্য)
function handleAdminFile(msg, fileId) {
    if (msg.from.id === ADMIN_ID) {
        const shortCode = encodeFileId(fileId);
        const finalLink = `https://t.me{BOT_USERNAME}?start=${shortCode}`;
        
        const responseText = `🔗 *আপনার ওয়েবসাইটের জন্য লিংক তৈরি রেডি!*\n\n` +
                             `এই লিংকটি কপি করে আপনার ওয়েবসাইটের ডাউনলোড বাটনে বসিয়ে দিন:\n\n` +
                             `\`${finalLink}\``;
                             
        bot.sendMessage(msg.chat.id, responseText, { parse_mode: "Markdown" });
    }
}

bot.on("video", (msg) => handleAdminFile(msg, msg.video.file_id));
bot.on("document", (msg) => handleAdminFile(msg, msg.document.file_id));

// 📥 ২. সাধারণ ইউজারদের মেসেজ প্রসেসিং সিস্টেম
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
            reply_markup: { inline_keyboard: [[{ text: "📢 Join Channel", url: `https://t.me{CHANNEL_ID.replace('@', '')}` }]] }
        });
    }

    // ইউজার যদি ওয়েবসাইট থেকে শর্ট লিংক নিয়ে আসে
    if (textInput.startsWith('/start ') && textInput.split(' ').length > 1) {
        const shortCode = textInput.split(' ')[1];
        const originalFileId = decodeFileId(shortCode);

        if (originalFileId && originalFileId.startsWith('BAACAg')) {
            const loadingMsg = await bot.sendMessage(chatId, "⏳ *আপনার ফাইলটি প্রসেস করা হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।*", { parse_mode: "Markdown" });
            try {
                await bot.sendVideo(chatId, originalFileId, {
                    caption: `✨ *আপনার অনুরোধ করা ভিডিও ফাইলটি রেডি!*\n\n🌐 আমাদের ওয়েবসাইট: [${websiteName}](${websiteUrl})`,
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
        bot.sendMessage(chatId, `👋 *হ্যালো, ${msg.from.first_name || 'ইউজার'}!*\n\n🚀 *${WEBSITE_NAME}* এর অফিশিয়াল বটের ভেতর আপনাকে স্বাগতম।`, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [[{ text: `🌐 Visit ${WEBSITE_NAME}`, url: WEBSITE_URL }]] }
        });
    }
});
