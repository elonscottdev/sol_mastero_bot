require("dotenv").config();

const Web3 = require("web3");
const storage = require("node-persist");
const {
  getEthPairAddress,
  getPairAddress,
  getSuiPairAddress,
  getEthTokenBalance,
  tokentoeth,
  tokentobnb,
} = require("./utils");

storage.init();

const sellOther = async (chatId, tokenAddress, bot, msgId) => {
  const userWallet = await storage.getItem(`userWallet_${chatId}`);

  if (userWallet.network === "eth") {
    const web3 = new Web3(process.env.ETH_INFURA_URL);
    const balance = await web3.eth.getBalance(userWallet.eth.publicKey);

    const eth_balance = web3.utils.fromWei(balance, "ether");

    const token_info = await getEthPairAddress(
      tokenAddress,
      userWallet.network
    );
    if (token_info) {
      const price = Number(token_info.priceNative);

      const name = token_info.name;
      const symbol = token_info.symbol;
      const market_cap = token_info.market_cap / 10000000;
      const priceUsd = token_info.priceUsd;
      const priceNative = token_info.priceNative;

      const sell_mark = {
        inline_keyboard: [
          [
            { text: "Home", callback_data: "home" },
            { text: "Close", callback_data: "close" },
          ],
          [
            {
              text: "Explorer",
              url: "https://etherscan.io/address/" + tokenAddress,
            },
            {
              text: "Birdeye",
              url: "https://birdeye.so/token/" + tokenAddress,
            },
          ],
          [{ text: "Refresh", callback_data: "Sell_refresh" }],
        ],
      };

      const tokenBalance = await getEthTokenBalance(
        tokenAddress,
        userWallet.eth.publicKey
      );

      const text =
        `${name} | <b>${symbol}</b> |\n<code>${tokenAddress}</code>\n\n` +
        `Value: <b>$${priceUsd}</b> / <b>${priceNative} ETH</b>\n` +
        `Mcap: <b>$${market_cap.toFixed(2)}M</b> @ <b>$${price.toFixed(4)}</b>\n` +
        `5m: <b>-1.06%</b>, 1h: <b>-0.18%</b>, 6h: <b>-0.12%</b>, 24h: <b>+13.62%</b>\n\n` +
        `Token Balance: <b>${tokenBalance} ${symbol}</b>\n` +
        `Wallet Balance: <b>${eth_balance} ETH</b>\n`;

      if (!msgId) {
        bot.sendMessage(chatId, text, {
          reply_markup: sell_mark,
          parse_mode: "html",
        });
      } else {
        bot.editMessageText(text, {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: sell_mark,
          parse_mode: "html",
        });
      }

      bot
        .sendMessage(
          chatId,
          `Reply with the amount you wish to sell (Example:25)`,
          {
            reply_markup: {
              force_reply: true,
            },
          }
        )
        .then((addApiId) => {
          bot.onReplyToMessage(
            addApiId.chat.id,
            addApiId.message_id,
            async (msg) => {
              const sellamount = msg.text;
              console.log("sellAmount:", sellamount);
              if (Number(sellamount) > Number(tokenBalance)) {
                bot.sendMessage(addApiId.chat.id, "Insufficient Token Balance");
              } else {
                console.log("start");
                bot.sendMessage(
                  addApiId.chat.id,
                  "Transaction is sent, Please wait a while"
                );
                const receipt = await tokentoeth(
                  tokenAddress,
                  process.env.ETH_NATIVE_TOKEN_ADDRESS,
                  userWallet.eth.publicKey,
                  userWallet.eth.privateKey,
                  sellamount
                );
                if (receipt) {
                  const txt = `Transaction confirmed!\nhttps://etherscan.io/tx/${receipt.transactionHash}`;

                  bot.editMessageText(txt, {
                    chat_id: addApiId.chat.id,
                    message_id: addApiId.message_id,
                    parse_mode: "html",
                  });
                } else {
                  bot.sendMessage(addApiId.chat.id, "Insufficient Balance");
                }
              }
            }
          );
        });
    } else {
      bot.sendMessage(chatId, "Token Address is not supported");
    }
  }
  if (userWallet.network === "bsc") {
    const web3 = new Web3(process.env.BSC_INFURA_URL);
    const balance = await web3.eth.getBalance(userWallet.bsc.publicKey);

    const bsc_balance = web3.utils.fromWei(balance, "ether");

    const token_info = await getPairAddress(
      tokenAddress,
      userWallet.network
    );
    
    if (token_info) {
      const price = Number(token_info.priceNative);

      const name = token_info.name;
      const symbol = token_info.symbol;
      const market_cap = token_info.market_cap / 10000000;
      const priceUsd = token_info.priceUsd;
      const priceNative = token_info.priceNative;

      const sell_mark = {
        inline_keyboard: [
          [
            { text: "Home", callback_data: "home" },
            { text: "Close", callback_data: "close" },
          ],
          [
            {
              text: "Explorer",
              url: "https://bscscan.com/address/" + tokenAddress,
            },
            {
              text: "Birdeye",
              url: "https://birdeye.so/token/" + tokenAddress,
            },
          ],
          [{ text: "Refresh", callback_data: "Sell_refresh" }],
        ],
      };

      const tokenBalance = await getEthTokenBalance(
        tokenAddress,
        userWallet.eth.publicKey
      );

      const text =
        `${name} | <b>${symbol}</b> |\n<code>${tokenAddress}</code>\n\n` +
        `Value: <b>$${priceUsd}</b> / <b>${priceNative} BNB</b>\n` +
        `Mcap: <b>$${market_cap.toFixed(2)}M</b> @ <b>$${price.toFixed(4)}</b>\n` +
        `5m: <b>-1.06%</b>, 1h: <b>-0.18%</b>, 6h: <b>-0.12%</b>, 24h: <b>+13.62%</b>\n\n` +
        `Token Balance: <b>${tokenBalance} ${symbol}</b>\n` +
        `Wallet Balance: <b>${bsc_balance} BNB</b>\n`;

      if (!msgId) {
        bot.sendMessage(chatId, text, {
          reply_markup: sell_mark,
          parse_mode: "html",
        });
      } else {
        bot.editMessageText(text, {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: sell_mark,
          parse_mode: "html",
        });
      }

      bot
        .sendMessage(
          chatId,
          `Reply with the amount you wish to sell (Example:25)`,
          {
            reply_markup: {
              force_reply: true,
            },
          }
        )
        .then((addApiId) => {
          bot.onReplyToMessage(
            addApiId.chat.id,
            addApiId.message_id,
            async (msg) => {
              const sellamount = msg.text;
              console.log("sellAmount:", sellamount);
              if (Number(sellamount) > Number(tokenBalance)) {
                bot.sendMessage(addApiId.chat.id, "Insufficient Token Balance");
              } else {
                console.log("start");
                bot.sendMessage(
                  addApiId.chat.id,
                  "Transaction is sent, Please wait a while"
                );
                const receipt = await tokentobnb(
                  tokenAddress,
                  process.env.BNB_NATIVE_TOKEN_ADDRESS,
                  userWallet.bsc.publicKey,
                  userWallet.bsc.privateKey,
                  sellamount
                );
                if (receipt) {
                  const txt = `Transaction confirmed!\nhttps://bscscan.com/tx/${receipt.transactionHash}`;

                  bot.editMessageText(txt, {
                    chat_id: addApiId.chat.id,
                    message_id: addApiId.message_id,
                    parse_mode: "html",
                  });
                } else {
                  bot.sendMessage(addApiId.chat.id, "Insufficient Balance");
                }
              }
            }
          );
        });
    } else {
      bot.sendMessage(chatId, "Token Address is not supported");
    }
  }
  if (userWallet.network === "sui") {
    const web3 = new Web3(process.env.ETH_INFURA_URL);
    const balance = await web3.eth.getBalance(userWallet.eth.publicKey);

    const eth_balance = web3.utils.fromWei(balance, "ether");

    const token_info = await getSuiPairAddress(
      tokenAddress,
      userWallet.network
    );

    if (token_info) {
      const price = Number(token_info.priceNative);

      const name = token_info.name;
      const symbol = token_info.symbol;
      const market_cap = token_info.market_cap / 10000000;
      const priceUsd = token_info.priceUsd;
      const priceNative = token_info.priceNative;

      const sell_mark = {
        inline_keyboard: [
          [
            { text: "Home", callback_data: "home" },
            { text: "Close", callback_data: "close" },
          ],
          [{ text: "Sell X", callback_data: "sell_buyx" }],
          [
            {
              text: "Explorer",
              url: "https://etherscan.io/address/" + tokenAddress,
            },
            {
              text: "Birdeye",
              url: "https://birdeye.so/token/" + tokenAddress,
            },
          ],
          [{ text: "Refresh", callback_data: "Sell_refresh" }],
        ],
      };
      const text =
        `${name} | <b>${symbol}</b> |\n<code>${tokenAddress}</code>\n\n` +
        `Value: <b>$${priceUsd}</b> / <b>${priceNative} SUI</b>\n` +
        `Mcap: <b>$${market_cap.toFixed(2)}M</b> @ <b>$${price.toFixed(4)}</b>\n` +
        `5m: <b>-1.06%</b>, 1h: <b>-0.18%</b>, 6h: <b>-0.12%</b>, 24h: <b>+13.62%</b>\n\n` +
        `Balance: <b>${tokenAmount.toFixed(2)} ${symbol}</b>\n` +
        `Wallet Balance: <b>${eth_balance} SOL</b>\n`;

      if (!msgId) {
        bot.sendMessage(chatId, text, {
          reply_markup: sell_mark,
          parse_mode: "html",
        });
      } else {
        bot.editMessageText(text, {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: sell_mark,
          parse_mode: "html",
        });
      }
    } else {
      bot.sendMessage(chatId, "Token Address is not supported");
    }
  }
};

module.exports = {
  sellOther,
};
