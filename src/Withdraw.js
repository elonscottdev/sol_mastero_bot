require("dotenv").config();

const web3 = require("@solana/web3.js");
const { ethers } = require("ethers");
const storage = require("node-persist");
const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");
const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
const { Transaction } = require("@mysten/sui/transactions");
const base58 = require("bs58");
const Web3 = require("web3");
const { isWalletAddress } = require("./utils");
const connection = new web3.Connection(process.env.RPC_URL);

storage.init();

const suiClient = new SuiClient({
  url: getFullnodeUrl("mainnet"),
});

const Withdraw = async (chatId, bot, amountType) => {
  let user_pub_key;
  let user_pri_key;
  let user_secret_key;
  const userWallet = await storage.getItem(`userWallet_${chatId}`);
  if (userWallet.network === "sol") {
    await storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
      user_pub_key = userWallet.sol.publicKey;
      user_pri_key = userWallet.sol.privateKey;
      user_secret_key = web3.Keypair.fromSecretKey(base58.decode(user_pri_key));
    });

    const balance = await connection.getBalance(
      new web3.PublicKey(user_pub_key)
    );
    const walletbalance = balance / web3.LAMPORTS_PER_SOL;

    if (amountType === "x") {
      bot
        .sendMessage(
          chatId,
          `Reply with the amount to withdraw(0 - ${walletbalance})`,
          {
            reply_markup: { force_reply: true },
          }
        )
        .then((msg) => {
          bot.onReplyToMessage(chatId, msg.message_id, async (msg) => {
            const amount = parseFloat(msg.text);
            if (isNaN(amount) || amount < 0 || amount > walletbalance) {
              bot.sendMessage(
                chatId,
                "Invalid withdrawal amount. Please enter a valid amount."
              );
            } else {
              bot
                .sendMessage(chatId, "Reply with the destination address", {
                  reply_markup: { force_reply: true },
                })
                .then(async (msg) => {
                  bot.onReplyToMessage(
                    chatId,
                    msg.message_id,
                    async (msg_address) => {
                      const destinationAddress = msg_address.text.trim();
                      // Validate the destination address
                      try {
                        if (
                          web3.PublicKey.isOnCurve(
                            new web3.PublicKey(destinationAddress)
                          )
                        ) {
                          // Withdraw the specified amount to the destination address
                          const transaction = new web3.Transaction().add(
                            web3.SystemProgram.transfer({
                              fromPubkey: new web3.PublicKey(user_pub_key),
                              toPubkey: new web3.PublicKey(destinationAddress),
                              lamports: web3.LAMPORTS_PER_SOL * amount,
                            })
                          );

                          bot.sendMessage(chatId, "Withdrawing SOL...");

                          try {
                            const signature =
                              await web3.sendAndConfirmTransaction(
                                connection,
                                transaction,
                                [user_secret_key]
                              );
                            const sig_text = `Transaction confirmed, Transaction ID:\n <a href="https://solscan.io/tx/${signature}">${signature}</a>`;
                            bot.sendMessage(chatId, sig_text, {
                              parse_mode: "HTML",
                            });
                          } catch (error) {
                            bot.sendMessage(
                              chatId,
                              `Error withdrawing SOL: ${error.message}`
                            );
                          }
                        }
                      } catch (error) {
                        bot.sendMessage(
                          chatId,
                          `Invalid destination address:\n ${error.message}`
                        );
                      }
                    }
                  );
                });
            }
          });
        });
    } else if (amountType === "all") {
      bot
        .sendMessage(chatId, "Reply with the destination address", {
          reply_markup: { force_reply: true },
        })
        .then((msg) => {
          bot.onReplyToMessage(chatId, msg.message_id, async (msg_address) => {
            const destinationAddress = msg_address.text.trim();
            // Validate the destination address
            try {
              if (
                web3.PublicKey.isOnCurve(new web3.PublicKey(destinationAddress))
              ) {
                const sender = new web3.PublicKey(user_pub_key);
                const receiver = new web3.PublicKey(destinationAddress);
                const rentExemptLamports =
                  await connection.getMinimumBalanceForRentExemption(1);
                const amountToSend = balance - rentExemptLamports;

                const transaction = new web3.Transaction().add(
                  web3.SystemProgram.transfer({
                    fromPubkey: sender,
                    toPubkey: receiver,
                    lamports: amountToSend,
                  })
                );

                bot.sendMessage(chatId, "Withdrawing SOL...");

                try {
                  const signature = await web3.sendAndConfirmTransaction(
                    connection,
                    transaction,
                    [user_secret_key]
                  );
                  const sig_text = `Transaction confirmed, Transaction ID:\n <a href="https://solscan.io/tx/${signature}">${signature}</a>`;
                  bot.sendMessage(chatId, sig_text, { parse_mode: "HTML" });
                } catch (error) {
                  bot.sendMessage(
                    chatId,
                    `Transaction failed, withdrawing SOL: ${error.message}`
                  );
                }
              }
            } catch (error) {
              bot.sendMessage(
                chatId,
                `Invalid destination address:\n ${error.message}`
              );
            }
          });
        });
    }
  }
  if (userWallet.network === "eth") {
    await storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
      user_pub_key = userWallet.eth.publicKey;
      user_pri_key = userWallet.eth.privateKey;
      user_secret_key = web3.Keypair.fromSecretKey(base58.decode(user_pri_key));
    });
    const web3 = new Web3(process.env.ETH_INFURA_URL);
    const balance = await web3.eth.getBalance(user_pub_key);
    const eth_balance = web3.utils.fromWei(balance, "ether");

    if (amountType === "x") {
      bot
        .sendMessage(
          chatId,
          `Reply with the amount to withdraw(0 - ${eth_balance})`,
          {
            reply_markup: { force_reply: true },
          }
        )
        .then((msg) => {
          bot.onReplyToMessage(chatId, msg.message_id, async (msg) => {
            const amount = parseFloat(msg.text);
            if (isNaN(amount) || amount < 0 || amount > eth_balance) {
              bot.sendMessage(
                chatId,
                "Invalid withdrawal amount. Please enter a valid amount."
              );
            } else {
              bot
                .sendMessage(chatId, "Reply with the destination address", {
                  reply_markup: { force_reply: true },
                })
                .then(async (msg) => {
                  bot.onReplyToMessage(
                    chatId,
                    msg.message_id,
                    async (msg_address) => {
                      try {
                        const destinationAddress = msg_address.text.trim();
                        const amountFixed = Number(amount).toFixed(18);
                        const amountInWei = web3.utils.toWei(
                          amountFixed,
                          "ether"
                        );
                        const fromAddress = user_pub_key;
                        const nonce = await web3.eth.getTransactionCount(
                          fromAddress,
                          "latest"
                        );

                        const gasLimit = await web3.eth.estimateGas({
                          from: fromAddress,
                          to: destinationAddress,
                          value: amountInWei,
                        });

                        const gasPrice = await web3.eth.getGasPrice();

                        const tx = {
                          from: fromAddress,
                          to: destinationAddress,
                          value: amountInWei,
                          gasPrice: web3.utils.toHex(gasPrice),
                          gas: web3.utils.toHex(gasLimit),
                          nonce: String(nonce),
                          chainId: 1,
                        };

                        const signedTx =
                          await web3.eth.accounts.signTransaction(
                            tx,
                            user_pri_key
                          );

                        console.log("signedTx:", signedTx);
                        bot.sendMessage(chatId, "Withdrawing ETH...");

                        const receipt = await web3.eth.sendSignedTransaction(
                          signedTx.rawTransaction
                        );

                        // Validate the destination address
                        const sig_text = `Transaction confirmed, Transaction ID:\n <a href="https://etherscan.io/tx/${signedTx.transactionHash}"></a>`;
                        bot.sendMessage(chatId, sig_text, {
                          parse_mode: "HTML",
                        });
                      } catch (error) {
                        console.log("error:", error);
                        bot.sendMessage(
                          chatId,
                          `Invalid destination address:\n ${error.message}`
                        );
                      }
                    }
                  );
                });
            }
          });
        });
    } else if (amountType === "all") {
      bot
        .sendMessage(chatId, "Reply with the destination address", {
          reply_markup: { force_reply: true },
        })
        .then((msg) => {
          bot.onReplyToMessage(chatId, msg.message_id, async (msg_address) => {
            const destinationAddress = msg_address.text.trim();
            // Validate the destination address
            try {
              if (isWalletAddress(user_pub_key)) {
                bot.sendMessage(chatId, "Withdrawing BNB...");

                const amountFixed = Number(eth_balance).toFixed(18);
                const amountInWei = web3.utils.toWei(amountFixed, "ether");
                const fromAddress = user_pub_key;
                const nonce = await web3.eth.getTransactionCount(
                  fromAddress,
                  "latest"
                );

                const gasLimit = await web3.eth.estimateGas({
                  from: fromAddress,
                  to: destinationAddress,
                  value: amountInWei,
                });

                const gasPrice = await web3.eth.getGasPrice();

                const tx = {
                  from: fromAddress,
                  to: destinationAddress,
                  value: amountInWei,
                  gasPrice: web3.utils.toHex(gasPrice),
                  gas: web3.utils.toHex(gasLimit),
                  nonce: String(nonce),
                  chainId: 56,
                };

                const signedTx = await web3.eth.accounts.signTransaction(
                  tx,
                  user_pri_key
                );

                console.log("signedTx:", signedTx);
                bot.sendMessage(chatId, "Withdrawing ETH...");

                try {
                  const receipt = await web3.eth.sendSignedTransaction(
                    signedTx.rawTransaction
                  );

                  // Validate the destination address
                  const sig_text = `Transaction confirmed, Transaction ID:\n <a href="https://etherscan.io/tx/${signedTx.transactionHash}"></a>`;
                  bot.sendMessage(chatId, sig_text, {
                    parse_mode: "HTML",
                  });
                } catch (error) {
                  bot.sendMessage(
                    chatId,
                    `Transaction failed, withdrawing SOL: ${error.message}`
                  );
                }
              }
            } catch (error) {
              bot.sendMessage(
                chatId,
                `Invalid destination address:\n ${error.message}`
              );
            }
          });
        });
    }
  }
  if (userWallet.network === "bsc") {
    await storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
      user_pub_key = userWallet.bsc.publicKey;
      user_pri_key = userWallet.bsc.privateKey;
    });

    const web3 = new Web3(process.env.BSC_INFURA_URL);
    const balance = await web3.eth.getBalance(user_pub_key);
    const bsc_balance = web3.utils.fromWei(balance, "ether");

    if (amountType === "x") {
      bot
        .sendMessage(
          chatId,
          `Reply with the amount to withdraw(0 - ${bsc_balance})`,
          {
            reply_markup: { force_reply: true },
          }
        )
        .then((msg) => {
          bot.onReplyToMessage(chatId, msg.message_id, async (msg) => {
            const amount = parseFloat(msg.text);
            if (isNaN(amount) || amount < 0 || amount > bsc_balance) {
              bot.sendMessage(
                chatId,
                "Invalid withdrawal amount. Please enter a valid amount."
              );
            } else {
              bot
                .sendMessage(chatId, "Reply with the destination address", {
                  reply_markup: { force_reply: true },
                })
                .then(async (msg) => {
                  bot.onReplyToMessage(
                    chatId,
                    msg.message_id,
                    async (msg_address) => {
                      try {
                        const destinationAddress = msg_address.text.trim();
                        const amountFixed = Number(amount).toFixed(18);
                        const amountInWei = web3.utils.toWei(
                          amountFixed,
                          "ether"
                        );
                        const fromAddress = user_pub_key;
                        const nonce = await web3.eth.getTransactionCount(
                          fromAddress,
                          "latest"
                        );

                        const gasLimit = await web3.eth.estimateGas({
                          from: fromAddress,
                          to: destinationAddress,
                          value: amountInWei,
                        });

                        const gasPrice = await web3.eth.getGasPrice();

                        const tx = {
                          from: fromAddress,
                          to: destinationAddress,
                          value: amountInWei,
                          gasPrice: web3.utils.toHex(gasPrice),
                          gas: web3.utils.toHex(gasLimit),
                          nonce: String(nonce),
                          chainId: 56,
                        };

                        const signedTx =
                          await web3.eth.accounts.signTransaction(
                            tx,
                            user_pri_key
                          );

                        console.log("signedTx:", signedTx);
                        bot.sendMessage(chatId, "Withdrawing BNB...");

                        const receipt = await web3.eth.sendSignedTransaction(
                          signedTx.rawTransaction
                        );

                        // Validate the destination address
                        const sig_text = `Transaction confirmed, Transaction ID:\n <a href="https://bscscan.com/tx/${signedTx.transactionHash}"></a>`;
                        bot.sendMessage(chatId, sig_text, {
                          parse_mode: "HTML",
                        });
                      } catch (error) {
                        console.log("error:", error);
                        bot.sendMessage(
                          chatId,
                          `Invalid destination address:\n ${error.message}`
                        );
                      }
                    }
                  );
                });
            }
          });
        });
    } else if (amountType === "all") {
      bot
        .sendMessage(chatId, "Reply with the destination address", {
          reply_markup: { force_reply: true },
        })
        .then((msg) => {
          bot.onReplyToMessage(chatId, msg.message_id, async (msg_address) => {
            const destinationAddress = msg_address.text.trim();
            // Validate the destination address
            try {
              if (isWalletAddress(user_pub_key)) {
                bot.sendMessage(chatId, "Withdrawing BNB...");

                const amountFixed = Number(bsc_balance).toFixed(18);
                const amountInWei = web3.utils.toWei(amountFixed, "ether");
                const fromAddress = user_pub_key;
                const nonce = await web3.eth.getTransactionCount(
                  fromAddress,
                  "latest"
                );

                const gasLimit = await web3.eth.estimateGas({
                  from: fromAddress,
                  to: destinationAddress,
                  value: amountInWei,
                });

                const gasPrice = await web3.eth.getGasPrice();

                const tx = {
                  from: fromAddress,
                  to: destinationAddress,
                  value: amountInWei,
                  gasPrice: web3.utils.toHex(gasPrice),
                  gas: web3.utils.toHex(gasLimit),
                  nonce: String(nonce),
                  chainId: 56,
                };

                const signedTx = await web3.eth.accounts.signTransaction(
                  tx,
                  user_pri_key
                );

                console.log("signedTx:", signedTx);
                bot.sendMessage(chatId, "Withdrawing BNB...");

                try {
                  const receipt = await web3.eth.sendSignedTransaction(
                    signedTx.rawTransaction
                  );

                  // Validate the destination address
                  const sig_text = `Transaction confirmed, Transaction ID:\n <a href="https://bscscan.com/tx/${signedTx.transactionHash}"></a>`;
                  bot.sendMessage(chatId, sig_text, {
                    parse_mode: "HTML",
                  });
                } catch (error) {
                  bot.sendMessage(
                    chatId,
                    `Transaction failed, withdrawing SOL: ${error.message}`
                  );
                }
              }
            } catch (error) {
              bot.sendMessage(
                chatId,
                `Invalid destination address:\n ${error.message}`
              );
            }
          });
        });
    }
  }
  if (userWallet.network === "sui") {
    await storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
      user_pub_key = userWallet.sui.publicKey;
      user_pri_key = userWallet.sui.privateKey;
    });

    const balance = await suiClient.getBalance({
      owner: userWallet.sui.publicKey,
    });
    const sui_balance = Number(balance.totalBalance) / 1000000000;

    if (amountType === "x") {
      bot
        .sendMessage(
          chatId,
          `Reply with the amount to withdraw(0 - ${sui_balance})`,
          {
            reply_markup: { force_reply: true },
          }
        )
        .then((msg) => {
          bot.onReplyToMessage(chatId, msg.message_id, async (msg) => {
            const amount = parseFloat(msg.text);
            if (isNaN(amount) || amount < 0 || amount > sui_balance) {
              bot.sendMessage(
                chatId,
                "Invalid withdrawal amount. Please enter a valid amount."
              );
            } else {
              bot
                .sendMessage(chatId, "Reply with the destination address", {
                  reply_markup: { force_reply: true },
                })
                .then(async (msg) => {
                  bot.onReplyToMessage(
                    chatId,
                    msg.message_id,
                    async (msg_address) => {
                      try {
                        const destinationAddress = msg_address.text.trim();
                        const tx = new Transaction();
                        const [coin] = tx.splitCoins(tx.gas, [
                          amount * 1000000000,
                        ]);
                        tx.transferObjects([coin], destinationAddress);
                        bot.sendMessage(chatId, "Withdrawing SUI...");
                        const keypair = Ed25519Keypair.fromSecretKey(
                          userWallet.sui.privateKey
                        );
                        const result =
                          await suiClient.signAndExecuteTransaction({
                            signer: keypair,
                            transaction: tx,
                          });

                        // Validate the destination address
                        const sig_text = `Transaction confirmed, Transaction ID:\n <a href="https://suivision.xyz/tx/${result}"></a>`;
                        bot.sendMessage(chatId, sig_text, {
                          parse_mode: "HTML",
                        });
                      } catch (error) {
                        console.log("error:", error);
                        bot.sendMessage(
                          chatId,
                          `Invalid destination address:\n ${error.message}`
                        );
                      }
                    }
                  );
                });
            }
          });
        });
    } else if (amountType === "all") {
      bot
        .sendMessage(chatId, "Reply with the destination address", {
          reply_markup: { force_reply: true },
        })
        .then((msg) => {
          bot.onReplyToMessage(chatId, msg.message_id, async (msg_address) => {
            const destinationAddress = msg_address.text.trim();
            // Validate the destination address
            try {
              if (isWalletAddress(user_pub_key)) {
                bot.sendMessage(chatId, "Withdrawing SUI...");
                const tx = new Transaction();
                const [coin] = tx.splitCoins(tx.gas, [balance]);
                tx.transferObjects([coin], destinationAddress);
                bot.sendMessage(chatId, "Withdrawing SUI...");

                try {
                  const keypair = Ed25519Keypair.fromSecretKey(
                    userWallet.sui.privateKey
                  );
                  const result = await suiClient.signAndExecuteTransaction({
                    signer: keypair,
                    transaction: tx,
                  });
                  // Validate the destination address
                  const sig_text = `Transaction confirmed, Transaction ID:\n <a href="https://suivision.xyz/tx/${result}"></a>`;
                  bot.sendMessage(chatId, sig_text, {
                    parse_mode: "HTML",
                  });
                } catch (error) {
                  bot.sendMessage(
                    chatId,
                    `Transaction failed, withdrawing SOL: ${error.message}`
                  );
                }
              }
            } catch (error) {
              bot.sendMessage(
                chatId,
                `Invalid destination address:\n ${error.message}`
              );
            }
          });
        });
    }
  }
};

module.exports = {
  Withdraw,
};
