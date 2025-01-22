require('dotenv').config();

const storage = require('node-persist');
const { Keypair } = require("@solana/web3.js")
const bs58 = require("bs58")
const { Wallet } = require("@project-serum/anchor")
const { swapJupyter, getTokenBalance } = require('./server-function');

storage.init();
const SOL = "So11111111111111111111111111111111111111112"

let activeIntervals = {}
let intervalPiece = 0
const SellSOL = async (chatId, bot, tokenAddress, percentageToSell) => {
    let user_pri_key;

    await storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        user_pri_key = userWallet.privateKey;
    });
    let msgId = '';
    let txt = `Transaction sent. Waiting for confirmation...` +
        `If transaction is slow to confirm increase transaction priority in /settings and` +
        ` make sure you have enough sol to pay for the fee. Keep retrying, high fee doesnt guarantee inclusion.`
    bot.sendMessage(chatId, txt, { parse_mode: `HTML` }).then((msg) => {
        msgId = msg.message_id;
    });

    const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(user_pri_key)));

    try {
        const tokenBalance = await getTokenBalance(
            wallet.publicKey,
            tokenAddress,
        )
        if (!tokenBalance) return { ok: false, msg: "Token balance not found" }
        const amountToSell = (tokenBalance.amount * percentageToSell) / 100
        const response = await swapJupyter(
            user_pri_key,
            tokenAddress,
            SOL,
            amountToSell,
            10,
        )

        if (!response || !response.ok || !response.txid) {
            txt = "Transaction failed.\n Coundn't get a quote";
            bot.editMessageText(txt, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: "html",
            });
            return;
        }

        let intervalCounter = 0
        intervalPiece++
        const myInterCount = intervalPiece
        const intervalSell = setInterval(async () => {
            intervalCounter++
            let tokenBalanceAfterSelling = await getTokenBalance(
                wallet.publicKey,
                tokenAddress,
            )
            // Token has been sold
            if (!tokenBalanceAfterSelling || tokenBalanceAfterSelling.amount < tokenBalance.amount) {
                clearInterval(activeIntervals[myInterCount])
                txt = `Transaction confirmed!\nhttps://solscan.io/tx/${response.txid}`
                bot.editMessageText(txt, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: "html",
                });
                return;
            } else if (intervalCounter >= 21) {
                clearInterval(activeIntervals[myInterCount])
                txt = "Transaction failed.\n Coundn't get a quote";
                bot.editMessageText(txt, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: "html",
                });
                return;
            }
        }, 3e3)
        // Mapping where the key is the address
        activeIntervals[myInterCount] = intervalSell
    } catch (e) {
        txt = "Transaction failed.\n Coundn't get a quote";
        bot.editMessageText(txt, {
            chat_id: chatId,
            message_id: msgId,
            parse_mode: "html",
        });
        return;
    }
}

module.exports = {
    SellSOL
}