const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, {
  polling: true
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🎬 Movie Bot Working!");
});

bot.on("message", (msg) => {
  if (msg.text === "movie") {
    bot.sendDocument(
      msg.chat.id,
      "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4"
    );
  }
});
