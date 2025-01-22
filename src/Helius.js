require('dotenv').config;

const url = process.env.RPC_URL;

const Moralis = require("moralis").default;
const { SolNetwork } = require("@moralisweb3/common-sol-utils");

const get_Price = async (address) => {
    const network = SolNetwork.MAINNET;

    const response = await Moralis.SolApi.token.getTokenPrice({
        address,
        network,
    });

    return response.toJSON();
};

/**
 * Fetches asset information for the given Solana address.
 *
 * @param {string} address - The Solana address to fetch asset information for.
 * @returns {Promise<any>} - The asset information for the given address.
 */
const get_info = async (address) => {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: "1",
            method: "getAsset",
            params: {
                id: address,
            },
        }),
    });
    const { result } = await response.json();
    return result;
};
/**
 * Fetches the token accounts for the given Solana address.
 *
 * @param {string} address - The Solana address to fetch token accounts for.
 * @returns {Promise<any>} - The token accounts for the given address.
 */
const getTokenAccounts = async (address) => {
    const fetch = (await import("node-fetch")).default;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "getTokenAccounts",
            id: "1",
            params: {
                page: 1,
                limit: 100,
                displayOptions: {
                    showZeroBalance: false,
                },
                owner: address,
            },
        }),
    });

    const data = await response.json();

    return data.result;
};

module.exports = {
    getTokenAccounts,
    get_info,
    get_Price
}