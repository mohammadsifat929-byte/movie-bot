const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, {
    polling: true
});

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("ST Flix Backend is Running!");
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
});

const CHANNEL_ID = "@mobileinsight001"; 

// চ্যানেলে জয়েন আছে কি না চেক করার ফাংশন
async function checkSubscription(userId) {
    try {
        const member = await bot.getChatMember(CHANNEL_ID, userId);
        const status = member.status;
        return status === "member" || status === "administrator" || status === "creator";
    } catch (error) {
        console.log("Subscription Check Error:", error);
        return false;
    }
}

// বটে মেসেজ বা স্টার্ট কমান্ড আসলে যা হবে
bot.on("message", async (msg) => {
    if (!msg.text) return;
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const textInput = msg.text;

    // ১. প্রথমে চেক করবে ইউজার চ্যানেলে জয়েন আছে কি না
    const isSubscribed = await checkSubscription(userId);

    if (!isSubscribed) {
        // যদি জয়en না থাকে, তবে তাকে আটকে দেবে এবং জয়েন করার বাটন দেখাবে
        return bot.sendMessage(chatId, "⚠️ দুঃখিত! মুভিটি ডাউনলোড করতে হলে আপনাকে প্রথমে আমাদের অফিসিয়াল চ্যানেলে জয়েন করতে হবে।\n\nনিচের বাটনে ক্লিক করে জয়েন করুন এবং তারপর আবার আপনার ওয়েবসাইটে গিয়ে ডাউনলোডে চাপুন।", {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📢 Join Channel", url: "https://t.me" }
                    ]
                ]
            }
        });
    }

    // ২. ইউজার জয়েন থাকলে নিচের লজিক কাজ করবে
    
    // ওয়েবসাইট থেকে 'দাগী' মুভির লিংকে ক্লিক করে আসলে এই মেসেজটি কাজ করবে
    if (textInput.includes("/start dagi_movie") || textInput.toLowerCase() === "dagi" || textInput.includes("দাগী")) {
        
        // এখানে আপনার 'দাগী' মুভির পোস্টার বা স্ক্রিনশট লিংক দিন
        const photoUrl = "https://prothomalo.com"; 
        
        // এখানে আপনার চ্যানেলের সেই নির্দিষ্ট ভিডিও ফাইল বা পোস্টের আসল লিংকটি বসিয়ে দিন
        const movieFileUrl = "https://t.me/123"; // (আপনার ফাইল লিংকটি এখানে বসান)

        const captionText = `🎬 **দাগী (Dagi) Full Movie**\n\nআপনার মুভিটি রেডি আছে। নিচে থাকা ডাউনলোড বাটনে ক্লিক করে সরাসরি ফুল স্পিডে ডাউনলোড বা অনলাইন প্লে করে দেখতে পারেন। 🎉`;

        bot.sendPhoto(chatId, photoUrl, {
            caption: captionText,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📥 Download / Watch Movie", url: movieFileUrl }
                    ]
                ]
            }
        }).catch((err) => console.log(err));
    } 
    // সাধারণ স্টার্ট দিলে যা দেখাবে
    else if (textInput === "/start") {
        bot.sendMessage(chatId, "🎬 ST Flix Bot-এ আপনাকে স্বাগতম! মুভি পেতে আপনার ওয়েবসাইট ভিজিট করুন অথবা মুভির নাম লিখুন।");
    }
});
