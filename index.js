const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, {
    polling: true
});

const app = express();
const port = process.env.PORT || 3000;

// ওয়েবসাইট লেআউট সচল রাখা
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ST Flix</title>
            <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #111; font-family: sans-serif; color: #fff; }
                .container { background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; text-align: center; }
                h1 { color: #ff4757; }
                .badge { display: inline-block; background: #2ed573; padding: 10px 20px; border-radius: 50px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎬 ST Flix Website</h1>
                <p>সার্ভার এবং টেলিগ্রাম বট সফলভাবে চালু আছে।</p>
                <div class="badge">🟢 Active</div>
            </div>
        </body>
        </html>
    `);
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
});

// আপনার চ্যানেলের ইউজারনেম আইডি সেট করা
const CHANNEL_ID = "@mobileinsight001"; 

// ব্যবহারকারী চ্যানেলে জয়েন আছে কি না তা চেক করার ফাংশন
async function checkSubscription(chatId, userId) {
    try {
        const member = await bot.getChatMember(CHANNEL_ID, userId);
        const status = member.status;
        // যদি ব্যবহারকারী মেম্বার, অ্যাডমিন বা ক্রিয়েটর হয়
        return status === "member" || status === "administrator" || status === "creator";
    } catch (error) {
        console.log("Subscription Check Error:", error);
        return false;
    }
}

// বটে যেকোনো মেসেজ আসলে যা হবে
bot.on("message", async (msg) => {
    if (!msg.text) return;
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const textInput = msg.text.toLowerCase();

    // ১. প্রথমে চেক করবে ব্যবহারকারী চ্যানেলে জয়েন আছে কি না
    const isSubscribed = await checkSubscription(chatId, userId);

    if (!isSubscribed) {
        // যদি জয়েন না থাকে, তবে এই মেসেজটি বাটনসহ পাঠাবে
        return bot.sendMessage(chatId, "⚠️ দুঃখিত! বটের ফিচারগুলো ব্যবহার করতে হলে আপনাকে প্রথমে আমাদের অফিসিয়াল চ্যানেলে জয়েন করতে হবে।\n\nনিচের বাটনে ক্লিক করে জয়েন করুন এবং তারপর আবার মেসেজ দিন।", {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📢 Join Channel", url: "https://t.me/mobileinsight001" }
                    ]
                ]
            }
        });
    }

    // ২. যদি ব্যবহারকারী জয়েন থাকে, তবে বট স্বাভাবিকভাবে কাজ করবে
    if (textInput === "/start") {
        bot.sendMessage(chatId, "🎬 ST Flix Bot-এ আপনাকে স্বাগতম! মুভি পেতে 'movie' অথবা 'rockstar' লিখুন।");
    } 
    else if (textInput === "movie" || textInput === "rockstar") {
        const photoUrl = "https://prothomalo.com";
        const captionText = `Post Title: রকস্টার মুভি\n\n✅ Post Link 👇👇\n\nhttps://blogspot.com\n\n✅ লিংক কপি করে ক্রোম ব্রাউজার দিয়ে বের করুন 👈`;

        bot.sendPhoto(chatId, photoUrl, {
            caption: captionText,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📥 Download Movie", url: "https://blogspot.com" }]
                ]
            }
        }).catch((err) => console.log(err));
    }
});
