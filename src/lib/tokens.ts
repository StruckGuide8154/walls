import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ethers } from 'ethers';

const SOL_RPC = 'https://solana.publicnode.com';

export interface TokenBalance {
  address?: string;
  mint?: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  priceUsd?: number;
}

// Well-known Solana token metadata
const SOL_TOKEN_MAP: Record<string, { symbol: string; name: string }> = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC',    name: 'USD Coin' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT',    name: 'Tether USD' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK',   name: 'Bonk' },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So':  { symbol: 'mSOL',   name: 'Marinade SOL' },
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': { symbol: 'jitoSOL',name: 'Jito Staked SOL' },
  'So11111111111111111111111111111111111111112':    { symbol: 'wSOL',   name: 'Wrapped SOL' },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': { symbol: 'WETH',   name: 'Wrapped Ether' },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY',    name: 'Raydium' },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH',   name: 'Pyth Network' },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN':  { symbol: 'JUP',    name: 'Jupiter' },
  'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk':   { symbol: 'WEN',    name: 'Wen' },
  'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5':   { symbol: 'MEW',    name: 'cat in a dogs world' },
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE':   { symbol: 'ORCA',   name: 'Orca' },
  'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey':   { symbol: 'MNDE',   name: 'Marinade' },
  'SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y':   { symbol: 'SHDW',   name: 'Shadow Token' },
  'nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7':   { symbol: 'NOS',    name: 'Nosana' },
};

export const getSolTokens = async (address: string): Promise<TokenBalance[]> => {
  const connection = new Connection(SOL_RPC);
  const publicKey = new PublicKey(address);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: TOKEN_PROGRAM_ID,
  });

  return tokenAccounts.value
    .map((account: any) => {
      const info = account.account.data.parsed.info;
      const meta = SOL_TOKEN_MAP[info.mint] || {
        symbol: info.mint.slice(0, 4).toUpperCase(),
        name: `${info.mint.slice(0, 6)}…${info.mint.slice(-4)}`,
      };
      return {
        mint: info.mint,
        symbol: meta.symbol,
        name: meta.name,
        amount: info.tokenAmount.uiAmount as number,
        decimals: info.tokenAmount.decimals,
      } as TokenBalance;
    })
    .filter(t => t.amount > 0);
};

export const getSolTokenPrices = async (mints: string[]): Promise<Record<string, number>> => {
  if (!mints.length) return {};
  try {
    const ids = mints.join(',');
    const res = await fetch(`https://price.jup.ag/v6/price?ids=${ids}`);
    const data = await res.json();
    const prices: Record<string, number> = {};
    for (const [mint, info] of Object.entries(data.data || {})) {
      prices[mint] = (info as any).price ?? 0;
    }
    return prices;
  } catch {
    return {};
  }
};

const BLOCKSCOUT_URLS: Record<string, string> = {
  ETH:      'https://eth.blockscout.com/api/v2',
  POLYGON:  'https://polygon.blockscout.com/api/v2',
  ARBITRUM: 'https://arbitrum.blockscout.com/api/v2',
  BASE:     'https://base.blockscout.com/api/v2',
  SEPOLIA:  'https://eth-sepolia.blockscout.com/api/v2',
};

export const getEvmTokenBalances = async (address: string, network: string): Promise<TokenBalance[]> => {
  const baseUrl = BLOCKSCOUT_URLS[network];
  if (!baseUrl) return [];
  try {
    const res = await fetch(`${baseUrl}/addresses/${address}/token-balances`);
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((t: any) => t.token && parseFloat(t.value || '0') > 0)
      .map((t: any) => ({
        address: t.token.address,
        symbol: t.token.symbol || '???',
        name: t.token.name || '???',
        amount: parseFloat(
          ethers.formatUnits(t.value || '0', parseInt(t.token.decimals) || 18)
        ),
        decimals: parseInt(t.token.decimals) || 18,
        priceUsd: t.token.exchange_rate ? parseFloat(t.token.exchange_rate) : undefined,
      } as TokenBalance));
  } catch {
    return [];
  }
};
