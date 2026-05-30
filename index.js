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

// সাবস্ক্রিপশন চেক ফাংশন
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

// ১. এই বিশেষ ফিচারটি আপনাকে যেকোনো ফাইলের File ID বের করে দেবে
bot.on("video", (msg) => {
    // আপনি নিজের আইডি থেকে ফাইল পাঠালে বট আপনাকে আইডিটি টেক্সট করবে
    bot.sendMessage(msg.chat.id, `🎯 আপনার ভিডিওর গোপন File ID:\n\n\`${msg.video.file_id}\``, { parse_mode: "Markdown" });
});

bot.on("document", (msg) => {
    // যদি ফাইলটি ডকুমেন্ট (Uncompressed) হিসেবে থাকে
    bot.sendMessage(msg.chat.id, `🎯 আপনার ডকুমেন্টের গোপন File ID:\n\n\`${msg.document.file_id}\``, { parse_mode: "Markdown" });
});


// ২. বটের মূল মেসেজ হ্যান্ডলিং সিস্টেম
bot.on("message", async (msg) => {
    // ভিডিও বা ডকুমেন্ট মেসেজ হলে নিচে আর কাজ করবে না (আইডি পাওয়ার জন্য)
    if (msg.video || msg.document) return; 
    if (!msg.text) return;
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const textInput = msg.text;

    // মেম্বারশিপ ভেরিফিকেশন (চ্যানেলে জয়েন না থাকলে আগে আটকে দেবে)
    const isSubscribed = await checkSubscription(userId);

    if (!isSubscribed) {
        return bot.sendMessage(chatId, "⚠️ দুঃখিত! মুভিটি সরাসরি বটে দেখতে হলে আপনাকে প্রথমে আমাদের অফিসিয়াল চ্যানেলে জয়েন করতে হবে।\n\nনিচের বাটনে ক্লিক করে জয়েন করুন এবং তারপর আবার আপনার ওয়েবসাইট থেকে ডাউনলোডে চাপুন।", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📢 Join Channel", url: "https://t.me" }]
                ]
            }
        });
    }

    // ইউজার জয়েন থাকলে ওয়েবসাইট লিংকের রেসপন্স এখান থেকে কাজ করবে
    if (textInput.includes("/start dagi_movie")) {
        
        // ⚠️ কাজ: বট থেকে পাওয়া আসল দীর্ঘ File ID টি নিচের জোড়া উদ্ধৃতির (" ") মাঝে বসিয়ে দিন
        const dagiMovieFileId = "এখানে_বট_থেকে_পাওয়া_গোপন_File_ID_বসাবেন"; 

        bot.sendMessage(chatId, "⏳ আপনার মুভিটি সরাসরি বটের ভেতর লোড হচ্ছে, দয়া করে কয়েক সেকেন্ড অপেক্ষা করুন...");

        // সরাসরি বটের চ্যাট বক্সে প্রাইভেট চ্যানেলের ভিডিওটি ওপেন করা
        bot.sendVideo(chatId, dagiMovieFileId, {
            caption: "🎬 **দাগী (Dagi) Full Movie**\n\nআপনার মুভিটি সরাসরি বটের ভেতর ওপেন হয়েছে। কোনো থার্ডপার্টি লিংক ছাড়াই এখানেই প্লে করে দেখতে পারেন! 🎉"
        }).catch((err) => {
            bot.sendMessage(chatId, "❌ দুঃখিত, ফাইল আইডিতে কোনো ভুল রয়েছে অথবা ফাইলটি পাওয়া যায়নি।");
            console.log(err);
        });
    } 
    
    else if (textInput === "/start") {
        bot.sendMessage(chatId, "🎬 ST Flix Bot-এ আপনাকে স্বাগতম! মুভি সরাসরি বটের ভেতর দেখতে আমাদের ওয়েবসাইট ভিজিট করুন।");
    }
});
