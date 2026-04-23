const axios = require("axios");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

const searchCache = new Map();

async function sendTelegramMessage(chatId, text, replyMarkup = null) {
    try {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: "HTML"
        };
        if (replyMarkup) {
            payload.reply_markup = replyMarkup;
        }
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, payload);
    } catch (error) {
        console.error("Lỗi gửi tin nhắn:", error.message);
    }
}

async function searchYouTube(query) {
    const searchUrl = "https://www.googleapis.com/youtube/v3/search";
    try {
        const response = await axios.get(searchUrl, {
            params: {
                part: "snippet",
                q: query,
                key: YOUTUBE_API_KEY,
                maxResults: 5,
                type: "video",
                videoCategoryId: "10"
            }
        });

        const videos = response.data.items.map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.default?.url || ""
        }));

        return videos;
    } catch (error) {
        console.error("Lỗi tìm kiếm YouTube:", error.message);
        throw error;
    }
}

async function handleSingCommand(chatId, text) {
    const query = text.replace(/^\/sing\s*/, "").trim();

    if (!query) {
        await sendTelegramMessage(chatId, "⚠️ <b>Vui lòng nhập tên bài hát!</b>\n\nVí dụ: <code>/sing em cua ngay hom qua</code>");
        return;
    }

    if (!YOUTUBE_API_KEY) {
        await sendTelegramMessage(chatId, "❌ <b>Chưa cấu hình YouTube API Key!</b>\n\nThêm YOUTUBE_API_KEY vào Netlify Environment Variables.");
        return;
    }

    try {
        const videos = await searchYouTube(query);

        if (videos.length === 0) {
            await sendTelegramMessage(chatId, "❌ <b>Không tìm thấy kết quả nào!</b>\n\nVui lòng thử từ khóa khác.");
            return;
        }

        searchCache.set(chatId.toString(), videos);

        let message = `🎵 <b>Kết quả tìm kiếm cho:</b> "${query}"\n\n`;
        message += videos.map((v, i) =>
            `<b>${i + 1}.</b> ${v.title}\n└ 📺 ${v.channel}`
        ).join('\n\n');
        message += `\n\n<i>👉 Chọn bài hát bằng nút bên dưới</i>`;

        const keyboard = {
            inline_keyboard: videos.map((video, index) => [{
                text: `${index + 1}. ${video.title.substring(0, 50)}`,
                callback_data: `select_${index}`
            }])
        };

        await sendTelegramMessage(chatId, message, keyboard);

    } catch (error) {
        console.error("Lỗi xử lý /sing:", error);
        await sendTelegramMessage(chatId, "❌ <b>Có lỗi xảy ra khi tìm kiếm!</b>");
    }
}

async function handleVideoSelection(chatId, index) {
    const videos = searchCache.get(chatId.toString());

    if (!videos || index >= videos.length) {
        await sendTelegramMessage(chatId, "❌ <b>Phiên tìm kiếm đã hết hạn!</b>\n\nVui lòng tìm kiếm lại.");
        return;
    }

    const video = videos[index];

    const message = `🎵 <b>${video.title}</b>\n📺 <b>Kênh:</b> ${video.channel}\n\n` +
        `🔗 <b>Link:</b> https://youtube.com/watch?v=${video.videoId}\n\n` +
        `<i>⚠️ Bot không thể tải file do giới hạn của Netlify (timeout 10s).</i>\n` +
        `<i>Vui lòng dùng link trên để xem/tải video.</i>`;

    const keyboard = {
        inline_keyboard: [[{
            text: "🎬 Xem trên YouTube",
            url: `https://youtube.com/watch?v=${video.videoId}`
        }]]
    };

    await sendTelegramMessage(chatId, message, keyboard);
}

module.exports = {
    handleSingCommand,
    handleVideoSelection
};
