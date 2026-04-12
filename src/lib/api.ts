import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { openDB } from 'idb';

const ALCHEMY_KEY = 'zNLsSVIeZsaj27JZleLatqeQjAyd1Wxn';

export const RPC_ENDPOINTS: Record<string, string> = {
  ETH: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  SEPOLIA: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  POLYGON: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  ARBITRUM: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  BASE: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  HYPER: `https://hyperliquid-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  SOL: `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  BTC: `https://bitcoin-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
};

const HISTORY_URLS: Record<string, string> = {
  ETH: 'https://eth.blockscout.com/api/v2',
  SEPOLIA: 'https://eth-sepolia.blockscout.com/api/v2',
  POLYGON: 'https://polygon.blockscout.com/api/v2',
  ARBITRUM: 'https://arbitrum.blockscout.com/api/v2',
  BASE: 'https://base.blockscout.com/api/v2',
};

const DB_NAME = 'AbruptWalletDB';
const STORE_NAME = 'cache';

export const getDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

export const getCache = async (key: string) => {
  const db = await getDB();
  return db.get(STORE_NAME, key);
};

export const setCache = async (key: string, val: any) => {
  const db = await getDB();
  return db.put(STORE_NAME, val, key);
};

export const getNativePrices = async (): Promise<Record<string, number>> => {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana,bitcoin,matic-network&vs_currencies=usd'
    );
    const data = await res.json();
    const eth = data.ethereum?.usd || 0;
    return {
      ETH:      eth,
      BASE:     eth,
      ARBITRUM: eth,
      SEPOLIA:  0,
      HYPER:    0,
      SOL:      data.solana?.usd || 0,
      BTC:      data.bitcoin?.usd || 0,
      POLYGON:  data['matic-network']?.usd || 0,
    };
  } catch {
    return {};
  }
};

export const getNetworkStats = async (network: string) => {
  try {
    const rpc = RPC_ENDPOINTS[network];
    if (network === 'SOL') {
      const conn = new Connection(rpc);
      const slot = await conn.getSlot();
      return { block: slot.toLocaleString(), gas: '0.00' };
    }
    const provider = new ethers.JsonRpcProvider(rpc);
    const [block, feeData] = await Promise.all([
      provider.getBlockNumber(),
      provider.getFeeData()
    ]);
    const gwei = feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0';
    return { block: block.toLocaleString(), gas: parseFloat(gwei).toFixed(1) };
  } catch (e) {
    return { block: 'N/A', gas: '0' };
  }
};

export const getEvmBalance = async (address: string, network: string) => {
  const rpc = RPC_ENDPOINTS[network];
  if (!rpc) return '0';
  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    const balance = await provider.getBalance(address);
    const formatted = ethers.formatEther(balance);
    await setCache(`${network}_bal_${address}`, formatted);
    return formatted;
  } catch (e) {
    const cached = await getCache(`${network}_bal_${address}`);
    return cached || '0';
  }
};

export const getSolBalance = async (address: string) => {
  try {
    const connection = new Connection(RPC_ENDPOINTS.SOL);
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    const sol = (balance / 1e9).toString();
    await setCache(`SOL_bal_${address}`, sol);
    return sol;
  } catch (e) {
    const cached = await getCache(`SOL_bal_${address}`);
    return cached || '0';
  }
};

export const getBtcBalance = async (address: string) => {
  try {
    const res = await fetch(`https://blockchain.info/q/addressbalance/${address}`);
    const satoshis = await res.text();
    const btc = (parseInt(satoshis) / 1e8).toString();
    await setCache(`BTC_bal_${address}`, btc);
    return btc;
  } catch (e) {
    const cached = await getCache(`BTC_bal_${address}`);
    return cached || '0';
  }
};

export const getEvmHistory = async (address: string, network: string) => {
  const baseUrl = HISTORY_URLS[network] || HISTORY_URLS.ETH;
  try {
    const res = await fetch(`${baseUrl}/addresses/${address}/transactions`);
    const data = await res.json();
    return (data.items || []).map((tx: any) => ({
      hash: tx.hash,
      from: tx.from?.hash,
      to: tx.to?.hash,
      value: tx.value ? ethers.formatEther(tx.value) : '0',
      fee: tx.fee ? ethers.formatEther(tx.fee.value) : '0',
      timestamp: tx.timestamp,
      status: tx.result,
      symbol: network === 'SEPOLIA' ? 'sETH' : (network === 'BASE' ? 'BASE' : 'ETH'),
      isContract: tx.to?.is_contract || false
    }));
  } catch (e) {
    return [];
  }
};

export const getSolHistory = async (address: string) => {
  try {
    const connection = new Connection(RPC_ENDPOINTS.SOL);
    const publicKey = new PublicKey(address);
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 15 });
    const transactions = await Promise.all(
      signatures.map(async (sig) => {
        const tx = await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
        if (!tx) return null;
        
        const pre = tx.meta?.preBalances[0] || 0;
        const post = tx.meta?.postBalances[0] || 0;
        const value = Math.abs(post - pre) / 1e9;
        const fee = (tx.meta?.fee || 0) / 1e9;

        return {
          hash: sig.signature,
          from: tx.transaction.message.staticAccountKeys[0].toBase58(),
          to: tx.transaction.message.staticAccountKeys[1]?.toBase58(),
          value: value.toString(),
          fee: fee.toString(),
          timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : '',
          status: sig.err ? 'Error' : 'Success',
          symbol: 'SOL',
          isContract: tx.transaction.message.staticAccountKeys[1]?.toBase58().length < 40 
        };
      })
    );
    return transactions.filter(t => t !== null);
  } catch (e) {
    return [];
  }
};
