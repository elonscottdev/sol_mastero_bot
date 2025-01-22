require("dotenv").config();

const coinTicker = require("coin-ticker");
const web3 = require("@solana/web3.js");
const storage = require("node-persist");
const { get_info, get_Price } = require("./Helius");
const Web3 = require("web3");
const {
  getPairAddress,
  getSuiPairAddress,
  getEthPairAddress,
} = require("./utils");
const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");
const connection = new web3.Connection(process.env.RPC_URL);

const suiClient = new SuiClient({
  url: getFullnodeUrl("mainnet"),
});

storage.init();

async function buy(chatId, bot, tokenAddress, msgId) {
  let user_pub_key;
  let user_Wallet;
  const userWallet = await storage.getItem(`userWallet_${chatId}`);

  if (userWallet.network === "sol") {
    user_pub_key = userWallet.sol.publicKey;
    user_Wallet = userWallet.sol;

    const balance = await connection.getBalance(
      new web3.PublicKey(user_pub_key)
    );
    const walletbalance = balance / web3.LAMPORTS_PER_SOL;

    const token_info = await get_info(tokenAddress);
    let price;

    if (!token_info.token_info.price_info) {
      const t_price = await get_Price(tokenAddress);
      price = t_price.usdPrice;
    } else {
      const sol_info = await get_info(
        "So11111111111111111111111111111111111111112"
      );

      const tick = await coinTicker("bitfinex", "SOL_USD");
      price =
        (tick.last / sol_info.token_info.price_info.price_per_token) *
        token_info.token_info.price_info.price_per_token;
    }

    const name = token_info.content.metadata.name;
    const symbol = token_info.content.metadata.symbol;
    const market_cap =
      (token_info.token_info.supply * price) /
      1e6 /
      10 ** token_info.token_info.decimals;

    const text =
      `${name} | <b>${symbol}</b> |\n<code>${tokenAddress}</code>\n\n` +
      `Price : <b>$${price.toFixed(5)}</b>\n` +
      `5m: <b>+0.61</b>%, 1h: <b>+19.11</b>%, 6h: <b>+50.55</b>%, 24h: <b>+75.60</b>%\n` +
      `Market Cap : <b>$${market_cap.toFixed(2)}M</b>\n\n` +
      `Price Impact (1 SOL) : <b>${((1 - price / price) * 100).toFixed(
        2
      )}%</b>\n\n` +
      `Wallet Balance : <b>${walletbalance} SOL</b>\n` +
      `To buy press one of the buttons below.`;
    const buy_markup = {
      inline_keyboard: [
        [{ text: "Cancel", callback_data: "close" }],
        [
          {
            text: "Explorer",
            url: "https://solscan.io/account/" + tokenAddress,
          },
          { text: "Birdeye", url: "https://birdeye.so/token/" + tokenAddress },
        ],
        [
          {
            text: `Buy ${user_Wallet.settings.buyleftset} SOL`,
            callback_data: "buyleft",
          },
          {
            text: `Buy ${user_Wallet.settings.buyrightset} SOL`,
            callback_data: "buyright",
          },
          { text: "Buy X SOL", callback_data: "buyx" },
        ],
        [{ text: "Refresh", callback_data: "refresh_buy" }],
      ],
    };
    if (!msgId) {
      bot.sendMessage(chatId, text, {
        reply_markup: buy_markup,
        parse_mode: "html",
      });
    } else {
      bot.editMessageText(text, {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: buy_markup,
        parse_mode: "html",
      });
    }
  } else if (userWallet.network === "eth") {
    user_pub_key = userWallet.eth.publicKey;
    user_Wallet = userWallet.eth;

    const web3 = new Web3(process.env.ETH_INFURA_URL);
    const balance = await web3.eth.getBalance(userWallet.eth.publicKey);

    const eth_balance = web3.utils.fromWei(balance, "ether");
    const token_info = await getEthPairAddress(
      tokenAddress,
      userWallet.network
    );
    if (token_info) {
      console.log("token_info:", token_info);
      const price = Number(token_info.priceNative);

      const name = token_info.name;
      const symbol = token_info.symbol;
      const market_cap = token_info.market_cap / 10000000;

      const text =
        `${name} | <b>${symbol}</b> |\n<code>${tokenAddress}</code>\n\n` +
        `Price : <b>$${price} ETH</b>\n` +
        `5m: <b>+0.61</b>%, 1h: <b>+19.11</b>%, 6h: <b>+50.55</b>%, 24h: <b>+75.60</b>%\n` +
        `Market Cap : <b>$${market_cap.toFixed(2)}M</b>\n\n` +
        `Wallet Balance : <b>${eth_balance} ETH</b>\n` +
        `To buy press one of the buttons below.`;
      const buy_markup = {
        inline_keyboard: [
          [{ text: "Cancel", callback_data: "close" }],
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
          [{ text: "Buy X ETH", callback_data: "buyx" }],
          [{ text: "Refresh", callback_data: "refresh_buy" }],
        ],
      };
      if (!msgId) {
        bot.sendMessage(chatId, text, {
          reply_markup: buy_markup,
          parse_mode: "html",
        });
      } else {
        bot.editMessageText(text, {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: buy_markup,
          parse_mode: "html",
        });
      }
    } else {
      bot.sendMessage(chatId, "Token Address is not supported");
    }
  } else if (userWallet.network === "bsc") {
    user_pub_key = userWallet.bsc.publicKey;
    user_Wallet = userWallet.bsc;

    const web3 = new Web3(process.env.BSC_INFURA_URL);
    const balance = await web3.eth.getBalance(userWallet.bsc.publicKey);
    console.log("choosed bsc balance:", balance);

    const bsc_balance = web3.utils.fromWei(balance, "ether");
    const token_info = await getPairAddress(tokenAddress, userWallet.network);
    if (token_info) {
      console.log("token_info:", token_info);
      const price = Number(token_info.priceNative);

      const name = token_info.name;
      const symbol = token_info.symbol;
      const market_cap = token_info.market_cap / 10000000;

      const text =
        `${name} | <b>${symbol}</b> |\n<code>${tokenAddress}</code>\n\n` +
        `Price : <b>$${price}BNB</b>\n` +
        `5m: <b>+0.61</b>%, 1h: <b>+19.11</b>%, 6h: <b>+50.55</b>%, 24h: <b>+75.60</b>%\n` +
        `Market Cap : <b>$${market_cap.toFixed(2)}M</b>\n\n` +
        `Wallet Balance : <b>${bsc_balance} BNB</b>\n` +
        `To buy press one of the buttons below.`;
      const buy_markup = {
        inline_keyboard: [
          [{ text: "Cancel", callback_data: "close" }],
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
          [{ text: "Buy X BNB", callback_data: "buyx" }],
          [{ text: "Refresh", callback_data: "refresh_buy" }],
        ],
      };
      if (!msgId) {
        bot.sendMessage(chatId, text, {
          reply_markup: buy_markup,
          parse_mode: "html",
        });
      } else {
        bot.editMessageText(text, {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: buy_markup,
          parse_mode: "html",
        });
      }
    } else {
      bot.sendMessage(chatId, "Token Address is not supported");
    }
  } else if (userWallet.network === "sui") {
    user_pub_key = userWallet.sui.publicKey;
    user_Wallet = userWallet.sui;

    const balance = await suiClient.getBalance({
      owner: userWallet.sui.publicKey,
    });
    const sui_balance = Number(balance.totalBalance) / 1000000000;
    console.log("choosed sui balance:", sui_balance);

    const token_info = await getSuiPairAddress(
      tokenAddress,
      userWallet.network
    );
    if (token_info) {
      const price = Number(token_info.priceNative);

      const name = token_info.name;
      const symbol = token_info.symbol;
      const market_cap = token_info.market_cap / 10000000;

      const text =
        `${name} | <b>${symbol}</b> |\n<code>${tokenAddress}</code>\n\n` +
        `Price : <b>$${price}SUI</b>\n` +
        `5m: <b>+0.61</b>%, 1h: <b>+19.11</b>%, 6h: <b>+50.55</b>%, 24h: <b>+75.60</b>%\n` +
        `Market Cap : <b>$${market_cap.toFixed(2)}M</b>\n\n` +
        `Wallet Balance : <b>${sui_balance} SUI</b>\n` +
        `To buy press one of the buttons below.`;
      const buy_markup = {
        inline_keyboard: [
          [{ text: "Cancel", callback_data: "close" }],
          [
            {
              text: "Explorer",
              url: "https://suiscan.xyz/mainnet/coin/" + tokenAddress,
            },
            {
              text: "Birdeye",
              url: "https://birdeye.so/token/" + tokenAddress,
            },
          ],
          [{ text: "Buy X SUI", callback_data: "buyx" }],
          [{ text: "Refresh", callback_data: "refresh_buy" }],
        ],
      };
      if (!msgId) {
        bot.sendMessage(chatId, text, {
          reply_markup: buy_markup,
          parse_mode: "html",
        });
      } else {
        bot.editMessageText(text, {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: buy_markup,
          parse_mode: "html",
        });
      }
    } else {
      bot.sendMessage(chatId, "Token Address is not supported");
    }
  }
}

module.exports = {
  buy,
};
