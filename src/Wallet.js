require("dotenv").config();

const web3 = require("@solana/web3.js");
const storage = require("node-persist");
const base58 = require("bs58");
const Web3 = require("web3");
const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");
const connection = new web3.Connection(process.env.RPC_URL);
storage.init();

const suiClient = new SuiClient({
  url: getFullnodeUrl("mainnet"),
});

const Wallet = async (chatId, bot, msgId) => {
  const userWallet = await storage.getItem(`userWallet_${chatId}`);

  if (userWallet.network === "sol") {
    const user_pub_key = userWallet.sol.publicKey;

    const balance = await connection.getBalance(
      new web3.PublicKey(user_pub_key)
    );
    const walletbalance = balance / web3.LAMPORTS_PER_SOL;

    const txt =
      `<b>Your Wallet:</b> \n\nAddress : <code>${user_pub_key}</code>\n` +
      `Balance : <b>${walletbalance}</b> SOL \n\n Tap to copy the address and send SOL to deposit.`;

    const wallet_markup = {
      inline_keyboard: [
        [
          {
            text: "View on Solscan",
            url: "https://solscan.io/account/" + user_pub_key,
          },
          { text: "Close", callback_data: "close" },
        ],
        [{ text: "Deposit SOL", callback_data: "deposit" }],
        [
          { text: "Withdraw all SOL", callback_data: "withdrawall" },
          { text: "Withdraw X SOL", callback_data: "withdraw" },
        ],
        [
          { text: "Reset Wallet", callback_data: "resetwallet" },
          { text: "Export Private Key", callback_data: "exportpk" },
        ],
        [{ text: "Refresh", callback_data: "refresh_wallet" }],
      ],
    };
    if (!msgId) {
      bot.sendMessage(chatId, txt, {
        reply_markup: wallet_markup,
        parse_mode: "html",
      });
    } else {
      bot.editMessageText(txt, {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: wallet_markup,
        parse_mode: "html",
      });
    }
  } else if (userWallet.network === "eth") {
    const user_pub_key = userWallet.eth.publicKey;
    const web3 = new Web3(process.env.ETH_INFURA_URL);
    const balance = await web3.eth.getBalance(user_pub_key);
    const eth_balance = web3.utils.fromWei(balance, "ether");

    const txt =
      `<b>Your Wallet:</b> \n\nAddress : <code>${user_pub_key}</code>\n` +
      `Balance : <b>${eth_balance}</b> ETH \n\n Tap to copy the address and send ETH to deposit.`;

    const wallet_markup = {
      inline_keyboard: [
        [
          {
            text: "View on Etherscan",
            url: "https://etherscan.io/account/" + user_pub_key,
          },
          { text: "Close", callback_data: "close" },
        ],
        [{ text: "Deposit ETH", callback_data: "deposit_eth" }],
        [
          { text: "Withdraw all ETH", callback_data: "withdrawall_eth" },
          { text: "Withdraw X ETH", callback_data: "withdraw_eth" },
        ],
        [
          { text: "Reset Wallet", callback_data: "resetwallet" },
          { text: "Export Private Key", callback_data: "exportpk" },
        ],
        [{ text: "Refresh", callback_data: "refresh_wallet" }],
      ],
    };
    if (!msgId) {
      bot.sendMessage(chatId, txt, {
        reply_markup: wallet_markup,
        parse_mode: "html",
      });
    } else {
      bot.editMessageText(txt, {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: wallet_markup,
        parse_mode: "html",
      });
    }
  } else if (userWallet.network === "bsc") {
    const user_pub_key = userWallet.bsc.publicKey;
    const web3 = new Web3(process.env.BSC_INFURA_URL);
    const balance = await web3.eth.getBalance(user_pub_key);
    const bsc_balance = web3.utils.fromWei(balance, "ether");

    const txt =
      `<b>Your Wallet:</b> \n\nAddress : <code>${user_pub_key}</code>\n` +
      `Balance : <b>${bsc_balance}</b> BNB \n\n Tap to copy the address and send BNB to deposit.`;

    const wallet_markup = {
      inline_keyboard: [
        [
          {
            text: "View on Bscscan",
            url: "https://bscscan.com/address/" + user_pub_key,
          },
          { text: "Close", callback_data: "close" },
        ],
        [{ text: "Deposit BNB", callback_data: "deposit_bnb" }],
        [
          { text: "Withdraw all BNB", callback_data: "withdrawall_bnb" },
          { text: "Withdraw X BNB", callback_data: "withdraw_bnb" },
        ],
        [
          { text: "Reset Wallet", callback_data: "resetwallet" },
          { text: "Export Private Key", callback_data: "exportpk" },
        ],
        [{ text: "Refresh", callback_data: "refresh_wallet" }],
      ],
    };
    if (!msgId) {
      bot.sendMessage(chatId, txt, {
        reply_markup: wallet_markup,
        parse_mode: "html",
      });
    } else {
      bot.editMessageText(txt, {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: wallet_markup,
        parse_mode: "html",
      });
    }
  }else if (userWallet.network === "sui") {
    const user_pub_key = userWallet.sui.publicKey;
    const balance = await suiClient.getBalance({
      owner: userWallet.sui.publicKey,
    });
    const sui_balance = Number(balance.totalBalance) / 1000000000;

    const txt =
      `<b>Your Wallet:</b> \n\nAddress : <code>${user_pub_key}</code>\n` +
      `Balance : <b>${sui_balance}</b> SUI \n\n Tap to copy the address and send SUI to deposit.`;

    const wallet_markup = {
      inline_keyboard: [
        [
          {
            text: "View on Suiscan",
            url: "https://suivision.xyz/account/" + user_pub_key,
          },
          { text: "Close", callback_data: "close" },
        ],
        [{ text: "Deposit SUI", callback_data: "deposit_sui" }],
        [
          { text: "Withdraw all SUI", callback_data: "withdrawall_sui" },
          { text: "Withdraw X SUI", callback_data: "withdraw_sui" },
        ],
        [
          { text: "Reset Wallet", callback_data: "resetwallet" },
          { text: "Export Private Key", callback_data: "exportpk" },
        ],
        [{ text: "Refresh", callback_data: "refresh_wallet" }],
      ],
    };
    if (!msgId) {
      bot.sendMessage(chatId, txt, {
        reply_markup: wallet_markup,
        parse_mode: "html",
      });
    } else {
      bot.editMessageText(txt, {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: wallet_markup,
        parse_mode: "html",
      });
    }
  }
};

module.exports = {
  Wallet,
};
