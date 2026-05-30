const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// হুবহু স্ক্রিনশটের মতো মুভি ওয়েবসাইটের ডিজাইন
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MOVIES HUT - রকস্টার মুভি</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; color: #333; }
                
                /* টপ রেড বার */
                .top-bar { background-color: #e50914; height: 35px; width: 100%; }
                
                /* মেইন কন্টেইনার */
                .main-container { max-width: 1100px; margin: 20px auto; display: flex; gap: 20px; padding: 0 10px; }
                
                /* বাম পাশের মুভি সেকশন */
                .content-area { flex: 2; background: #fff; padding: 20px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
                .movie-title { font-size: 24px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #ddd; padding-bottom: 10px; color: #111; }
                .poster-img { width: 220px; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); margin-bottom: 20px; }
                
                /* বাটন স্টাইল */
                .btn { display: inline-block; width: 180px; padding: 12px; margin: 8px 0; border-radius: 25px; font-weight: bold; text-decoration: none; font-size: 14px; text-transform: uppercase; transition: 0.2s; }
                .btn-play { background-color: #ff4757; color: white; border-radius: 4px; width: 150px; }
                .btn-download-fast { background-color: #2ed573; color: white; box-shadow: 0 3px 0 #26af5f; }
                .btn-download-hd { background-color: #1e90ff; color: white; box-shadow: 0 3px 0 #1771cb; }
                .btn-tg { background-color: #0088cc; color: white; border-radius: 4px; width: 160px; font-size: 13px; }
                .btn:hover { opacity: 0.9; transform: translateY(-1px); }
                
                .notice-text { color: #ff4757; font-size: 14px; font-weight: bold; margin: 20px 0 10px 0; }
                
                /* ডান পাশের সাইডবার */
                .sidebar { flex: 1; display: flex; flex-direction: column; gap: 20px; }
                .widget { background: #fff; padding: 15px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .widget-title { font-size: 16px; font-weight: bold; color: #fff; background: #333; padding: 8px 12px; margin: -15px -15px 15px -15px; border-top-left-radius: 4px; border-top-right-radius: 4px; text-transform: uppercase; }
                .site-logo { font-size: 22px; font-weight: bold; color: #333; text-align: center; font-family: sans-serif; }
                .site-logo span { color: #e50914; background: #111; padding: 2px 6px; border-radius: 3px; margin-left: 3px; }
                
                .sidebar-img { width: 100%; border-radius: 4px; margin-top: 5px; }

                /* রেসপন্সিভ (মোবাইলের জন্য) */
                @media (max-width: 768px) {
                    .main-container { flex-direction: column; }
                }
            </style>
        </head>
        <body>

            <div class="top-bar"></div>

            <div class="main-container">
                
                <!-- বাম পাশের এরিয়া (মুভি ডিটেইলস) -->
                <div class="content-area">
                    <div class="movie-title">রকস্টার মুভি</div>
                    
                    <img class="poster-img" src="https://prothomalo.com" alt="Rockstar Poster">
                    
                    <div>
                        <a href="#" class="btn btn-play">▶ PLAY & DOWNLOAD</a>
                    </div>
                    
                    <div style="margin-top: 25px;">
                        <a href="#" class="btn btn-download-fast">📥 FAST DOWNLOAD</a><br>
                        <a href="#" class="btn btn-download-hd">📥 DOWNLOAD 720P</a><br>
                        <a href="#" class="btn btn-download-fast" style="background-color: #ff6b81; box-shadow: 0 3px 0 #fb4863;">📥 DOWNLOAD 1080P</a>
                    </div>

                    <p class="notice-text">মুভিটি টেলিগ্রামে ডাউনলোড করতে নিচের বাটনে চাপুন</p>
                    <a href="https://t.me" target="_blank" class="btn btn-tg">✈ Telegram</a>
                </div>
                
                <!-- ডান পাশের এরিয়া (সাইডবার) -->
                <div class="sidebar">
                    <!-- লোগো উইজেট -->
                    <div class="widget" style="text-align: center; padding: 25px 15px;">
                        <div class="site-logo">MOVIES<span>HUT</span></div>
                        <p style="font-size: 12px; color: #777; margin-top: 5px;">FullHD</p>
                    </div>

                    <!-- বিজ্ঞপ্তির মতো উইজেট ১ -->
                    <div class="widget">
                        <div class="widget-title">Trending Movie</div>
                        <img class="sidebar-img" src="https://prothomalo.com" alt="Trending">
                    </div>

                    <!-- বিজ্ঞপ্তির মতো উইজেট ২ -->
                    <div class="widget">
                        <div class="widget-title">Featured Content</div>
                        <img class="sidebar-img" src="https://prothomalo.com" alt="Featured">
                    </div>
                </div>

            </div>

        </body>
        </html>
    `);
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Website is running on port ${port}`);
});
