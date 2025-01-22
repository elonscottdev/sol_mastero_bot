require("dotenv").config();
const Web3 = require("web3");
const storage = require("node-persist");
const { PancakeRouterAbi } = require("./abi/pancakeRouterAbi");

storage.init();

const BuyBNB = async (chatId, bot, tokenAddress, buy_amount) => {
  const web3 = new Web3(process.env.BSC_INFURA_URL);
  const amountInWei = web3.utils.toWei(buy_amount.toString(), "ether");
  const userWallet = await storage.getItem(`userWallet_${chatId}`);

  let msgId = "";
  let txt =
    `Transaction sent. Waiting for confirmation...\n` +
    `If transaction is slow to confirm increase transaction priority in /settings and` +
    ` make sure you have enough bnb to pay for the fee. Keep retrying, high fee doesnt guarantee inclusion.`;

  bot.sendMessage(chatId, txt, { parse_mode: `HTML` }).then((msg) => {
    msgId = msg.message_id;
  });

  const pancakeSwapRouter = new web3.eth.Contract(
    PancakeRouterAbi,
    "0x10ed43c718714eb63d5aa57b78b54704e256024e"
  );

  const path = [process.env.BNB_NATIVE_TOKEN_ADDRESS, tokenAddress];
  const amountOutMin = 0;
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  const nonce = await web3.eth.getTransactionCount(userWallet.bsc.publicKey);

  const gasPrice = await web3.eth.getGasPrice();

  console.log("infos:", deadline, nonce, gasPrice);

  try {
    const gasLimit = await pancakeSwapRouter.methods
      .swapExactETHForTokens(
        amountOutMin,
        path,
        userWallet.bsc.publicKey,
        deadline
      )
      .estimateGas({ from: userWallet.bsc.publicKey, value: amountInWei });

    const tx_data = pancakeSwapRouter.methods.swapExactETHForTokens(
      amountOutMin,
      path,
      userWallet.bsc.publicKey,
      deadline
    );
    const rawTransaction = {
      from: userWallet.bsc.publicKey,
      gasPrice: web3.utils.toHex(gasPrice),
      gas: web3.utils.toHex(gasLimit),
      nonce: String(nonce),
      data: tx_data.encodeABI(),
      value: amountInWei,
      to: "0x10ed43c718714eb63d5aa57b78b54704e256024e",
      chainId: 56,
    };

    const signedTx = await web3.eth.accounts.signTransaction(
      rawTransaction,
      userWallet.bsc.privateKey
    );

    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    if (!receipt) {
      txt = "Transaction failed.";
      bot.editMessageText(txt, {
        chat_id: chatId,
        message_id: msgId,
        parse_mode: "html",
      });
      return;
    } else {
      console.log("receipt:", receipt);

      txt = `Transaction confirmed!\nhttps://bscscan.com/tx/${receipt.transactionHash}`;

      bot.editMessageText(txt, {
        chat_id: chatId,
        message_id: msgId,
        parse_mode: "html",
      });
    }
  } catch (error) {
    txt = "Transaction failed. Insufficient funds for gas";
    console.log("error:", error);
    bot.editMessageText(txt, {
      chat_id: chatId,
      message_id: msgId,
      parse_mode: "html",
    });
    return;
  }
};

module.exports = {
  BuyBNB,
};
