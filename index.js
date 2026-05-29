const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, {
    polling: true
});

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot is active!");
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🎬 Movie Bot Working!");
});

bot.on("message", (msg) => {
    if (msg.text === "movie") {
        bot.sendDocument(
            msg.chat.id,
            "https://sample-videos.com"
        );
    }
});
