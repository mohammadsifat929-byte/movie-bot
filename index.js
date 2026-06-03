const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');

// ১. এক্সপ্রেস সার্ভার সেটআপ (Render Port Fix)
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Movie Bot is alive with DB!'));
app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on port ${PORT}`));

// ২. কনফিগারেশন এবং এনভায়রনমেন্ট ভেরিয়েবল
const token = process.env.BOT_TOKEN;
const mongoURI = process.env.MONGO_URI;
const ADMIN_ID = process.env.ADMIN_ID || 8695023288;
const CHANNEL_ID = process.env.CHANNEL_ID || '@MobileInsight001';
const WEBSITE_NAME = process.env.WEBSITE_NAME || 'ST FLIX WEB';
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://blogspot.com';

// ৩. মঙ্গোডিবি ডাটাবেজ কানেকশন ও স্কিমা সেটআপ
mongoose.connect(mongoURI) // 'm' ছোট হাতের এবং 'URI' বড় হাতের হবে, যা ১৪ নম্বর লাইনের সাথে মিলবে।

    .then(() => console.log("MongoDB Connected Successfully!"))
    .catch((err) => console.error("MongoDB Connection Error: ", err));

const fileSchema = new mongoose.Schema({
    shortCode: { type: String, unique: true, required: true },
    fileId: { type: String, required: true },
    fileType: { type: String, required: true } // 'video' অথবা 'document'
});
const FileModel = mongoose.model('File', fileSchema);

// ৪. বট ইনিশিয়ালাইজেশন
const bot = new TelegramBot(token, { polling: true });
let botUsername = '';

bot.getMe().then((me) => {
    botUsername = me.username;
    bot.setChatMenuButton({
        menu_button: JSON.stringify({ type: 'web_app', text: 'Visit Web', web_app: { url: WEBSITE_URL } })
    }).catch(err => console.log("Menu error: ", err.message));
});

// ৫. সাবস্ক্রিপশন চেক ফাংশন
async function checkSubscription(userId) {
    if (Number(userId) === Number(ADMIN_ID)) return true;
    try {
        const member = await bot.getChatMember(CHANNEL_ID, userId);
        return ['creator', 'administrator', 'member'].includes(member.status);
    } catch (error) {
        console.error("Sub check error:", error.message);
        return false;
    }
}

// ৬. অ্যাডমিন ফাইল পাঠালে ডাটাবেজে সেভ করে শর্ট লিঙ্ক তৈরি
async function handleAdminFile(msg, fileId, fileType) {
    if (Number(msg.from.id) !== Number(ADMIN_ID)) return;
    try {
        const shortCode = crypto.randomBytes(4).toString('hex');
        
        const newFile = new FileModel({ shortCode, fileId, fileType });
        await newFile.save();

        const finalLink = `https://t.me{botUsername}?start=${shortCode}`;
        const responseText = `✅ **ফাইল ডাটাবেজে সেভ হয়েছে এবং ছোট লিঙ্ক তৈরি হয়েছে!** \n\n\`${finalLink}\``;
        
        await bot.sendMessage(msg.chat.id, responseText, { parse_mode: "Markdown" });
    } catch (error) {
        console.error("DB Save Error:", error.message);
        await bot.sendMessage(msg.chat.id, "❌ লিঙ্ক তৈরি করতে সমস্যা হয়েছে!");
    }
}

bot.on("video", (msg) => handleAdminFile(msg, msg.video.file_id, 'video'));
bot.on("document", (msg) => handleAdminFile(msg, msg.document.file_id, 'document'));

// ৭. মেসেজ হ্যান্ডেলার লজিক
bot.on("message", async (msg) => {
    if (msg.video || msg.document) return; 
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const textInput = msg.text;

    if (textInput.startsWith('/start')) {
        const parts = textInput.split(' ');
        const shortCode = parts[1]; // লিঙ্ক থেকে আসা কোড

        try {
            // ১. আগে চেক করা হবে ইউজার চ্যানেলে জয়েন আছে কি না
            const isSubscribed = await checkSubscription(userId);
            
            if (!isSubscribed) {
                const cleanChannel = CHANNEL_ID.replace('@', '');
                
                // জয়েন না থাকলে এই নোটিশটি দেখাবে এবং কোনো সার্ভিস দেবে না
                return await bot.sendMessage(chatId, `❌ **অ্যাক্সেস অস্বীকৃত (Access Denied!)**\n\n⚠️ আমাদের বট থেকে কোনো মুভি বা ফাইল ডাউনলোড করতে হলে আপনাকে অবশ্যই আমাদের অফিশিয়াল চ্যানেলে জয়েন থাকতে হবে।\n\nআপনি আমাদের চ্যানেলে জয়েন না থাকা পর্যন্ত আপনাকে কোনো সার্ভিস দেওয়া হবে না। দয়া করে নিচের বাটনে ক্লিক করে জয়েন করুন এবং লিঙ্কে আবার ক্লিক করুন।`, {
                    parse_mode: "Markdown",
                    reply_markup: { 
                        inline_keyboard: [
                            [
                                { text: "📢 আমাদের চ্যানেল জয়েন করুন", url: `https://t.me{cleanChannel}` }
                            ]
                        ] 
                    }
                });
            }

            // ২. যদি জয়েন থাকে এবং শর্টকোড থাকে, তবে ফাইল দেবে
            if (shortCode) {
                const fileData = await FileModel.findOne({ shortCode: shortCode });
                
                if (fileData) {
                    const loadingMsg = await bot.sendMessage(chatId, `⏳ **আপনার ফাইলটি ডাটাবেজ থেকে খোঁজা হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।**`);
                    
                    try {
                        if (fileData.fileType === 'video') {
                            await bot.sendVideo(chatId, fileData.fileId, {
                                caption: `🎬 **আপনার অনুরোধ করা ভিডিওটি রেডি!**\n\n🌐 **আমাদের ওয়েবসাইট:** [${WEBSITE_NAME}](${WEBSITE_URL})`,
                                parse_mode: "Markdown"
                    });
                        } else {
                            await bot.sendDocument(chatId, fileData.fileId, {
                                caption: `📁 **আপনার অনুরোধ করা ফাইলটি রেডি!**\n\n🌐 **আমাদের ওয়েবসাইট:** [${WEBSITE_NAME}](${WEBSITE_URL})`,
                                parse_mode: "Markdown"
                            });
                        }
                        await bot.deleteMessage(chatId, loadingMsg.message_id);
                    } catch (sendErr) {
                        await bot.sendMessage(chatId, "❌ ফাইলটি টেলিগ্রাম সার্ভার থেকে মুছে গেছে বা ইনভ্যালিড।");
                    }
                } else {
                    await bot.sendMessage(chatId, "❌ **ভুল লিঙ্ক অথবা লিঙ্কটির মেয়াদ শেষ হয়ে গেছে।**", { parse_mode: "Markdown" });
                }
            } else {
                // শুধু সাধারণ /start দিলে এই মেসেজ যাবে
                await bot.sendMessage(chatId, `👋 **হ্যালো ${msg.from.first_name || 'ইউজার'}!**\n\nআমি [${WEBSITE_NAME}](${WEBSITE_URL}) এর অফিসিয়াল ফাইল শেয়ারিং বট। মুভি বা ফাইল ডাউনলোড করতে দয়া করে আমাদের ওয়েবসাইটের লিঙ্ক ব্যবহার করুন।`, {
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: [[{ text: "🌐 Visit Website", url: WEBSITE_URL }]] }
                });
            }
        } catch (err) {
            console.error("Flow Error:", err.message);
        }
    }
});

bot.on("polling_error", (err) => console.log("Polling error: ", err.message));
  
