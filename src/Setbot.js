require("dotenv").config();

const storage = require("node-persist");

storage.init();

/**
 * Displays a settings menu for the Setbot Telegram bot.
 *
 * @param {number} chatId - The chat ID of the Telegram user.
 * @param {number} messageId - The message ID of the previous settings message, if any.
 * @param {object} bot - The Telegram bot instance.
 * @returns {void}
 */
function setbot(chatId, messageId, bot) {
  storage.getItem(`userWallet_${chatId}`).then((userWallet) => {
    const network = userWallet.network;
    if (network === "sol") {
      const setKeyboard = [
        [{ text: "---GENERAL SETTINGS---", callback_data: "none" }],
        [{ text: "Choose Network", callback_data: "choose_network" }],
        [
          {
            text: `${
              userWallet.sol.settings.announcements === "enable"
                ? "🟢 Announcements"
                : "🔴 Announcements"
            }`,
            callback_data: "announcements",
          },
          {
            text: `\u270F Min Pos Value: $${userWallet.sol.settings.minpos}`,
            callback_data: "minpos",
          },
        ],
        [{ text: "---AUTO BUY---", callback_data: "none" }],
        [
          {
            text: `${
              userWallet.sol.settings.autoset === "enable"
                ? "🟢 Enable"
                : "🔴 Disable"
            }`,
            callback_data: "autoset",
          },
          {
            text: `\u270F ${userWallet.sol.settings.autoSOL} SOL`,
            callback_data: "autoSOL",
          },
        ],
        [{ text: "---BUY BUTTON CONFIG---", callback_data: "none" }],
        [
          {
            text: `\u270F Left: ${userWallet.sol.settings.buyleftset} SOL`,
            callback_data: "buyleftset",
          },
          {
            text: `\u270F Right: ${userWallet.sol.settings.buyrightset} SOL`,
            callback_data: "buyrightset",
          },
        ],
        [{ text: "---SELL BUTTONS CONFIG---", callback_data: "none" }],
        [
          {
            text: `\u270F LEFT: ${userWallet.sol.settings.sellleftset} %`,
            callback_data: "sellleftset",
          },
          {
            text: `\u270F Right: ${userWallet.sol.settings.sellrightset} %`,
            callback_data: "sellrightset",
          },
        ],
        [{ text: "---SLIPPAGE CONFIG---", callback_data: "none" }],
        [
          {
            text: `\u270F Buy: ${userWallet.sol.settings.slippagebuy}%`,
            callback_data: "slippagebuy",
          },
          {
            text: `\u270F Sell: ${userWallet.sol.settings.slippagesell}%`,
            callback_data: "slippagesell",
          },
        ],
        [
          {
            text: `\u270F Max Price Impct: ${userWallet.sol.settings.maximpct}%`,
            callback_data: "maximpct",
          },
        ],
        [{ text: "---MEV PROJECT---", callback_data: "none" }],
        [{ text: `${userWallet.sol.settings.secure}`, callback_data: "secure" }],
        [{ text: "---TRANSACTION PRIORITY---", callback_data: "none" }],
        [
          {
            text: `${userWallet.sol.settings.translevel}`,
            callback_data: "translevel",
          },
          {
            text: `\u270F ${userWallet.sol.settings.transval} SOL`,
            callback_data: "transval",
          },
        ],
        [{ text: "Close", callback_data: "close" }],
      ];

      const setReplyMarkup = {
        inline_keyboard: setKeyboard,
      };

      settext =
        "<b>Settings:</b>\n\n" +
        "<b>GENERAL SETTINGS</b>\n" +
        "<b>VertexTradingBot Announcements</b>: Occasional announcements. Tap to toggle.\n" +
        "<b>Minimum Position Value</b>: Minimum position value to show in portfolio. Will hide tokens below this threshhold. Tap to edit.\n\n" +
        "<b>AUTO BUY</b>\n" +
        "Immediately buy when pasting token address. Tap to toggle.\n\n" +
        "<b>BUTTONS CONFIG</b>\n" +
        "Customize your buy and sell buttons for buy token and manage position. Tap to edit.\n\n" +
        "<b>SLIPPAGE CONFIG</b>\n" +
        "Customize your slippage settings for buys and sells. Tap to edit.\n" +
        "Max Price Impact is to protect against trades in extremely illiquid pools.\n\n" +
        "<b>TRANSACTION PRIORITY</b>\n" +
        "Increase your Transaction Priority to improve transaction speed. Select preset or tap to edit.\n\n" +
        "<b>MEV PROTECT</b>\n" +
        "MEV Protect accelerates your transactions and protect against frontruns to make sure you get the best price possible.\n" +
        "<b>Turbo</b>: VertexTradingBot will use MEV Protect, but if unprotected sending is faster it will use that instead.\n" +
        "<b>Secure</b>: Transactions are guaranteed to be protected. This is the ultra secure option, but may be slower.";
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
    }
    else {
        const setKeyboard = [
          [{ text: "Choose Network", callback_data: "choose_network" }],
          [{ text: "Close", callback_data: "close" }],
        ];
  
        const setReplyMarkup = {
          inline_keyboard: setKeyboard,
        };
  
        settext =
          "<b>Settings:</b>\n\n" +
          "<b>Choose Network</b>\n" +
          "<b>VertexTradingBot</b>: supports 4 networks (ETH, BSC, SUI and SOL). You can choose as your mind\n";
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
      }
  });
}

module.exports = {
  setbot,
};
