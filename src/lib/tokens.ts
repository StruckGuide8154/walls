import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ethers } from 'ethers';

const SOL_RPC = 'https://solana.publicnode.com';

export const getSolTokens = async (address: string) => {
  const connection = new Connection(SOL_RPC);
  const publicKey = new PublicKey(address);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: TOKEN_PROGRAM_ID,
  });

  return tokenAccounts.value.map((account: any) => {
    const info = account.account.data.parsed.info;
    return {
      mint: info.mint,
      amount: info.tokenAmount.uiAmount,
      symbol: 'TOKEN', // Real app would fetch metadata
      decimals: info.tokenAmount.decimals,
    };
  }).filter(t => t.amount > 0);
};

export const getEthTokens = async (address: string) => {
  // Fetching all tokens on ETH usually requires an indexer (Moralis/Alchemy).
  // Without an API key, we might be limited. 
  // For this demo, we'll return an empty list or a mocked one if we can't find a free endpoint.
  try {
     const res = await fetch(`https://eth.blockscout.com/api/v2/addresses/${address}/token-balances`);
     const data = await res.json();
     return data.map((t: any) => ({
       address: t.token.address,
       symbol: t.token.symbol,
       amount: ethers.formatUnits(t.value, t.token.decimals),
       name: t.token.name
     }));
  } catch (e) {
    return [];
  }
};
