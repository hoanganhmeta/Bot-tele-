const axios = require("axios");
const moment = require("moment-timezone");

// Thay thế bằng token bot Telegram của bạn (lấy từ @BotFather)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEATHER_API_KEY = "deae5206758c44f38b0184151232208";

// Đối tượng ánh xạ các trạng thái thời tiết từ tiếng Anh sang tiếng Việt
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

// Hàm gửi tin nhắn qua Telegram
async function sendTelegramMessage(chatId, text, parseMode = "HTML") {
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(telegramUrl, {
            chat_id: chatId,
            text: text,
            parse_mode: parseMode
        });
    } catch (error) {
        console.error("Lỗi gửi tin nhắn Telegram:", error.response?.data || error.message);
    }
}

// Hàm gửi typing indicator
async function sendChatAction(chatId, action = "typing") {
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`;
    try {
        await axios.post(telegramUrl, {
            chat_id: chatId,
            action: action
        });
    } catch (error) {
        console.error("Lỗi gửi chat action:", error.message);
    }
}

// Hàm lấy thông tin thời tiết
async function getWeatherInfo(city) {
    const apiUrl = `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}`;
    
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.error) {
            throw new Error("Không tìm thấy thành phố");
        }

        const weatherInfo = data.current;
        const locationInfo = data.location;
        const currentDateTime = moment().tz(locationInfo.tz_id).format("HH:mm:ss - DD/MM/YYYY");
        let condition = weatherInfo.condition.text;

        // Dịch trạng thái thời tiết
        let translatedCondition = weatherTranslations[condition];
        
        if (!translatedCondition) {
            try {
                const translateUrl = "https://api.mymemory.translated.net/get";
                const translateResponse = await axios.get(translateUrl, {
                    params: {
                        q: condition,
                        langpair: "en|vi",
                    },
                });
                translatedCondition = translateResponse.data.responseData.translatedText;
            } catch (translateError) {
                console.error(`Lỗi khi dịch trạng thái thời tiết: ${translateError}`);
                translatedCondition = condition;
            }
        }

        // Format tin nhắn đẹp hơn
        const weatherMessage = `
<b>🌍 Thời tiết tại ${locationInfo.name}, ${locationInfo.country}</b>
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

        return weatherMessage;
    } catch (error) {
        console.error("Lỗi lấy dữ liệu thời tiết:", error.message);
        throw error;
    }
}

// Hàm xử lý lệnh /thoitiet
async function handleWeatherCommand(chatId, text, messageId) {
    // Lấy tên thành phố từ lệnh (bỏ "/thoitiet")
    const city = text.replace(/^\/thoitiet\s*/, "").trim();
    
    if (!city) {
        await sendTelegramMessage(
            chatId,
            "⚠️ <b>Vui lòng nhập tên thành phố!</b>\n\nVí dụ: <code>/thoitiet thanh hoa</code>"
        );
        return;
    }

    // Gửi typing indicator
    await sendChatAction(chatId, "typing");

    try {
        const weatherMessage = await getWeatherInfo(city);
        await sendTelegramMessage(chatId, weatherMessage);
    } catch (error) {
        await sendTelegramMessage(
            chatId,
            `❌ <b>Không tìm thấy thông tin thời tiết cho "${city}"</b>\n\nVui lòng kiểm tra lại tên thành phố và thử lại.`
        );
    }
}

// Hàm xử lý lệnh /start
async function handleStartCommand(chatId, firstName) {
    const welcomeMessage = `
<b>👋 Chào mừng ${firstName || "bạn"} đến với Weather Bot!</b>

🤖 Tôi có thể cung cấp thông tin thời tiết cho bất kỳ thành phố nào.

📝 <b>Cách sử dụng:</b>
• Gửi lệnh <code>/thoitiet [tên thành phố]</code>
• Ví dụ: <code>/thoitiet thanh hoa</code>
• Ví dụ: <code>/thoitiet ha noi</code>
• Ví dụ: <code>/thoitiet ho chi minh</code>

🌍 Bot hỗ trợ tìm kiếm thời tiết cho các thành phố trên toàn thế giới!

<b>✨ Các lệnh khác:</b>
/help - Xem hướng dẫn sử dụng
/about - Thông tin về bot

Chúc bạn một ngày tốt lành! 🌤️`;
    
    await sendTelegramMessage(chatId, welcomeMessage);
}

// Hàm xử lý lệnh /help
async function handleHelpCommand(chatId) {
    const helpMessage = `
<b>📖 Hướng dẫn sử dụng Weather Bot</b>

<b>🌡️ Lệnh xem thời tiết:</b>
<code>/thoitiet [tên thành phố]</code>
- Xem thông tin thời tiết hiện tại của thành phố

<b>📌 Ví dụ cụ thể:</b>
• <code>/thoitiet ha noi</code>
• <code>/thoitiet thanh hoa</code>
• <code>/thoitiet da nang</code>
• <code>/thoitiet london</code>
• <code>/thoitiet tokyo</code>

<b>📊 Thông tin hiển thị:</b>
• Nhiệt độ hiện tại và cảm giác
• Tình trạng thời tiết
• Tốc độ và hướng gió
• Áp suất không khí
• Độ ẩm
• Lượng mây che phủ
• Lượng mưa
• Chỉ số UV

<b>⚡ Các lệnh khác:</b>
/start - Khởi động bot
/help - Xem hướng dẫn này
/about - Thông tin về bot

<i>💡 Mẹo: Bạn có thể tìm thời tiết cho bất kỳ thành phố nào trên thế giới!</i>`;
    
    await sendTelegramMessage(chatId, helpMessage);
}

// Hàm xử lý lệnh /about
async function handleAboutCommand(chatId) {
    const aboutMessage = `
<b>ℹ️ Về Weather Bot</b>

🤖 <b>Weather Bot v2.0</b>
Một bot Telegram đơn giản giúp bạn tra cứu thông tin thời tiết nhanh chóng và chính xác.

<b>🔧 Công nghệ sử dụng:</b>
• Node.js
• WeatherAPI.com
• Moment Timezone
• Axios

<b>👨‍💻 Phát triển bởi:</b> Q.Huy

<b>📅 Phiên bản:</b> 2.0 (Telegram)

<b>🌐 Chạy trên:</b> Netlify Functions

<i>Cảm ơn bạn đã sử dụng bot! 🙏</i>`;
    
    await sendTelegramMessage(chatId, aboutMessage);
}

// Main handler function cho Netlify
exports.handler = async (event, context) => {
    // Chỉ xử lý POST request
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Weather Bot Webhook is running!" })
        };
    }

    try {
        const body = JSON.parse(event.body);
        
        // Xử lý tin nhắn từ Telegram
        if (body.message) {
            const message = body.message;
            const chatId = message.chat.id;
            const text = message.text || "";
            const firstName = message.from?.first_name || "";

            // Kiểm tra và xử lý các lệnh
            if (text.startsWith("/thoitiet")) {
                await handleWeatherCommand(chatId, text, message.message_id);
            } else if (text === "/start") {
                await handleStartCommand(chatId, firstName);
            } else if (text === "/help") {
                await handleHelpCommand(chatId);
            } else if (text === "/about") {
                await handleAboutCommand(chatId);
            } else if (text.startsWith("/")) {
                // Lệnh không xác định
                await sendTelegramMessage(
                    chatId,
                    "❌ <b>Lệnh không xác định!</b>\n\nSử dụng /help để xem danh sách lệnh."
                );
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ status: "ok" })
        };
    } catch (error) {
        console.error("Lỗi xử lý webhook:", error);
        return {
            statusCode: 200, // Vẫn trả về 200 để Telegram không gửi lại
            body: JSON.stringify({ status: "error", message: error.message })
        };
    }
};
