require("dotenv").config();
const storage = require("node-persist");
const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");
const { DeepBookClient } = require("@mysten/deepbook-v3");
const { Transaction } = require("@mysten/sui/transactions");
const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");

const suiClient = new SuiClient({
  url: getFullnodeUrl("mainnet"),
});

storage.init();

const BuySUI = async (chatId, bot, tokenAddress, buy_amount) => {
  const userWallet = await storage.getItem(`userWallet_${chatId}`);
  const keypair = Ed25519Keypair.fromSecretKey(userWallet.sui.privateKey);

  const balance = await suiClient.getBalance({
    owner: userWallet.sui.publicKey,
  });

  const tx = new Transaction();

  const sui_balance = Number(balance.totalBalance) / 1000000000;

  if (sui_balance < buy_amount) {
    bot.sendMessage(chatId, "Insufficient Balance");
  } else {
    const dbClient = new DeepBookClient({
      address: userWallet.sui.publicKey,
      env: "mainnet",
      client: suiClient,
    });

    let msgId = "";
    let txt =
      `Transaction sent. Waiting for confirmation...\n` +
      `If transaction is slow to confirm increase transaction priority in /settings and` +
      ` make sure you have enough SUI to pay for the fee. Keep retrying, high fee doesnt guarantee inclusion.`;

    bot.sendMessage(chatId, txt, { parse_mode: `HTML` }).then((msg) => {
      msgId = msg.message_id;
    });

    try {
      const poolKey = dbClient.deepBook.getPoolIdByAssets(
        process.env.SUI_NATIVE_TOKEN_ADDRESS,
        tokenAddress
      );

      await suiClient.signAndExecuteTransaction({
        transaction: poolKey,
        signer: keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      // const tx_poolkey = tx.transferObjects([poolKey], userWallet.sui.publicKey);
      // console.log("tx_poolkey:", tx_poolkey);

      const [baseOut, quoteOut, deepOut] =
        dbClient.deepBook.swapExactBaseForQuote({
          poolKey: poolKey,
          amount: buy_amount,
          deepAmount: 1,
          minOut: 0.1,
        })(tx);

      tx.transferObjects(
        [baseOut, quoteOut, deepOut],
        userWallet.sui.publicKey
      );

      if (!tx) {
        txt = "Transaction failed.";
        bot.editMessageText(txt, {
          chat_id: chatId,
          message_id: msgId,
          parse_mode: "html",
        });
        return;
      } else {
        txt = `Transaction confirmed!\nhttps://bscscan.com/tx/${tx}`;

        bot.editMessageText(txt, {
          chat_id: chatId,
          message_id: msgId,
          parse_mode: "html",
        });
      }
    } catch (error) {
      txt = "Transaction failed. Coundn't get a quote";
      console.log("error:", error);
      bot.editMessageText(txt, {
        chat_id: chatId,
        message_id: msgId,
        parse_mode: "html",
      });
      return;
    }
  }
};

module.exports = {
  BuySUI,
};
