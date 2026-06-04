const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// ১. এক্সপ্রেস সার্ভার সেটআপ (Render জ্যান্ত রাখার জন্য)
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Movie Bot is alive with Supabase!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// ২. এনভায়রনমেন্ট ভেরিয়েবল সেটআপ
const token = process.env.BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const ADMIN_ID = process.env.ADMIN_ID || 1690553120;
const Channel_ID = process.env.CHANNEL_ID || '@Mobileinsightbot';

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('⚡ Supabase Client Initialized Successfully!');

// ৩. বট ইনিশিয়ালাইজেশন
const bot = new TelegramBot(token, { polling: true });
let botUsername = '';

bot.getMe().then((me) => {
    botUsername = me.username;
    bot.setChatMenuButton({
        menu_button: JSON.stringify({
            type: 'web_app',
            text: 'Visit Web',
            web_app: { url: 'https://vfxsmart.com' }
        })
    }).catch(e => console.log('Menu button error:', e.message));
});

// ৩. সাবস্ক্রিপশন চেক ফাংশন
async function checkSubscription(userId) {
    if (Number(userId) === Number(ADMIN_ID)) return true;
    try {
        const member = await bot.getChatMember(Channel_ID, userId);
        return ['creator', 'administrator', 'member'].includes(member.status);
    } catch (error) {
        console.error('Sub check error:', error.message);
        return false;
    }
}

// ৪. ডাইনামিক আইডি ফাইল ডাটাবেজে সেভ করে শর্ট লিঙ্ক তৈরি
async function handleIdentifile(msg, fileId, fileType) {
    if (msg.from.is_bot) return;
    try {
        // ৫ অক্ষরের ইউনিক শর্ট কোড তৈরি
        const shortCode = crypto.randomBytes(3).toString("hex").slice(0, 5);

        // Supabase-এর সঠিক টেবিল 'links' এবং সঠিক কলাম নাম ব্যবহার করা হলো
        const { error } = await supabase
            .from("links")
            .insert([{ short_code: shortCode, long_url: fileId }]);

        if (error) throw error;

        // শর্ট লিংক ফরমেট তৈরি করা
        const finalLink = `https://t.me{botUsername}?start=${shortCode}`;
        const responseText = `✅ **আপনার ফাইলের শর্ট লিংক তৈরি হয়ে গেছে:**\n\n🔗 ${finalLink}`;

        await bot.sendMessage(msg.chat.id, responseText, { parse_mode: "Markdown" });

    } catch (error) {
        console.error("Database Save Error:", error.message);
        await bot.sendMessage(msg.chat.id, "❌ সুপাবেসে লিঙ্ক তৈরি করতে সমস্যা হয়েছে!");
    }
}

bot.on('video', (msg) => handleIdentifile(msg, msg.video.file_id, 'video'));
bot.on('document', (msg) => handleIdentifile(msg, msg.document.file_id, 'document'));
bot.on('photo', (msg) => handleIdentifile(msg, msg.photo[msg.photo.length - 1].file_id, 'photo'));

// ৫. মেসেজ হ্যান্ডলার লজিক
bot.on('message', async (msg) => {
    const textInput = msg.text ? msg.text.trim() : '';
    if (!textInput) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (textInput.startsWith('/start')) {
        const parts = textInput.split(' ');

        try {
            // ১. আগে চেক করব ইউজার চ্যানেলে জয়েন আছে কি না
            const isSubscribed = await checkSubscription(userId);

            if (!isSubscribed) {
                const cleanChannel = Channel_ID.replace('@', '');
                return await bot.sendMessage(chatId, `❌ **অ্যাক্সেস অস্বীকৃত (Access Denied)!**\n\nআমাদের বট থেকে যেকোনো মুভি বা ফাইল ডাউনলোড করতে হলে আপনাকে অবশ্যই আমাদের অফিসিয়াল চ্যানেলে জয়েন থাকতে হবে।\n\nনিচের বোতামে ক্লিক করে জয়েন করুন এবং নিচে আবার স্টার্ট করুন।`, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '📢 আমাদের চ্যানেলে জয়েন করুন', url: `https://t.me{cleanChannel}` }
                        ]]
                    }
                });
            }

            // ২. যদি জয়েন থাকে এবং শর্টকোড থাকে, তবে Supabase থেকে ফাইল খুঁজবে
            if (parts.length > 1) {
                const shortCode = parts[1];

                const { data: fileData, error } = await supabase
                    .from("links")
                    .select("*")
                    .eq("short_code", shortCode)
                    .single();

                if (fileData) {
                    const loadingMsg = await bot.sendMessage(chatId, '⏳ **আপনার ফাইলটি ডাটাবেজ থেকে খোঁজা হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন**', { parse_mode: 'Markdown' });

                    try {
                        // আমরা fileType সেভ না করায় ডাইনামিকলি ফাইল পাঠাবো
                        // এখানে সরাসরি ভিডিও বা ডকুমেন্ট হিসেবে ফাইল আইডি পাঠিয়ে দেওয়া হচ্ছে
                        await bot.sendVideo(chatId, fileData.long_url, {
                            caption: `✨ **আপনার অনুরোধ করা ফাইলটি নিচে দেওয়া হলো**`,
                            parse_mode: 'Markdown'
                        }).catch(async () => {
                            // ভিডিও হিসেবে ব্যর্থ হলে ডকুমেন্ট হিসেবে পাঠাবে
                            await bot.sendDocument(chatId, fileData.long_url, {
                                caption: `✨ **আপনার অনুরোধ করা ফাইলটি নিচে দেওয়া হলো**`,
                                parse_mode: 'Markdown'
                            });
                        });

                        await bot.deleteMessage(chatId, loadingMsg.message_id);
                    } catch (sendErr) {
                        await bot.sendMessage(chatId, "❌ ফাইলটি টেলিগ্রাম সার্ভার থেকে মুছে গেছে বা ডিলিটড।");
                    }
                } else {
                    await bot.sendMessage(chatId, "❌ **ভুল বা মৃত লিংক! লিংকটির মেয়াদ শেষ হয়ে গেছে।**", { parse_mode: "Markdown" });
                }
            } else {
                // শুধু স্টার্ট মেসেজ দিলে সাধারণ স্বাগতম মেসেজ
                await bot.sendMessage(chatId, `👋 হ্যালো **${msg.from.first_name || 'ইউজার'}**!\n\nআমি একটি ফাইল শেয়ারিং বট। মুভি বা ফাইল ডাউনলোড করতে দয়া করে আমাদের ওয়েবসাইটের লিঙ্ক ব্যবহার করুন।`, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '🌐 Visit Web', url: 'https://vfxsmart.com' }]]
                    }
                });
            }

        } catch (err) {
            console.error("Flow Error:", err.message);
        }
    }
});

bot.on('polling_error', (error) => console.log('Polling error:', error.message));
