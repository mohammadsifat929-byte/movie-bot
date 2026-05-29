const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, {
    polling: true
});

const app = express();
const port = process.env.PORT || 3000;

// --- ওয়েবসাইটকে সুন্দর করার জন্য আকর্ষণীয় HTML ও CSS ডিজাইন ---
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Movie Bot Status</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background: linear-gradient(135deg, #1e1e2f, #111119);
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    color: #fff;
                    text-align: center;
                }
                .container {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    max-width: 400px;
                    width: 100%;
                }
                h1 {
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                    color: #ff4757;
                }
                p {
                    font-size: 1.1rem;
                    color: #a4b0be;
                    margin-bottom: 30px;
                }
                .status-badge {
                    display: inline-block;
                    background: #2ed573;
                    color: #fff;
                    padding: 10px 25px;
                    border-radius: 50px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    box-shadow: 0 0 15px rgba(46, 213, 115, 0.4);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎬 Movie Bot</h1>
                <p>আপনার টেলিগ্রাম বটটি সফলভাবে ব্যাকগ্রাউন্ডে রান করছে।</p>
                <div class="status-badge">🟢 Bot is Active</div>
            </div>
        </body>
        </html>
    `);
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🎬 Movie Bot Working!");
});

bot.on("message", (msg) => {
    if (msg.text && msg.text.toLowerCase() === "movie") {
        bot.sendMessage(msg.chat.id, "আপনার মুভি বটটি সফলভাবে কাজ করছে! আপনি কোন মুভিটি দেখতে চান?");
    }
});
