import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import { Keypair } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import { ECPairFactory } from 'ecpair';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

export interface WalletData {
  ethAddress: string;
  ethPrivateKey: string;
  solAddress: string;
  solPrivateKey: string;
  btcAddress: string;
  btcPrivateKey: string;
  mnemonic?: string;
  isImported?: boolean;
  groupId: string;
  name?: string;
}

export const generateMnemonic = (words: 12 | 24 = 12) => {
  const entropy = words === 12 ? 128 : 256;
  return bip39.generateMnemonic(entropy);
};

export const walletFromMnemonic = (mnemonic: string, index: number = 0): WalletData => {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic);

  // EVM (ETH, Polygon, Arb, Base, Hyper, Sepolia) - m/44'/60'/0'/0/i
  const ethPath = `m/44'/60'/0'/0/${index}`;
  const ethWallet = ethers.HDNodeWallet.fromPhrase(mnemonic, '', ethPath);

  // Solana (m/44'/501'/i'/0')
  const solPath = `m/44'/501'/${index}'/0'`;
  const solDerivedSeed = derivePath(solPath, seed.toString('hex')).key;
  const solWallet = Keypair.fromSeed(solDerivedSeed);

  // Bitcoin Native SegWit (m/84'/0'/0'/0/i)
  const btcPath = `m/84'/0'/0'/0/${index}`;
  const root = bip32.fromSeed(seed);
  const btcChild = root.derivePath(btcPath);
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: btcChild.publicKey,
    network: bitcoin.networks.bitcoin,
  });

  return {
    ethAddress: ethWallet.address,
    ethPrivateKey: ethWallet.privateKey,
    solAddress: solWallet.publicKey.toBase58(),
    solPrivateKey: Buffer.from(solWallet.secretKey).toString('hex'),
    btcAddress: btcAddress || '',
    btcPrivateKey: btcChild.toWIF(),
    mnemonic,
    groupId: '',
  };
};

export const walletFromPrivateKey = (key: string, type: string): WalletData => {
  try {
    const evmChains = ['ETH', 'BASE', 'ARBITRUM', 'POLYGON', 'SEPOLIA', 'HYPER'];
    
    if (evmChains.includes(type)) {
      const ethWallet = new ethers.Wallet(key);
      return { 
        ethAddress: ethWallet.address, 
        ethPrivateKey: ethWallet.privateKey, 
        solAddress: '', solPrivateKey: '', 
        btcAddress: '', btcPrivateKey: '', 
        groupId: '' 
      };
    } else if (type === 'SOL') {
      const solWallet = Keypair.fromSecretKey(bs58.decode(key));
      return { 
        ethAddress: '', ethPrivateKey: '', 
        solAddress: solWallet.publicKey.toBase58(), 
        solPrivateKey: Buffer.from(solWallet.secretKey).toString('hex'), 
        btcAddress: '', btcPrivateKey: '', 
        groupId: '' 
      };
    } else if (type === 'BTC') {
      const keyPair = ECPair.fromWIF(key);
      const { address } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey });
      return { 
        ethAddress: '', ethPrivateKey: '', 
        solAddress: '', solPrivateKey: '', 
        btcAddress: address || '', 
        btcPrivateKey: key, 
        groupId: '' 
      };
    } else {
      throw new Error('Unsupported network for direct key import');
    }
  } catch (e) {
    console.error(`Core Key Load Error (${type}):`, e);
    // Return empty but consistent object to prevent crashing
    return { 
      ethAddress: '', ethPrivateKey: '', 
      solAddress: '', solPrivateKey: '', 
      btcAddress: '', btcPrivateKey: '', 
      groupId: '' 
    };
  }
};
