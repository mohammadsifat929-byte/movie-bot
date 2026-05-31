const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, {
    polling: true
});

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("ST Flix Multi-Movie Backend is Running!");
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

// ফাইল আইডি বের করার সিস্টেম (ভিডিও বা ফাইল ফরোয়ার্ড করলে আইডি দেবে)
bot.on("video", (msg) => {
    bot.sendMessage(msg.chat.id, `🎯 আপনার ভিডিওর গোপন File ID:\n\n\`${msg.video.file_id}\``, { parse_mode: "Markdown" });
});

bot.on("document", (msg) => {
    bot.sendMessage(msg.chat.id, `🎯 আপনার ডকুমেন্টের গোপন File ID:\n\n\`${msg.document.file_id}\``, { parse_mode: "Markdown" });
});

// বটের মূল মেসেজ হ্যান্ডলিং সিস্টেম
bot.on("message", async (msg) => {
    if (msg.video || msg.document) return; 
    if (!msg.text) return;
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const textInput = msg.text;

    // চ্যানেলে জয়েন না থাকলে আগে আটকে দেবে
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

    // =========================================================================
    // 🍿 এখানে আপনার নতুন নতুন মুভিগুলো যুক্ত করবেন (Multi-Movie List)
    // =========================================================================

    // 🎬 মুভি ১: দাগী (Dagi Movie)
    if (textInput.includes("/start dagi_movie")) {
        const fileId = "BAACAgUAAyEFAATqd-Z4AAMLahvmvOG8ZhCPFEDTDNJI6OubppEAArYeAAI21-FUN_FVKTiYzkM7BA"; 
        bot.sendMessage(chatId, "⏳ 'দাগী' মুভিটি সরাসরি বটের ভেতর লোড হচ্ছে, দয়া করে কয়েক সেকেন্ড অপেক্ষা করুন...");
        bot.sendVideo(chatId, fileId, { caption: "🎬 **দাগী (Dagi) Full Movie**\n\nএখানেই প্লে করে দেখতে পারেন! 🎉" }).catch(err => console.log(err));
    } 
    
    // 🎬 মুভি ২: তুফান (Tufan Movie)
    else if (textInput.includes("/start tufan_movie")) {
        const fileId = "এখানে_তুফান_মুভির_File_ID_বসাবেন"; // বট থেকে আইডি নিয়ে এখানে বসাবেন
        bot.sendMessage(chatId, "⏳ 'তুফান' মুভিটি সরাসরি বটের ভেতর লোড হচ্ছে, দয়া করে কয়েক সেকেন্ড অপেক্ষা করুন...");
        bot.sendVideo(chatId, fileId, { caption: "🎬 **তুফান (Tufan) Full Movie**\n\nএখানেই প্লে করে দেখতে পারেন! 🎉" }).catch(err => console.log(err));
    }

    // 🎬 মুভি ৩: রকস্টার (Rockstar Movie)
    else if (textInput.includes("/start rockstar_movie")) {
        const fileId = "এখানে_রকস্টার_মুভির_File_ID_বসাবেন"; // বট থেকে আইডি নিয়ে এখানে বসাবেন
        bot.sendMessage(chatId, "⏳ 'রকস্টার' মুভিটি সরাসরি বটের ভেতর লোড হচ্ছে, দয়া করে কয়েক সেকেন্ড অপেক্ষা করুন...");
        bot.sendVideo(chatId, fileId, { caption: "🎬 **রকস্টার (Rockstar) Full Movie**\n\nএখানেই প্লে করে দেখতে পারেন! 🎉" }).catch(err => console.log(err));
    }

    // ➕ ভবিষ্যতে নতুন মুভি ৪ যোগ করতে চাইলে ঠিক এখান থেকে নতুন 'else if' লাইন কপি করে বসাবেন।
    
    // সাধারণ স্টার্ট দিলে যা দেখাবে
    else if (textInput === "/start") {
        bot.sendMessage(chatId, "🎬 ST Flix Bot-এ আপনাকে স্বাগতম! মুভি সরাসরি বটের ভেতর দেখতে আমাদের ওয়েবসাইট ভিজিট করুন।");
    }
});
