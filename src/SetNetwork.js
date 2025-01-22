require("dotenv").config();

const storage = require("node-persist");

storage.init();

function setnetwork(chatId, messageId, bot) {
  storage.getItem(`userWallet_${chatId}`).then((userWallet) => {
    const setKeyboard = [
      [{ text: "---GENERAL Networks---", callback_data: "none" }],
      [
        { text: "SOL", callback_data: "choose_sol" },
        { text: "ETH", callback_data: "choose_eth" },
      ],
      [
        { text: "SUI", callback_data: "choose_sui" },
        { text: "BSC", callback_data: "choose_bsc" },
      ],
      [{ text: "Close", callback_data: "close" }],
    ];

    const setReplyMarkup = {
      inline_keyboard: setKeyboard,
    };

    settext =
      "<b>Network Settings:</b>\n\n" +
      "<b>VertexTradingBot Networks</b>: Vertext Trading Bot supports 4 networks: Sol, Sui, Base and BSC.\n";
    if (!messageId) {
      bot.sendMessage(chatId, settext, {
        reply_markup: setReplyMarkup,
        parse_mode: "HTML",
      });
    } else {
      bot.editMessageText(settext, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: setReplyMarkup,
        parse_mode: "html",
      });
    }
  });
}

module.exports = {
  setnetwork,
};
