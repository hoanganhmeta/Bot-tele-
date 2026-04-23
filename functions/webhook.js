const axios = require("axios");
const moment = require("moment-timezone");
const youtubeHandler = require("./youtube");

// Token bot Telegram
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const WEATHER_API_KEY = "deae5206758c44f38b0184151232208";

// Hàm chuyển tiếng Việt có dấu sang không dấu
function removeVietnameseTones(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^\w\s]/gi, '');
}

// Đối tượng ánh xạ thời tiết
const weatherTranslations = {
    "Sunny": "Trời Nắng ☀️",
    "Mostly sunny": "Nhiều Nắng ☀️",
    "Partly sunny": "Nắng Vài Nơi ⛅",
    "Rain showers": "Mưa Rào 🌧️",
    "T-Storms": "Có Bão ⛈️",
    "Light rain": "Mưa Nhỏ 🌦️",
    "Mostly cloudy": "Trời Nhiều Mây ☁️",
    "Rain": "Trời Mưa 🌧️",
    "Heavy T-Storms": "Bão Lớn ⛈️",
    "Partly cloudy": "Mây Rải Rác ⛅",
    "Mostly clear": "Trời Trong Xanh 🌤️",
    "Cloudy": "Trời Nhiều Mây ☁️",
    "Clear": "Trời Trong Xanh, Không Mây ☀️",
    "Overcast": "Trời U Ám ☁️",
    "Moderate or heavy rain shower": "Mưa Vừa hoặc To 🌧️",
    "Light rain shower": "Mưa Rào Nhẹ 🌦️",
    "Patchy rain nearby": "Mưa Rào Gần Đó 🌦️",
    "Light drizzle": "Mưa Phùn Nhẹ 💧",
    "Drizzle": "Mưa Phùn 💧",
    "Heavy rain": "Mưa Lớn 🌧️",
    "Moderate rain": "Mưa Vừa 🌧️",
    "Snow": "Tuyết ❄️",
    "Light snow": "Tuyết Nhẹ ❄️",
    "Heavy snow": "Tuyết Lớn ❄️",
    "Mist": "Sương Mù 🌫️",
    "Fog": "Sương Mù Dày 🌫️",
    "Freezing fog": "Sương Mù Lạnh Giá 🌫️",
    "Patchy light rain": "Mưa Nhẹ Rải Rác 🌦️",
    "Patchy heavy rain": "Mưa Lớn Rải Rác 🌧️",
    "Patchy snow nearby": "Tuyết Rải Rác Gần Đó ❄️",
    "Thundery outbreaks possible": "Có Khả Năng Có Bão ⛈️",
};

// Hàm gửi tin nhắn
async function sendTelegramMessage(chatId, text, parseMode = "HTML") {
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: parseMode
        });
    } catch (error) {
        console.error("Lỗi gửi tin nhắn:", error.response?.data || error.message);
    }
}

// Hàm gửi typing indicator
async function sendChatAction(chatId, action = "typing") {
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
            chat_id: chatId,
            action: action
        });
    } catch (error) {
        console.error("Lỗi gửi chat action:", error.message);
    }
}

// Hàm lấy thông tin thời tiết
async function getWeatherInfo(city, displayName = null) {
    const apiUrl = `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}`;
    
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.error) throw new Error("Không tìm thấy thành phố");

        const weatherInfo = data.current;
        const locationInfo = data.location;
        const currentDateTime = moment().tz(locationInfo.tz_id).format("HH:mm:ss - DD/MM/YYYY");
        let condition = weatherInfo.condition.text;
        const displayLocation = displayName || locationInfo.name;

        let translatedCondition = weatherTranslations[condition];
        if (!translatedCondition) {
            try {
                const translateRes = await axios.get("https://api.mymemory.translated.net/get", {
                    params: { q: condition, langpair: "en|vi" }
                });
                translatedCondition = translateRes.data.responseData.translatedText;
            } catch {
                translatedCondition = condition;
            }
        }

        return `
<b>🌍 Thời tiết tại ${displayLocation}, ${locationInfo.country}</b>
<i>📅 Cập nhật: ${currentDateTime}</i>

🌡 <b>Nhiệt độ:</b> ${weatherInfo.temp_c}°C (${weatherInfo.temp_f}°F)
✨ <b>Cảm giác như:</b> ${weatherInfo.feelslike_c}°C (${weatherInfo.feelslike_f}°F)
📌 <b>Dự báo:</b> ${translatedCondition}
🌪️ <b>Gió:</b> ${weatherInfo.wind_kph} km/h, hướng ${weatherInfo.wind_dir}
🌀 <b>Áp suất:</b> ${weatherInfo.pressure_mb} mb
💧 <b>Độ ẩm:</b> ${weatherInfo.humidity}%
☁️ <b>Mây che phủ:</b> ${weatherInfo.cloud}%
🌧️ <b>Lượng mưa:</b> ${weatherInfo.precip_mm} mm
🌬️ <b>Gió giật:</b> ${weatherInfo.gust_kph} km/h
🧬 <b>Chỉ số UV:</b> ${weatherInfo.uv}`;
    } catch (error) {
        throw error;
    }
}

// Xử lý lệnh /thoitiet
async function handleWeatherCommand(chatId, text) {
    let city = text.replace(/^\/thoitiet\s*/, "").trim();
    
    if (!city) {
        return sendTelegramMessage(chatId, "⚠️ <b>Vui lòng nhập tên thành phố!</b>\n\nVí dụ: <code>/thoitiet thanh hoa</code>");
    }

    const originalCity = city;
    const cityNoTone = removeVietnameseTones(city);
    
    await sendChatAction(chatId, "typing");

    try {
        const weatherMessage = await getWeatherInfo(cityNoTone, originalCity);
        await sendTelegramMessage(chatId, weatherMessage);
    } catch (error) {
        await sendTelegramMessage(chatId, `❌ <b>Không tìm thấy thông tin thời tiết cho "${originalCity}"</b>\n\nVui lòng thử lại.`);
    }
}

// Xử lý lệnh /start
async function handleStartCommand(chatId, firstName) {
    const msg = `
<b>👋 Chào mừng ${firstName || "bạn"}!</b>

🤖 Tôi có thể:
🌡️ <b>Xem thời tiết:</b> <code>/thoitiet thanh hoa</code>
🎵 <b>Tìm nhạc YouTube:</b> <code>/sing em cua ngay hom qua</code>

/help - Xem hướng dẫn chi tiết`;
    await sendTelegramMessage(chatId, msg);
}

// Xử lý lệnh /help
async function handleHelpCommand(chatId) {
    const msg = `
<b>📖 Hướng dẫn sử dụng</b>

<b>🌡️ Xem thời tiết:</b>
<code>/thoitiet [tên thành phố]</code>
VD: <code>/thoitiet thanh hoá</code>

<b>🎵 Tìm nhạc YouTube:</b>
<code>/sing [tên bài hát]</code>
VD: <code>/sing em cua ngay hom qua</code>

<b>⚡ Lệnh khác:</b>
/start - Khởi động bot
/help - Xem hướng dẫn này`;
    await sendTelegramMessage(chatId, msg);
}

// Main handler
exports.handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Weather Bot is running!" })
        };
    }

    try {
        const body = JSON.parse(event.body);

        // Xử lý callback query (nút bấm YouTube)
        if (body.callback_query) {
            const cb = body.callback_query;
            const chatId = cb.message.chat.id;
            const data = cb.data;

            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                callback_query_id: cb.id
            });

            if (data.startsWith("select_")) {
                const index = parseInt(data.replace("select_", ""));
                await youtubeHandler.handleVideoSelection(chatId, index);
            }

            return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
        }

        // Xử lý tin nhắn
        if (body.message) {
            const msg = body.message;
            const chatId = msg.chat.id;
            const text = msg.text || "";
            const firstName = msg.from?.first_name || "";

            if (text.startsWith("/thoitiet")) {
                await handleWeatherCommand(chatId, text);
            } else if (text.startsWith("/sing")) {
                await youtubeHandler.handleSingCommand(chatId, text);
            } else if (text === "/start") {
                await handleStartCommand(chatId, firstName);
            } else if (text === "/help") {
                await handleHelpCommand(chatId);
            } else if (text.startsWith("/")) {
                await sendTelegramMessage(chatId, "❌ <b>Lệnh không xác định!</b>\n\nDùng /help để xem danh sách lệnh.");
            }
        }

        return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
    } catch (error) {
        console.error("Lỗi webhook:", error);
        return { statusCode: 200, body: JSON.stringify({ status: "error" }) };
    }
};
