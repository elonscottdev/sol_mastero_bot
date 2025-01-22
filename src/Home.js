require("dotenv").config();

const web3 = require("@solana/web3.js");
const storage = require("node-persist");
const Web3 = require("web3");
const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");
const { ethers } = require("ethers");
const base58 = require("bs58");
const { getTokenAccounts } = require("./Helius");
const connection = new web3.Connection(
  "https://mainnet.helius-rpc.com/?api-key=7ee5ade7-805f-4c9f-8252-f370010985aa"
);

const suiClient = new SuiClient({
  url: getFullnodeUrl("mainnet"),
});

storage.init();

const startReplyMarkup = {
  inline_keyboard: [
    [
      { text: "Buy", callback_data: "buy" },
      { text: "Sell & Manage", callback_data: "sell" },
    ],
    [
      { text: "Wallet", callback_data: "wallet" },
      { text: "Settings", callback_data: "setting" },
    ],
    [{ text: "Refer Friends", callback_data: "refer" }],
  ],
};

const home = async (chatId, bot, msgId) => {
  storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
    let txt = `<b>Welcome to VertexTradingBot!</b>\n\n`;

    if (!userWallet) {
      const wallet = await web3.Keypair.generate();
      const publicKey = wallet.publicKey.toBase58();
      const privateKey = base58.encode(wallet.secretKey).toString();

      const ethWallet = ethers.Wallet.createRandom();
      const ethPublicKey = ethWallet.address;
      const ethPrivateKey = ethWallet.privateKey;

      const bscWallet = ethers.Wallet.createRandom();
      const bscPublicKey = bscWallet.address;
      const bscPrivateKey = bscWallet.privateKey;

      const keypair = Ed25519Keypair.generate();
      const suiAddress = keypair.getPublicKey().toSuiAddress();
      const suiSecreteKey = keypair.getSecretKey().toString();

      userWallet = {
        network: "sol",
        sol: {
          publicKey: publicKey,
          privateKey: privateKey,
          settings: {
            announcements: "enable",
            minpos: "0.001",
            autoset: "disable",
            autoSOL: "0.1",
            buyleftset: "1",
            buyrightset: "5",
            sellleftset: "25",
            sellrightset: "100",
            slippagebuy: "10",
            slippagesell: "10",
            maximpct: "25",
            secure: "Secure",
            translevel: "Medium",
            transval: "0.001",
          },
        },
        eth: {
          publicKey: ethPublicKey,
          privateKey: ethPrivateKey,
        },
        bsc: {
          publicKey: bscPublicKey,
          privateKey: bscPrivateKey,
        },
        sui: {
          publicKey: suiAddress,
          privateKey: suiSecreteKey,
        },
      };
      await storage.setItem(`userWallet_${chatId}`, userWallet);
      txt +=
        `Solana's fastest bot to trade any coin (SPL token), and Vertex's official Telegram trading bot.\n\n` +
        `You currently have no SOL balance. To get started with trading, send some SOL to your wallet address:\n\n` +
        `<code>${userWallet.sol.publicKey}</code>(tap to copy)\n\n` +
        `Once done tap refresh and your balance will appear here.\n\n` +
        `To buy a token just enter a token address, or even post the birdeye link of the coin.\n\n` +
        `For more info on your wallet and to retrieve your private key, tap the wallet button below.` +
        `We guarantee the safety of user funds on VertexTradingBot, but if you expose your private key your funds will not be safe.`;
    } else {
      if (userWallet.network === "sol") {
        console.log("choosed sol");
        const balance = await connection.getBalance(
          new web3.PublicKey(userWallet.sol.publicKey)
        );
        const sell_data = await getTokenAccounts(userWallet.sol.publicKey);
        const sol_balance = balance / web3.LAMPORTS_PER_SOL;
        if (sol_balance > 0) {
          if (sell_data.total > 0) {
            txt +=
              `You currently have a balance of <b>${sol_balance.toFixed(
                4
              )}</b> SOL, and <b>${sell_data.total}</b> open positions.\n\n` +
              `To buy a token just enter a token address or paste a Birdeye link,` +
              ` and you will see a Buy dashboard pop up where you can choose how much you want to buy.\n\n` +
              `Advanced traders can enable Auto Buy in their settings. When enabled,` +
              ` VertexTradingBot will instantly buy any token you enter with a fixed amount that you set.` +
              ` This is <b>disabled</b> by default.\n\n` +
              `Wallet:\n<code>${userWallet.publicKey}</code>`;
          } else {
            txt +=
              `You currently have a balance of <b>${sol_balance.toFixed(
                4
              )}</b> SOL, but no open positions.\n\n` +
              `To get started trading, you can open a position by buying a token.\n\n` +
              `To buy a token just enter a token address or paste a Birdeye link,` +
              ` and you will see a Buy dashboard pop up where you can choose how much you want to buy.\n\n` +
              `Advanced traders can enable Auto Buy in their settings. When enabled,` +
              ` VertexTradingBot will instantly buy any token you enter with a fixed amount that you set.` +
              ` This is <b>disabled</b> by default.\n\n` +
              `Wallet:\n<code>${userWallet.sol.publicKey}</code>`;
          }
        } else {
          txt +=
            `Solana's fastest bot to trade any coin (SPL token), and Vertex's official Telegram trading bot.\n\n` +
            `You currently have no SOL balance. To get started with trading, send some SOL to your VertexTradingBot wallet address:\n\n` +
            `<code>${userWallet.sol.publicKey}</code>(tap to copy)\n\n` +
            `Once done tap refresh and your balance will appear here.\n\n` +
            `To buy a token just enter a token address, or even post the birdeye link of the coin.\n\n` +
            `For more info on your wallet and to retrieve your private key, tap the wallet button below.` +
            `We guarantee the safety of user funds on VertexTradingBot, but if you expose your private key your funds will not be safe.`;
        }
      }
      if (userWallet.network === "eth") {
        const web3 = new Web3(process.env.ETH_INFURA_URL);
        const balance = await web3.eth.getBalance(userWallet.eth.publicKey);
        const eth_balance = ethers.formatEther(balance);
        if (eth_balance > 0) {
          txt +=
            `You currently have a balance of <b>${eth_balance}</b> ETH.\n\n` +
            `To get started trading, you can open a position by buying a token.\n\n` +
            `To buy a token just enter a token address or paste a Birdeye link,` +
            ` and you will see a Buy dashboard pop up where you can choose how much you want to buy.\n\n` +
            `Advanced traders can enable Auto Buy in their settings. When enabled,` +
            ` VertexTradingBot will instantly buy any token you enter with a fixed amount that you set.` +
            ` This is <b>disabled</b> by default.\n\n` +
            `Wallet:\n<code>${userWallet.eth.publicKey}</code>`;
        } else {
          txt +=
            `ETH's fastest bot to trade any coin, and Vertex's official Telegram trading bot.\n\n` +
            `You currently have no ETH balance. To get started with trading, send some ETH to your VertexTradingBot wallet address:\n\n` +
            `<code>${userWallet.eth.publicKey}</code>(tap to copy)\n\n` +
            `Once done tap refresh and your balance will appear here.\n\n` +
            `To buy a token just enter a token address, or even post the birdeye link of the coin.\n\n` +
            `For more info on your wallet and to retrieve your private key, tap the wallet button below.` +
            `We guarantee the safety of user funds on VertexTradingBot, but if you expose your private key your funds will not be safe.`;
        }
      }
      if (userWallet.network === "bsc") {
        const web3 = new Web3(process.env.BSC_INFURA_URL);
        const balance = await web3.eth.getBalance(userWallet.bsc.publicKey);
        console.log("choosed bsc balance:", balance);
        const bsc_balance = ethers.formatEther(balance);
        if (bsc_balance > 0) {
          txt +=
            `You currently have a balance of <b>${bsc_balance}</b> BNB.\n\n` +
            `To get started trading, you can open a position by buying a token.\n\n` +
            `To buy a token just enter a token address or paste a Birdeye link,` +
            ` and you will see a Buy dashboard pop up where you can choose how much you want to buy.\n\n` +
            `Advanced traders can enable Auto Buy in their settings. When enabled,` +
            ` VertexTradingBot will instantly buy any token you enter with a fixed amount that you set.` +
            ` This is <b>disabled</b> by default.\n\n` +
            `Wallet:\n<code>${userWallet.bsc.publicKey}</code>`;
        } else {
          txt +=
            `BSC's fastest bot to trade any coin, and Vertex's official Telegram trading bot.\n\n` +
            `You currently have no BNB balance. To get started with trading, send some BNB to your VertexTradingBot wallet address:\n\n` +
            `<code>${userWallet.bsc.publicKey}</code>(tap to copy)\n\n` +
            `Once done tap refresh and your balance will appear here.\n\n` +
            `To buy a token just enter a token address, or even post the birdeye link of the coin.\n\n` +
            `For more info on your wallet and to retrieve your private key, tap the wallet button below.` +
            `We guarantee the safety of user funds on VertexTradingBot, but if you expose your private key your funds will not be safe.`;
        }
      }
      if (userWallet.network === "sui") {
        const balance = await suiClient.getBalance({
          owner: userWallet.sui.publicKey,
        });
        const sui_balance = Number(balance.totalBalance) / 1000000000;
        console.log("choosed sui balance:", sui_balance);
        if (sui_balance > 0) {
          txt +=
            `You currently have a balance of <b>${sui_balance.toFixed(4)}</b> SUI.\n\n` +
            `To get started trading, you can open a position by buying a token.\n\n` +
            `To buy a token just enter a token address or paste a Birdeye link,` +
            ` and you will see a Buy dashboard pop up where you can choose how much you want to buy.\n\n` +
            `Advanced traders can enable Auto Buy in their settings. When enabled,` +
            ` VertexTradingBot will instantly buy any token you enter with a fixed amount that you set.` +
            ` This is <b>disabled</b> by default.\n\n` +
            `Wallet:\n<code>${userWallet.sui.publicKey}</code>`;
        } else {
          txt +=
            `SUI's fastest bot to trade any coin, and Vertex's official Telegram trading bot.\n\n` +
            `You currently have no SUI balance. To get started with trading, send some SUI to your VertexTradingBot wallet address:\n\n` +
            `<code>${userWallet.sui.publicKey}</code>(tap to copy)\n\n` +
            `Once done tap refresh and your balance will appear here.\n\n` +
            `To buy a token just enter a token address, or even post the birdeye link of the coin.\n\n` +
            `For more info on your wallet and to retrieve your private key, tap the wallet button below.` +
            `We guarantee the safety of user funds on VertexTradingBot, but if you expose your private key your funds will not be safe.`;
        }
      }
    }
    if (!msgId) {
      bot.sendMessage(chatId, txt, {
        reply_markup: startReplyMarkup,
        parse_mode: "html",
      });
    } else {
      bot.editMessageText(txt, {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: startReplyMarkup,
        parse_mode: "html",
      });
    }
  });
};

module.exports = {
  home,
};
