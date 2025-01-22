const Web3 = require("web3");
const { Erc20Abi } = require("../abi/tokenContractAbi");
const { PancakeRouterAbi } = require("../abi/pancakeRouterAbi");

const isWalletAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const getPairAddress = async (tokenAddress, chainId) => {
  const response = await fetch(
    `https://api.dexscreener.com/token-pairs/v1/${chainId}/${tokenAddress}`,
    {
      method: "GET",
      headers: {},
    }
  );
  const data = await response.json();
  console.log("data:", data.length);
  console.log("quoteToken:", process.env.BNB_NATIVE_TOKEN_ADDRESS);

  if (chainId === "bsc") {
    for (let i = 0; i < data.length; i++) {
      if (data[i].quoteToken.address === process.env.BNB_NATIVE_TOKEN_ADDRESS) {
        console.log("matched");
        return {
          name: data[i].baseToken.name,
          symbol: data[i].baseToken.symbol,
          pairAddress: data[i].pairAddress,
          priceNative: data[i].priceNative,
          priceUsd: data[i].priceUsd,
          market_cap: data[i].marketCap,
        };
      }
    }
  }
};

const getEthPairAddress = async (tokenAddress, chainId) => {
  const response = await fetch(
    `https://api.dexscreener.com/token-pairs/v1/ethereum/${tokenAddress}`,
    {
      method: "GET",
      headers: {},
    }
  );
  const data = await response.json();
  console.log("data:", data.length);
  console.log("quoteToken:", process.env.ETH_NATIVE_TOKEN_ADDRESS);

  if (chainId === "eth") {
    for (let i = 0; i < data.length; i++) {
      if (data[i].quoteToken.address === process.env.ETH_NATIVE_TOKEN_ADDRESS) {
        console.log("matched");
        return {
          name: data[i].baseToken.name,
          symbol: data[i].baseToken.symbol,
          pairAddress: data[i].pairAddress,
          priceNative: data[i].priceNative,
          priceUsd: data[i].priceUsd,
          market_cap: data[i].marketCap,
        };
      }
    }
  }
};

const getSuiPairAddress = async (tokenAddress, chainId) => {
  const response = await fetch(
    `https://api.dexscreener.com/token-pairs/v1/${chainId}/${tokenAddress}`,
    {
      method: "GET",
      headers: {},
    }
  );
  const data = await response.json();
  console.log("data:", data.length);
  console.log("quoteToken:", process.env.SUI_NATIVE_TOKEN_ADDRESS);

  if (chainId === "sui") {
    for (let i = 0; i < data.length; i++) {
      if (data[i].quoteToken.address === process.env.SUI_NATIVE_TOKEN_ADDRESS) {
        console.log("matched");
        return {
          name: data[i].baseToken.name,
          symbol: data[i].baseToken.symbol,
          pairAddress: data[i].pairAddress,
          priceNative: data[i].priceNative,
          priceUsd: data[i].priceUsd,
          market_cap: data[i].marketCap,
        };
      }
    }
  }
};

const getEthTokenBalance = async (tokenAddress, walletAddress) => {
  const web3 = new Web3(process.env.ETH_INFURA_URL);
  const tokenContract = new web3.eth.Contract(Erc20Abi, tokenAddress);
  try {
    const balance = await tokenContract.methods.balanceOf(walletAddress).call();
    console.log(
      `Token Balance: ${web3.utils.fromWei(balance, "ether")} Tokens`
    );
    return web3.utils.fromWei(balance, "ether");
  } catch (error) {
    console.error("Error fetching balance:", error);
    return 0;
  }
};

async function tokentoeth(
  tokenAddress,
  nativeTokenAddress,
  walletAddress,
  privateKey,
  amountOut
) {
  const rpcUrl = process.env.ETH_INFURA_URL;
  const web3 = new Web3(rpcUrl);

  try {
    const amountOutWei = web3.utils.toWei(amountOut.toString(), "ether");
    const uniswapRouter = new web3.eth.Contract(
      PancakeRouterAbi,
      "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    );
    const amountOutReserves = await uniswapRouter.methods
      .getAmountsOut(amountOutWei, [nativeTokenAddress, tokenAddress])
      .call();

    console.log(amountOutReserves, nativeTokenAddress, tokenAddress);
    const amountOutFinal = amountOutReserves[1];

    const tokenContract = new web3.eth.Contract(Erc20Abi, tokenAddress);
    const tokenBalance = await tokenContract.methods
      .balanceOf(walletAddress)
      .call();

    console.log("tokenBalance:", tokenBalance);
    const tokenAllowance = await tokenContract.methods
      .allowance(walletAddress, "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D")
      .call();

    if (tokenBalance == 0) {
      console.log(`${walletAddress} has insufficient ${amountOut} Tokens.`);
      return false;
    }

    const finalAmountOut =
      tokenBalance < amountOutFinal ? tokenBalance : amountOutFinal;
    console.log(`amount_out: ${finalAmountOut}`);

    if (tokenAllowance < finalAmountOut) {
      console.log(
        `token_allowance: ${tokenAllowance}, ${walletAddress}, ${privateKey}`
      );

      const approvalTx = {
        from: walletAddress,
        to: tokenAddress,
        data: tokenContract.methods
          .approve(
            "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
            web3.utils
              .toBN(
                "115792089237316195423570985008687907853269984665640564039457584007913129639935"
              )
              .toString()
          )
          .encodeABI(),
        gas: 200000,
      };

      const signedApprovalTx = await web3.eth.accounts.signTransaction(
        approvalTx,
        privateKey
      );

      await web3.eth.sendSignedTransaction(signedApprovalTx.rawTransaction);
    }

    const path = [tokenAddress, nativeTokenAddress];
    const amountOutMin = 0;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    console.log(amountOutMin, path, walletAddress, deadline);

    const gasLimit = await uniswapRouter.methods
      .swapExactTokensForETHSupportingFeeOnTransferTokens(
        finalAmountOut,
        amountOutMin,
        path,
        walletAddress,
        deadline
      )
      .estimateGas({ from: walletAddress });

    const sellTx = {
      from: walletAddress,
      to: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      data: uniswapRouter.methods
        .swapExactTokensForETH(
          amountOutWei,
          amountOutMin,
          path,
          walletAddress,
          deadline
        )
        .encodeABI(),
      gas: web3.utils.toHex(gasLimit),
    };

    const signedSellTx = await web3.eth.accounts.signTransaction(
      sellTx,
      privateKey
    );
    const receipt = await web3.eth.sendSignedTransaction(
      signedSellTx.rawTransaction
    );
    console.log("Sell transaction receipt:", receipt);
    return receipt;
  } catch (error) {
    console.log("error:", error);
    return null;
  }
}
async function tokentobnb(
  tokenAddress,
  nativeTokenAddress,
  walletAddress,
  privateKey,
  amountOut
) {
  const rpcUrl = process.env.ETH_INFURA_URL;
  const web3 = new Web3(rpcUrl);

  try {
    const amountOutWei = web3.utils.toWei(amountOut.toString(), "ether");
    const uniswapRouter = new web3.eth.Contract(
      PancakeRouterAbi,
      "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    );
    const amountOutReserves = await uniswapRouter.methods
      .getAmountsOut(amountOutWei, [nativeTokenAddress, tokenAddress])
      .call();

    console.log(amountOutReserves, nativeTokenAddress, tokenAddress);
    const amountOutFinal = amountOutReserves[1];

    const tokenContract = new web3.eth.Contract(Erc20Abi, tokenAddress);
    const tokenBalance = await tokenContract.methods
      .balanceOf(walletAddress)
      .call();

    console.log("tokenBalance:", tokenBalance);
    const tokenAllowance = await tokenContract.methods
      .allowance(walletAddress, "0x10ED43C718714eb63d5aA57B78B54704E256024E")
      .call();

    if (tokenBalance == 0) {
      console.log(`${walletAddress} has insufficient ${amountOut} Tokens.`);
      return false;
    }

    const finalAmountOut =
      tokenBalance < amountOutFinal ? tokenBalance : amountOutFinal;
    console.log(`amount_out: ${finalAmountOut}`);

    if (tokenAllowance < finalAmountOut) {
      console.log(
        `token_allowance: ${tokenAllowance}, ${walletAddress}, ${privateKey}`
      );

      const approvalTx = {
        from: walletAddress,
        to: tokenAddress,
        data: tokenContract.methods
          .approve(
            "0x10ED43C718714eb63d5aA57B78B54704E256024E",
            web3.utils
              .toBN(
                "115792089237316195423570985008687907853269984665640564039457584007913129639935"
              )
              .toString()
          )
          .encodeABI(),
        gas: 200000,
      };

      const signedApprovalTx = await web3.eth.accounts.signTransaction(
        approvalTx,
        privateKey
      );

      await web3.eth.sendSignedTransaction(signedApprovalTx.rawTransaction);
    }

    const path = [tokenAddress, nativeTokenAddress];
    const amountOutMin = 0;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    console.log(amountOutMin, path, walletAddress, deadline);

    const gasLimit = await uniswapRouter.methods
      .swapExactTokensForETHSupportingFeeOnTransferTokens(
        finalAmountOut,
        amountOutMin,
        path,
        walletAddress,
        deadline
      )
      .estimateGas({ from: walletAddress });

    const sellTx = {
      from: walletAddress,
      to: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
      data: uniswapRouter.methods
        .swapExactTokensForETH(
          amountOutWei,
          amountOutMin,
          path,
          walletAddress,
          deadline
        )
        .encodeABI(),
      gas: web3.utils.toHex(gasLimit),
    };

    const signedSellTx = await web3.eth.accounts.signTransaction(
      sellTx,
      privateKey
    );
    const receipt = await web3.eth.sendSignedTransaction(
      signedSellTx.rawTransaction
    );
    console.log("Sell transaction receipt:", receipt);
    return receipt;
  } catch (error) {
    console.log("error:", error);
    return null;
  }
}

module.exports = {
  isWalletAddress,
  getPairAddress,
  getEthPairAddress,
  getSuiPairAddress,
  getEthTokenBalance,
  tokentoeth,
  tokentobnb,
};
