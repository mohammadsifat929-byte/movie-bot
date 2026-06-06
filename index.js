const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// এনভায়রনমেন্ট ভেরিয়েবল
const token = process.env.BOT_TOKEN;
const STORAGE_CHANNEL_ID = process.env.STORAGE_CHANNEL_ID;
const MAIN_CHANNEL = '@mobileinsight001';
const WEBSITE_LINK = 'https://stfix.blogspot.com/';
const CHANNEL_LINK = 'https://t.me/mobileinsight001';

// অ্যাডমিন লিস্ট
const ADMIN_IDS = ['7640562333', '8202892599', '8695023288'];

function isAdmin(userId) {
    return ADMIN_IDS.includes(String(userId));
}

console.log('=================================');
console.log('🤖 Mobile Insight Bot Starting...');
console.log(`📁 STORAGE_CHANNEL_ID: ${STORAGE_CHANNEL_ID}`);
console.log(`👑 অ্যাডমিন: ${ADMIN_IDS.length} জন`);
console.log('=================================');

const bot = new TelegramBot(token, { polling: true });
let BOT_USERNAME = null;

app.get('/', (req, res) => {
    res.send('Mobile Insight Bot is running!');
});

app.listen(PORT, () => {
    console.log(`✅ Server on port ${PORT}`);
});

bot.getMe().then((me) => {
    BOT_USERNAME = me.username;
    console.log(`✅ Bot: @${BOT_USERNAME}`);
    ADMIN_IDS.forEach(adminId => {
        bot.sendMessage(adminId, `✅ বট অনলাইন হয়েছে!`).catch(() => {});
    });
}).catch(err => console.error('GetMe error:', err.message));

// সাবস্ক্রিপশন চেক
async function checkSubscription(userId) {
    if (isAdmin(userId)) return true;
    try {
        const member = await bot.getChatMember(MAIN_CHANNEL, userId);
        return ['creator', 'administrator', 'member'].includes(member.status);
    } catch (error) {
        return false;
    }
}

// 📋 হেল্প কমান্ড
bot.onText(/\/help/, async (msg) => {
    await bot.sendMessage(msg.chat.id, 
        `📋 *ST Flix Bot - ফিচারসমূহ*\n\n` +
        `✅ একসাথে একাধিক ফাইল আপলোড\n` +
        `✅ প্রতিটি ফাইলের আলাদা লিংক\n` +
        `✅ সব লিংক একসাথে দেখানো\n` +
        `✅ চ্যানেল সাবস্ক্রাইব বাধ্যতামূলক\n\n` +
        `📢 চ্যানেল: ${CHANNEL_LINK}\n` +
        `🌐 ওয়েবসাইট: ${WEBSITE_LINK}`,
        { parse_mode: 'Markdown' }
    );
});

// 📊 স্ট্যাটাস কমান্ড
bot.onText(/\/stats/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    await bot.sendMessage(msg.chat.id, 
        `📊 *বট স্ট্যাটাস*\n\n` +
        `⏰ চলমান: ${hours}ঘ ${minutes}মি\n` +
        `👑 অ্যাডমিন: ${ADMIN_IDS.length} জন\n` +
        `📁 স্টোরেজ: ✅ সেট\n` +
        `🔄 মোড: পোলিং\n` +
        `✅ স্ট্যাটাস: লাইভ`,
        { parse_mode: 'Markdown' }
    );
});

// 🔥 মাল্টি-ফাইল হ্যান্ডলার (একসাথে সব লিংক)
let pendingGroups = {};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    if (text && text.startsWith('/')) return;
    
    if (isAdmin(userId)) {
        // মাল্টি-ফাইল (Media Group) চিহ্নিত করা
        if (msg.media_group_id) {
            if (!pendingGroups[msg.media_group_id]) {
                pendingGroups[msg.media_group_id] = {
                    files: [],
                    timer: setTimeout(async () => {
                        const group = pendingGroups[msg.media_group_id];
                        delete pendingGroups[msg.media_group_id];
                        
                        // সব ফাইলের লিংক একসাথে পাঠানো
                        let response = `✅ *${group.files.length}টি ফাইল সংরক্ষিত!*\n\n`;
                        
                        group.files.forEach((file, index) => {
                            response += `${index + 1}. 📄 *${file.name}*\n`;
                            response += `   🔗 ${file.link}\n`;
                            response += `   📝 কোড: \`${file.code}\`\n\n`;
                        });
                        
                        response += `🌐 ওয়েবসাইট: ${WEBSITE_LINK}`;
                        
                        await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
                        console.log(`✅ ${group.files.length}টি লিংক তৈরি`);
                    }, 3000) // 3 সেকেন্ড অপেক্ষা
                };
            }
            
            // ফাইলের নাম নির্ধারণ
            let fileName = 'ফাইল';
            if (msg.document) fileName = msg.document.file_name;
            else if (msg.video) fileName = '🎬 ভিডিও ফাইল';
            else if (msg.photo) fileName = '🖼️ ছবি ফাইল';
            
            try {
                const forwarded = await bot.forwardMessage(STORAGE_CHANNEL_ID, chatId, msg.message_id);
                if (forwarded && forwarded.message_id) {
                    const code = forwarded.message_id;
                    const link = `https://t.me/${BOT_USERNAME}?start=${code}`;
                    
                    pendingGroups[msg.media_group_id].files.push({
                        name: fileName,
                        link: link,
                        code: code
                    });
                }
            } catch (err) {
                console.error(`Error: ${err.message}`);
            }
            
        } else if (msg.photo || msg.video || msg.document) {
            // একক ফাইল
            let fileName = 'ফাইল';
            let fileSize = '';
            
            if (msg.document) {
                fileName = msg.document.file_name;
                fileSize = (msg.document.file_size / 1024 / 1024).toFixed(2) + ' MB';
            } else if (msg.video) {
                fileName = '🎬 ভিডিও ফাইল';
                fileSize = (msg.video.file_size / 1024 / 1024).toFixed(2) + ' MB';
            } else if (msg.photo) {
                fileName = '🖼️ ছবি ফাইল';
                fileSize = (msg.photo[0].file_size / 1024).toFixed(2) + ' KB';
            }
            
            try {
                const forwarded = await bot.forwardMessage(STORAGE_CHANNEL_ID, chatId, msg.message_id);
                if (forwarded && forwarded.message_id) {
                    const code = forwarded.message_id;
                    const link = `https://t.me/${BOT_USERNAME}?start=${code}`;
                    
                    await bot.sendMessage(chatId, 
                        `✅ *ফাইল সংরক্ষিত!*\n\n` +
                        `📄 নাম: ${fileName}\n` +
                        `📦 সাইজ: ${fileSize}\n` +
                        `🔗 লিংক: ${link}\n` +
                        `📝 কোড: \`${code}\``,
                        { parse_mode: 'Markdown' }
                    );
                    console.log(`✅ লিংক: ${link}`);
                }
            } catch (err) {
                await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
            }
        }
    }
});

// শর্ট লিংক হ্যান্ডলার
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const code = match[1];
    
    if (isNaN(code)) return bot.sendMessage(chatId, "❌ ভুল লিংক!");
    
    const isSubscribed = await checkSubscription(userId);
    
    if (!isSubscribed && !isAdmin(userId)) {
        return bot.sendMessage(chatId, 
            `❌ *চ্যানেলে জয়েন করুন*\n\n${CHANNEL_LINK}`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: '📢 জয়েন করুন', url: CHANNEL_LINK }]]
                }
            }
        );
    }
    
    try {
        await bot.sendMessage(chatId, "⏳ ফাইল পাঠানো হচ্ছে...");
        await bot.copyMessage(chatId, STORAGE_CHANNEL_ID, parseInt(code));
    } catch (err) {
        await bot.sendMessage(chatId, "❌ ফাইল পাওয়া যায়নি!");
    }
});

// সাধারণ /start
bot.onText(/\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'ইউজার';
    const userId = msg.from.id;
    
    const isSubscribed = await checkSubscription(userId);
    
    if (!isSubscribed && !isAdmin(userId)) {
        await bot.sendMessage(chatId, 
            `❌ *স্বাগতম ${firstName}!*\n\nবট ব্যবহার করতে চ্যানেলে জয়েন করুন:\n${CHANNEL_LINK}`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: '📢 জয়েন করুন', url: CHANNEL_LINK }]]
                }
            }
        );
    } else {
        await bot.sendMessage(chatId, 
            `🎉 *স্বাগতম ${firstName}!*\n\n🎬 *ST Flix Web* বটে স্বাগতম!\n\n` +
            `🌐 ওয়েবসাইট: ${WEBSITE_LINK}\n📢 চ্যানেল: ${CHANNEL_LINK}`,
            { parse_mode: 'Markdown' }
        );
    }
});

bot.on('polling_error', (error) => {
    console.error('Polling error:', error.message);
});

console.log('🚀 বট চালু হয়েছে (মাল্টি-ফাইল সাপোর্ট সহ)!');
