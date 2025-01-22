require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const web3 = require("@solana/web3.js");
const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
const storage = require("node-persist");
const base58 = require("bs58");
const Web3 = require("web3");
const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");

const { setbot } = require("./src/Setbot");
const { home } = require("./src/Home");
const { buy } = require("./src/Buy");
const { sell } = require("./src/Sell");
const { sellOther } = require("./src/SellOther");
const { Wallet } = require("./src/Wallet");
const { getTokenAccounts } = require("./src/Helius");
const { Withdraw } = require("./src/Withdraw");
const { BuySOL } = require("./src/BuySOL");
const { BuyBNB } = require("./src/BuyBNB");
const { BuyETH } = require("./src/BuyETH");

const { SellSOL } = require("./src/SellSOL");
const { setnetwork } = require("./src/SetNetwork");
const { BuySUI } = require("./src/BuySUI");
const { token } = require("@coral-xyz/anchor/dist/cjs/utils");
const Moralis = require("moralis").default;

const suiClient = new SuiClient({
  url: getFullnodeUrl("mainnet"),
});

Moralis.start({
  apiKey: process.env.MORALIS_API_KEY,
});

const TgBotToken = process.env.TG_API_KEY;
const connection = new web3.Connection(process.env.RPC_URL);
const bot = new TelegramBot(TgBotToken, { polling: true });

let tokenAddress = "";
let sell_count = 0;

storage.init();

/**
 * Handles incoming messages to the Telegram bot.
 *
 * This function is called whenever a message is received by the bot. It checks the message text and performs different actions based on the command or content of the message.
 *
 * If the message starts with a slash ('/'), it checks the command and calls the corresponding function (home, help, or setbot) to handle the command.
 *
 * If the message does not start with a slash, it checks if the message is a reply to another message. If so, it extracts the token address from the message text and tries to find the token information. If the token is found, it calls the buy function to handle the buy operation. If the token is not found, it sends an error message to the user.
 *
 * @param {object} msg - The incoming message object from the Telegram bot.
 * @param {number} msg.chat.id - The chat ID of the user who sent the message.
 * @param {string} msg.text - The text content of the message.
 */
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  const userWallet = await storage.getItem(`userWallet_${chatId}`);
  if (!messageText) {
  } else if (messageText.startsWith("/")) {
    const command = messageText.slice(1).toLowerCase();
    switch (command) {
      case "start":
        //Check if user has a wallet
        home(chatId, bot);
        break;
      case "home":
        //Check if user has a wallet
        home(chatId, bot);
        break;
      case "settings":
        //Display settings menu
        setbot(chatId, null, bot);
        break;
      case "wallet":
        //Display wallet menu
        Wallet(chatId, bot);
        break;
      default:
        break;
    }
  } else if (!msg.reply_to_message) {
    if (userWallet.network === "sol") {
      tokenAddress = messageText;
      const regex = /\/([^\/]+)$/;
      const match = messageText.match(regex);
      if (match) tokenAddress = match[1];
      const err_txt = `Token not found. Make sure address (${tokenAddress}) is correct. You can enter a token address or a Solscan/Birdeye link. If you are trying to enter a buy or sell amount, ensure you click and reply to the message`;

      try {
        const token = new web3.PublicKey(tokenAddress);
        const tokenAccountInfo = await connection.getParsedAccountInfo(token);
        if (tokenAccountInfo) {
          buy(chatId, bot, tokenAddress);
        } else {
          bot.sendMessage(chatId, err_txt);
        }
      } catch (error) {
        bot.sendMessage(chatId, err_txt);
      }
    } else {
      tokenAddress = messageText;
      try {
        buy(chatId, bot, tokenAddress);
      } catch (error) {
        bot.sendMessage(chatId, err_txt);
      }
    }
  }
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const msgId = query.message.message_id;
  const data = query.data;
  let user_pub_key;
  let user_pri_key;
  const userWallet = await storage.getItem(`userWallet_${chatId}`);
  /**
   * Retrieves the user's wallet information from storage and assigns it to the corresponding variables.
   *
   * @param {string} chatId - The unique identifier for the user's chat session.
   * @returns {Promise<void>} - A Promise that resolves when the wallet information has been retrieved and assigned.
   */
  user_pri_key = userWallet.sol.privateKey;
  user_pub_key = userWallet.sol.publicKey;

  const sell_data = await getTokenAccounts(user_pub_key);
  const mx_sell_count = sell_data.total;
  const balance = await connection.getBalance(new web3.PublicKey(user_pub_key));
  const walletbalance = balance / web3.LAMPORTS_PER_SOL;

  switch (data) {
    case "close":
      // Handle close button click
      bot.deleteMessage(chatId, msgId);
      break;

    // home start
    case "buy":
      // Handle buy button click
      const buy_txt =
        "Buy Token:\n\nTo buy token enter a token address or birdeye link";
      bot.sendMessage(chatId, buy_txt, {
        reply_markup: {
          inline_keyboard: [[{ text: "Close", callback_data: "close" }]],
        },
        parse_mode: "HTML",
      });
      break;
    case "sell":
      if (userWallet.network === "sol") {
        // Handle sell button click
        if (sell_data.total === 0) {
          bot.sendMessage(chatId, `No Open positions`, {
            reply_markup: {
              inline_keyboard: [[{ text: "Close", callback_data: "close" }]],
            },
            parse_mode: "html",
          });
        } else {
          sell(chatId, bot, sell_data, sell_count);
        }
      } else {
        bot
          .sendMessage(chatId, `Reply with the token address`, {
            reply_markup: { force_reply: true },
          })
          .then((msg) => {
            bot.onReplyToMessage(chatId, msg.message_id, async (msg) => {
              const tokenAddress = msg.text;
              await sellOther(chatId, tokenAddress, bot);
            });
          });
      }
      break;
    case "help":
      // Handle help button click
      help(chatId, bot);
      break;
    case "refer":
      // Handle refer button click
      break;
    case "wallet":
      // Handle wallet button click
      Wallet(chatId, bot);
      break;
    case "setting":
      // Handle setting button click
      setbot(chatId, null, bot);
      break;
    case "pin":
      // Handle pin button click
      bot.pinChatMessage(chatId, msgId);
      break;
    case "choose_network":
      setnetwork(chatId, null, bot);
      break;
    case "refresh_home":
      // Handle refresh button click
      home(chatId, bot, msgId);
      break;
    // home end

    //network start
    case "choose_sol":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        userWallet.network = "sol";
        await storage.setItem(`userWallet_${chatId}`, userWallet);
      });
      home(chatId, bot);
      break;
    case "choose_eth":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        userWallet.network = "eth";
        await storage.setItem(`userWallet_${chatId}`, userWallet);
        await home(chatId, bot);
      });
      break;
    case "choose_bsc":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        userWallet.network = "bsc";
        await storage.setItem(`userWallet_${chatId}`, userWallet);
        await home(chatId, bot);
      });
      break;
    case "choose_sui":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        userWallet.network = "sui";
        await storage.setItem(`userWallet_${chatId}`, userWallet);
        await home(chatId, bot);
      });
      break;
    //network end

    // wallet start
    case "deposit":
      // Handle deposit button click
      bot.sendMessage(chatId, "To deposit send SOL to below address:");
      bot.sendMessage(chatId, `<code>${user_pub_key}</code>`, {
        parse_mode: "html",
      });
      break;
    case "deposit_bnb":
      // Handle deposit button click
      bot.sendMessage(chatId, "To deposit send BNB to below address:");
      bot.sendMessage(chatId, `<code>${userWallet.bsc.publicKey}</code>`, {
        parse_mode: "html",
      });
      break;
    case "deposit_sui":
      // Handle deposit button click
      bot.sendMessage(chatId, "To deposit send SUI to below address:");
      bot.sendMessage(chatId, `<code>${userWallet.sui.publicKey}</code>`, {
        parse_mode: "html",
      });
      break;
    case "deposit_eth":
      // Handle deposit button click
      bot.sendMessage(chatId, "To deposit send ETH to below address:");
      bot.sendMessage(chatId, `<code>${userWallet.eth.publicKey}</code>`, {
        parse_mode: "html",
      });
      break;
    case "deposit_sui":
      // Handle deposit button click
      bot.sendMessage(chatId, "To deposit send SOL to below address:");
      bot.sendMessage(chatId, `<code>${userWallet.sui.publicKey}</code>`, {
        parse_mode: "html",
      });
      break;
    case "exportpk":
      // Handle export private key button click
      bot.sendMessage(
        chatId,
        "Are you sure want to export your <b>Private Key</b>?",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Cancel", callback_data: "close" },
                { text: "Confirm", callback_data: "exportprivatekey" },
              ],
            ],
          },
          parse_mode: "HTML",
        }
      );
      break;
    case "exportprivatekey":
      // Handle export private key confirmation
      const network = userWallet.network;
      if (network === "sol") {
        const text =
          `Your Private key is:\n\n<code>${user_pub_key}</code>\n\n` +
          `You can now i.e. import the key into a wallet like Solflare. (tap to copy).\n` +
          `Delete this message once you are done.`;
        bot.sendMessage(chatId, text, { parse_mode: "HTML" });
      }
      if (network === "bsc") {
        const text =
          `Your Private key is:\n\n<code>${userWallet.bsc.privateKey}</code>\n\n` +
          `You can now i.e. import the key into a wallet like Metamask. (tap to copy).\n` +
          `Delete this message once you are done.`;
        bot.sendMessage(chatId, text, { parse_mode: "HTML" });
      }
      if (network === "eth") {
        const text =
          `Your Private key is:\n\n<code>${userWallet.eth.privateKey}</code>\n\n` +
          `You can now i.e. import the key into a wallet like Metamask. (tap to copy).\n` +
          `Delete this message once you are done.`;
        bot.sendMessage(chatId, text, { parse_mode: "HTML" });
      }
      if (network === "sui") {
        const text =
          `Your Private key is:\n\n<code>${userWallet.sui.privateKey}</code>\n\n` +
          `You can now i.e. import the key into a wallet like SUI wallet. (tap to copy).\n` +
          `Delete this message once you are done.`;
        bot.sendMessage(chatId, text, { parse_mode: "HTML" });
      }
      break;
    case "withdrawall":
      // Handle withdraw all SOL button click
      Withdraw(chatId, bot, "all");
      break;
    case "withdraw":
      // Handle withdraw X SOL button click
      await Withdraw(chatId, bot, "x");
      break;
    case "withdrawall_eth":
      // Handle withdraw all SOL button click
      Withdraw(chatId, bot, "all");
      break;
    case "withdraw_eth":
      // Handle withdraw X SOL button click
      await Withdraw(chatId, bot, "x");
      break;
    case "withdrawall_bnb":
      // Handle withdraw all SOL button click
      Withdraw(chatId, bot, "all");
      break;
    case "withdrawall_sui":
      // Handle withdraw all SOL button click
      Withdraw(chatId, bot, "all");
      break;
    case "withdraw_bnb":
      // Handle withdraw X SOL button click
      await Withdraw(chatId, bot, "x");
      break;
    case "withdraw_sui":
      // Handle withdraw X SOL button click
      await Withdraw(chatId, bot, "x");
      break;
    case "withdrawall_sui":
      // Handle withdraw all SOL button click
      Withdraw(chatId, bot, "all");
      break;
    case "withdraw_sui":
      // Handle withdraw X SOL button click
      await Withdraw(chatId, bot, "x");
      break;
    case "resetwallet":
      // Handle reset wallet button click
      if (userWallet.network === "sol") {
        let reest_txt;
        if (walletbalance > 0) {
          reest_txt =
            `Are you sure you want to <b>reset</b> your VertexTradingBot <b>Wallet</b>?\n\n` +
            `<b>WARNING: This action is irreversible!</b>\n\n` +
            `VertexTradingBot will generate a new wallet for you and discard your old one.\n\n` +
            `You have <b>${walletbalance}</b> SOL in your wallet. If you don't withdraw or back up the private key it will get lost.`;
        } else {
          reest_txt =
            `Are you sure you want to <b>reset</b> your VertexTradingBot <b>Wallet</b>?\n\n` +
            `<b>WARNING: This action is irreversible!</b>\n\n` +
            `VertexTradingBot will generate a new wallet for you and discard your old one.`;
        }
        bot.sendMessage(chatId, reest_txt, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Cancel", callback_data: "close" },
                { text: "Confirm", callback_data: "confirmreset" },
              ],
            ],
          },
        });
      } else if (userWallet.network === "bsc") {
        let reest_txt;
        const user_pub_key = userWallet.bsc.publicKey;
        const web3 = new Web3(process.env.BSC_INFURA_URL);
        const balance = await web3.eth.getBalance(user_pub_key);
        const bsc_balance = web3.utils.fromWei(balance, "ether");
        if (bsc_balance > 0) {
          reest_txt =
            `Are you sure you want to <b>reset</b> your VertexTradingBot <b>Wallet</b>?\n\n` +
            `<b>WARNING: This action is irreversible!</b>\n\n` +
            `VertexTradingBot will generate a new wallet for you and discard your old one.\n\n` +
            `You have <b>${bsc_balance}</b> SOL in your wallet. If you don't withdraw or back up the private key it will get lost.`;
        } else {
          reest_txt =
            `Are you sure you want to <b>reset</b> your VertexTradingBot <b>Wallet</b>?\n\n` +
            `<b>WARNING: This action is irreversible!</b>\n\n` +
            `VertexTradingBot will generate a new wallet for you and discard your old one.`;
        }
        bot.sendMessage(chatId, reest_txt, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Cancel", callback_data: "close" },
                { text: "Confirm", callback_data: "confirmreset" },
              ],
            ],
          },
        });
      } else if (userWallet.network === "eth") {
        let reest_txt;
        const user_pub_key = userWallet.eth.publicKey;
        const web3 = new Web3(process.env.ETH_INFURA_URL);
        const balance = await web3.eth.getBalance(user_pub_key);
        const eth_balance = web3.utils.fromWei(balance, "ether");
        if (eth_balance > 0) {
          reest_txt =
            `Are you sure you want to <b>reset</b> your VertexTradingBot <b>Wallet</b>?\n\n` +
            `<b>WARNING: This action is irreversible!</b>\n\n` +
            `VertexTradingBot will generate a new wallet for you and discard your old one.\n\n` +
            `You have <b>${eth_balance}</b> SOL in your wallet. If you don't withdraw or back up the private key it will get lost.`;
        } else {
          reest_txt =
            `Are you sure you want to <b>reset</b> your VertexTradingBot <b>Wallet</b>?\n\n` +
            `<b>WARNING: This action is irreversible!</b>\n\n` +
            `VertexTradingBot will generate a new wallet for you and discard your old one.`;
        }
        bot.sendMessage(chatId, reest_txt, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Cancel", callback_data: "close" },
                { text: "Confirm", callback_data: "confirmreset" },
              ],
            ],
          },
        });
      } else if (userWallet.network === "sui") {
        let reest_txt;
        const user_pub_key = userWallet.sui.publicKey;
        const balance = await suiClient.getBalance({
          owner: userWallet.sui.publicKey,
        });
        const sui_balance = Number(balance.totalBalance) / 1000000000;

        if (sui_balance > 0) {
          reest_txt =
            `Are you sure you want to <b>reset</b> your VertexTradingBot <b>Wallet</b>?\n\n` +
            `<b>WARNING: This action is irreversible!</b>\n\n` +
            `VertexTradingBot will generate a new wallet for you and discard your old one.\n\n` +
            `You have <b>${eth_balance}</b> SOL in your wallet. If you don't withdraw or back up the private key it will get lost.`;
        } else {
          reest_txt =
            `Are you sure you want to <b>reset</b> your VertexTradingBot <b>Wallet</b>?\n\n` +
            `<b>WARNING: This action is irreversible!</b>\n\n` +
            `VertexTradingBot will generate a new wallet for you and discard your old one.`;
        }
        bot.sendMessage(chatId, reest_txt, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Cancel", callback_data: "close" },
                { text: "Confirm", callback_data: "confirmreset" },
              ],
            ],
          },
        });
      }
      break;
    case "confirmreset":
      // Handle confirm reset wallet button click
      const txt =
        `<b>CONFIRM</b>: Are you sure you want to <b>reset</b> your VertexTradingBot <b>Wallet</b>?\n\n` +
        `<b>WARNING</b>: This action is irreversible!`;
      bot.sendMessage(chatId, txt, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Cancel", callback_data: "close" },
              { text: "Confirm", callback_data: "confirmresetcomplete" },
            ],
          ],
        },
        parse_mode: "HTML",
      });
      break;
    case "confirmresetcomplete":
      // Handle confirm reset wallet button click
      if (userWallet.network === "sol") {
        let complete_txt =
          `Your <b>Private Key</b> for your <b>OLD</b> wallet is:\n\n<code>${userWallet.sol.privateKey}</code>\n\n` +
          ` You can now i.e. import the key into a wallet like Solflare. (tap to copy).` +
          `Save this key in case you need to access this wallet again.`;
        bot.sendMessage(chatId, complete_txt, { parse_mode: `HTML` });

        const wallet = await web3.Keypair.generate();
        const publicKey = wallet.publicKey.toBase58();
        const privateKey = base58.encode(wallet.secretKey).toString();
        userWallet.sol.publicKey = publicKey;
        userWallet.sol.privateKey = privateKey;
        const txt =
          `Success: Your new wallet is:\n\n<code>${publicKey}</code>\n\n` +
          `You can now send SOL to this address to deposit into your new wallet. Press refresh to see your new wallet.`;
        await storage.setItem(`userWallet_${chatId}`, userWallet);
        bot.sendMessage(chatId, txt, { parse_mode: `HTML` });
      }
      if (userWallet.network === "bsc") {
        let complete_txt =
          `Your <b>Private Key</b> for your <b>OLD</b> wallet is:\n\n<code>${userWallet.bsc.privateKey}</code>\n\n` +
          ` You can now i.e. import the key into a wallet like Metamask. (tap to copy).` +
          `Save this key in case you need to access this wallet again.`;
        bot.sendMessage(chatId, complete_txt, { parse_mode: `HTML` });
        const bscWallet = ethers.Wallet.createRandom();
        const bscPublicKey = bscWallet.address;
        const bscPrivateKey = bscWallet.privateKey;
        userWallet.bsc.publicKey = bscPublicKey;
        userWallet.bsc.privateKey = bscPrivateKey;
        const txt =
          `Success: Your new wallet is:\n\n<code>${bscPublicKey}</code>\n\n` +
          `You can now send SOL to this address to deposit into your new wallet. Press refresh to see your new wallet.`;
        await storage.setItem(`userWallet_${chatId}`, userWallet);
        bot.sendMessage(chatId, txt, { parse_mode: `HTML` });
      }
      if (userWallet.network === "eth") {
        let complete_txt =
          `Your <b>Private Key</b> for your <b>OLD</b> wallet is:\n\n<code>${userWallet.eth.privateKey}</code>\n\n` +
          ` You can now i.e. import the key into a wallet like Metamask. (tap to copy).` +
          `Save this key in case you need to access this wallet again.`;
        bot.sendMessage(chatId, complete_txt, { parse_mode: `HTML` });
        bot.sendMessage(chatId, complete_txt, { parse_mode: `HTML` });
        const bscWallet = ethers.Wallet.createRandom();
        const bscPublicKey = bscWallet.address;
        const bscPrivateKey = bscWallet.privateKey;
        userWallet.eth.publicKey = bscPublicKey;
        userWallet.eth.privateKey = bscPrivateKey;
        const txt =
          `Success: Your new wallet is:\n\n<code>${bscPublicKey}</code>\n\n` +
          `You can now send SOL to this address to deposit into your new wallet. Press refresh to see your new wallet.`;
        await storage.setItem(`userWallet_${chatId}`, userWallet);
        bot.sendMessage(chatId, txt, { parse_mode: `HTML` });
      }

      if (userWallet.network === "sui") {
        let complete_txt =
          `Your <b>Private Key</b> for your <b>OLD</b> wallet is:\n\n<code>${userWallet.sui.privateKey}</code>\n\n` +
          ` You can now i.e. import the key into a wallet like Metamask. (tap to copy).` +
          `Save this key in case you need to access this wallet again.`;
        bot.sendMessage(chatId, complete_txt, { parse_mode: `HTML` });
        const keypair = Ed25519Keypair.generate();
        const suiAddress = keypair.getPublicKey().toSuiAddress();
        const suiSecreteKey = keypair.getSecretKey().toString();
        userWallet.sui.publicKey = suiAddress;
        userWallet.sui.privateKey = suiSecreteKey;
        const txt =
          `Success: Your new wallet is:\n\n<code>${suiAddress}</code>\n\n` +
          `You can now send SOL to this address to deposit into your new wallet. Press refresh to see your new wallet.`;
        await storage.setItem(`userWallet_${chatId}`, userWallet);
        bot.sendMessage(chatId, txt, { parse_mode: `HTML` });
      }
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {});
      complete_txt = "Success: Your new wallet is:";
      break;
    case "refresh_wallet":
      // Handle refresh wallet button click
      Wallet(chatId, bot, msgId);
      break;
    // wallet end

    //buy start
    case "buyleft":
      // Handle buy left button click
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        const buy_amount = userWallet.settings.buyleftset;
        BuySOL(chatId, bot, tokenAddress, buy_amount);
      });
      break;
    case "buyright":
      // Handle buy right button click
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        const buy_amount = userWallet.settings.buyrightset;
        BuySOL(chatId, bot, tokenAddress, buy_amount);
      });
      break;
    case "buyx":
      // Handle buy x button click
      if (userWallet.network === "sol") {
        bot
          .sendMessage(
            chatId,
            `Reply with the amount you wish to buy (0-${walletbalance} SOL, Example:0.1)`,
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
                const buy_amount = msg.text;
                BuySOL(chatId, bot, tokenAddress, buy_amount);
              }
            );
          });
      }
      if (userWallet.network === "bsc") {
        const user_pub_key = userWallet.bsc.publicKey;
        const web3 = new Web3(process.env.BSC_INFURA_URL);
        const balance = await web3.eth.getBalance(user_pub_key);
        const bsc_balance = web3.utils.fromWei(balance, "ether");
        bot
          .sendMessage(
            chatId,
            `Reply with the amount you wish to buy (0-${bsc_balance} BNB, Example:0.1)`,
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
                const buy_amount = msg.text;
                BuyBNB(chatId, bot, tokenAddress, buy_amount);
              }
            );
          });
      }
      if (userWallet.network === "eth") {
        const user_pub_key = userWallet.eth.publicKey;
        const web3 = new Web3(process.env.ETH_INFURA_URL);
        const balance = await web3.eth.getBalance(user_pub_key);
        const eth_balance = web3.utils.fromWei(balance, "ether");
        bot
          .sendMessage(
            chatId,
            `Reply with the amount you wish to buy (0-${eth_balance} ETH, Example:0.1)`,
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
                const buy_amount = msg.text;
                BuyETH(chatId, bot, tokenAddress, buy_amount);
              }
            );
          });
      }
      if (userWallet.network === "sui") {
        const balance = await suiClient.getBalance({
          owner: userWallet.sui.publicKey,
        });
        const sui_balance = Number(balance.totalBalance) / 1000000000;
        console.log("choosed sui balance:", sui_balance);

        bot
          .sendMessage(
            chatId,
            `Reply with the amount you wish to buy (0-${sui_balance} SUI, Example:0.1)`,
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
                const buy_amount = msg.text;
                BuySUI(chatId, bot, tokenAddress, buy_amount);
              }
            );
          });
      }
      break;
    case "refresh_buy":
      // Handle refresh buy button click
      buy(chatId, bot, tokenAddress, msgId);
      break;
    //buy end

    //send start
    case "home":
      // Handle home button click
      home(chatId, bot);
      break;
    case "sell_buyleft":
      // Handle sell buy left button click
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        const buy_amount = userWallet.settings.buyleftset;
        const token = sell_data.token_accounts[sell_count].mint;
        BuySOL(chatId, bot, token, buy_amount);
      });
      break;
    case "sell_buyright":
      // Handle sell buy right button click
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        const buy_amount = userWallet.settings.buyrightset;
        const token = sell_data.token_accounts[sell_count].mint;
        BuySOL(chatId, bot, token, buy_amount);
      });
      break;
    case "sell_buyx":
      // Handle sell buy x button click
      if (userWallet.network === "sol") {
        bot
          .sendMessage(
            chatId,
            `Reply with the amount you wish to buy (0-${walletbalance} SOL, Example:0.1)`,
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
                const buy_amount = msg.text;
                const token = sell_data.token_accounts[sell_count].mint;
                BuySOL(chatId, bot, token, buy_amount);
              }
            );
          });
      } 
      if (userWallet.network === "eth") {
        const user_pub_key = userWallet.eth.publicKey;
        const web3 = new Web3(process.env.ETH_INFURA_URL);
        const balance = await web3.eth.getBalance(user_pub_key);
        const eth_balance = web3.utils.fromWei(balance, "ether");
        bot
          .sendMessage(
            chatId,
            `Reply with the amount you wish to buy (0-${eth_balance} SOL, Example:0.1)`,
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
                const buy_amount = msg.text;
                const token = sell_data.token_accounts[sell_count].mint;
                BuySOL(chatId, bot, token, buy_amount);
              }
            );
          });
      } 
      break;
    case "sellleft":
      // Handle sell left button click
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        const sell_percent = userWallet.settings.sellleftset;
        const token = sell_data.token_accounts[sell_count].mint;
        SellSOL(chatId, bot, token, sell_percent);
      });
      break;
    case "sellright":
      // Handle sell right button click
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        const sell_percent = userWallet.settings.sellrightset;
        const token = sell_data.token_accounts[sell_count].mint;
        SellSOL(chatId, bot, token, sell_percent);
      });
      break;
    case "sellx":
      // Handle sell x button click
      bot
        .sendMessage(
          chatId,
          `Reply with the percent you wish to sell (Example:25)`,
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
              const sell_percent = msg.text;
              const token = sell_data.token_accounts[sell_count].mint;
              SellSOL(chatId, bot, token, sell_percent);
            }
          );
        });
      break;
    case "symbol":
      // Handle symbol button click
      sell(chatId, bot, sell_data, sell_count, msgId);
      break;
    case "sell_token_prev":
      // Handle sell_token_prev button click
      if (sell_count === 0) {
        sell_count = 0;
      } else {
        sell_count = sell_count - 1;
        sell(chatId, bot, sell_data, sell_count, msgId);
      }
      break;
    case "sell_token_next":
      // Handle sell_token_next button click
      if (sell_count === mx_sell_count - 1) {
        sell_count = sell_count;
      } else {
        sell_count = sell_count + 1;
        sell(chatId, bot, sell_data, sell_count, msgId);
      }
      break;
    case "refresh_sell":
      // Handle refresh button click
      if (sell_data.total === 0) {
        bot.sendMessage(chatId, `No Open positions`, {
          reply_markup: {
            inline_keyboard: [[{ text: "Close", callback_data: "close" }]],
          },
          parse_mode: "html",
        });
      } else {
        sell(chatId, bot, sell_data, sell_count, msgId);
      }
      break;
    //send end

    //settings start
    case "announcements":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        if (userWallet.settings.announcements === "enable") {
          userWallet.settings.announcements = "disable";
          await storage.setItem(`userWallet_${chatId}`, userWallet);
          bot.sendMessage(chatId, "VertexTradingBot Announcements disabled.");
        } else if (userWallet.settings.announcements === "disable") {
          userWallet.settings.announcements = "enable";
          await storage.setItem(`userWallet_${chatId}`, userWallet);
          bot.sendMessage(chatId, "VertexTradingBot Announcements enabled.");
        }
        setbot(chatId, msgId, bot);
      });
      break;
    case "minpos":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        bot
          .sendMessage(
            chatId,
            "Reply with your new minimum $ value for positions to be displayed. Example: 0.01",
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
                userWallet.settings.minpos = msg.text;
                await storage.setItem(`userWallet_${chatId}`, userWallet);
                setbot(chatId, msgId, bot);
              }
            );
          });
      });
      break;
    case "autoset":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        if (userWallet.settings.autoset === "enable") {
          userWallet.settings.autoset = "disable";
          await storage.setItem(`userWallet_${chatId}`, userWallet);
          bot.sendMessage(chatId, "Auto Buy disabled.");
        } else if (userWallet.settings.autoset === "disable") {
          userWallet.settings.autoset = "enable";
          await storage.setItem(`userWallet_${chatId}`, userWallet);
          bot.sendMessage(chatId, "Auto Buy enabled.");
        }
        setbot(chatId, msgId, bot);
      });
      break;
    case "autoSOL":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        bot
          .sendMessage(
            chatId,
            "Reply with your new Auto Buy Amount in SOL. Example: 0.5",
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
                userWallet.settings.autoSOL = msg.text;
                await storage.setItem(`userWallet_${chatId}`, userWallet);
                setbot(chatId, msgId, bot);
              }
            );
          });
      });
      break;
    case "buyleftset":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        bot
          .sendMessage(
            chatId,
            "Reply with your new setting for the left Buy Button in SOL. Example: 0.5",
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
                userWallet.settings.buyleftset = msg.text;
                await storage.setItem(`userWallet_${chatId}`, userWallet);
                setbot(chatId, msgId, bot);
              }
            );
          });
      });
      break;
    case "buyrightset":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        bot
          .sendMessage(
            chatId,
            "Reply with your new setting for the right Buy Button in SOL. Example: 1.5",
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
                userWallet.settings.buyrightset = msg.text;
                await storage.setItem(`userWallet_${chatId}`, userWallet);
                setbot(chatId, msgId, bot);
              }
            );
          });
      });
      break;
    case "sellleftset":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        bot
          .sendMessage(
            chatId,
            "Reply with your new setting for the left Sell Button in % (0 - 100%). Example: 25",
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
                userWallet.settings.sellleftset = msg.text;
                await storage.setItem(`userWallet_${chatId}`, userWallet);
                setbot(chatId, msgId, bot);
              }
            );
          });
      });
      break;
    case "sellrightset":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        bot
          .sendMessage(
            chatId,
            "Reply with your new setting for the right Sell Button in % (0 - 100%). Example: 100",
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
                userWallet.settings.sellrightset = msg.text;
                await storage.setItem(`userWallet_${chatId}`, userWallet);
                setbot(chatId, msgId, bot);
              }
            );
          });
      });
      break;
    case "slippagebuy":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        bot
          .sendMessage(
            chatId,
            "Reply with your new slippage setting for buys in % (0.00 - 100.00%). Example: 5.5",
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
                userWallet.settings.slippagebuy = msg.text;
                await storage.setItem(`userWallet_${chatId}`, userWallet);
                setbot(chatId, msgId, bot);
              }
            );
          });
      });
      break;
    case "slippagesell":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        bot
          .sendMessage(
            chatId,
            "Reply with your new slippage setting for sells in % (0.00 - 100.00%). Example: 1.5",
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
                userWallet.settings.slippagesell = msg.text;
                await storage.setItem(`userWallet_${chatId}`, userWallet);
                setbot(chatId, msgId, bot);
              }
            );
          });
      });
      break;
    case "maximpct":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        bot
          .sendMessage(
            chatId,
            "Reply with your new Max Price Impact setting in % (1 - 100%). Example: 50",
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
                userWallet.settings.maximpct = msg.text;
                await storage.setItem(`userWallet_${chatId}`, userWallet);
                setbot(chatId, msgId, bot);
              }
            );
          });
      });
      break;
    case "secure":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        if (userWallet.settings.secure === "Secure") {
          userWallet.settings.secure = "Turbo";
          await storage.setItem(`userWallet_${chatId}`, userWallet);
          bot.sendMessage(chatId, "MEV Protect set to disabled.");
        } else if (userWallet.settings.secure === "Turbo") {
          userWallet.settings.secure = "Secure";
          await storage.setItem(`userWallet_${chatId}`, userWallet);
          bot.sendMessage(chatId, "MEV Protect set to Secure.");
        }
        setbot(chatId, msgId, bot);
      });
      break;
    case "translevel":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        if (userWallet.settings.translevel === "Medium") {
          userWallet.settings.translevel = "High";
          await storage.setItem(`userWallet_${chatId}`, userWallet);
          bot.sendMessage(chatId, "Transaction Priority set to High.");
        } else if (userWallet.settings.translevel === "High") {
          userWallet.settings.translevel = "Very High";
          await storage.setItem(`userWallet_${chatId}`, userWallet);
          bot.sendMessage(chatId, "Transaction Priority set to Very High.");
        } else if (userWallet.settings.translevel === "Very High") {
          userWallet.settings.translevel = "Medium";
          await storage.setItem(`userWallet_${chatId}`, userWallet);
          bot.sendMessage(chatId, "Transaction Priority set to Medium.");
        }
        setbot(chatId, msgId, bot);
      });
      break;
    case "transval":
      storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        bot
          .sendMessage(
            chatId,
            "Reply with your new Transaction Priority Setting for sells in SOL. Example: 0.0001 SOL",
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
                userWallet.settings.transval = msg.text;
                await storage.setItem(`userWallet_${chatId}`, userWallet);
                setbot(chatId, msgId, bot);
              }
            );
          });
      });
      break;
    //settings end

    default:
      break;
  }

  bot.answerCallbackQuery(query.id);
});
