'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { WalletData, walletFromMnemonic, walletFromPrivateKey } from '@/lib/wallet';
import { encrypt, decrypt } from '@/lib/encryption';

export interface VaultItem {
  id: string;
  type: 'MNEMONIC' | 'KEY';
  phrase?: string;
  key?: string;
  network?: 'ETH' | 'SOL';
  index: number;
  name?: string;
  accountNames?: Record<number, string>;
}

interface WalletContextType {
  vaultItems: VaultItem[];
  accounts: WalletData[];
  activeAccountIndex: number;
  activeAccount: WalletData | null;
  isLocked: boolean;
  hasVault: boolean;
  initializeVault: (mnemonic: string, password: string) => Promise<void>;
  initializeFromKey: (key: string, network: 'ETH' | 'SOL', password: string) => Promise<void>;
  addMnemonicVault: (mnemonic: string, password: string) => Promise<void>;
  importKeyVault: (key: string, network: 'ETH' | 'SOL', password: string) => Promise<void>;
  deriveMoreFromMnemonic: (groupId: string, password: string) => Promise<void>;
  updateAccountName: (groupId: string, index: number, name: string, password: string) => Promise<void>;
  unlockVault: (password: string) => Promise<boolean>;
  setActiveAccountIndex: (index: number) => void;
  isLoading: boolean;
  logout: () => void;
  // Note: we can't easily store mnemonic in plain state for all items, 
  // but we can expose the derived accounts.
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);
  const [accounts, setAccounts] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [hasVault, setHasVault] = useState(false);

  useEffect(() => {
    const savedVault = localStorage.getItem('vault');
    if (savedVault) setHasVault(true);
    setIsLoading(false);
  }, []);

  const saveVault = async (items: VaultItem[], password: string) => {
    const encrypted = await encrypt(JSON.stringify(items), password);
    localStorage.setItem('vault', encrypted);
  };

  const deriveAll = (items: VaultItem[]) => {
    const allAccounts: WalletData[] = [];
    items.forEach(item => {
      if (item.type === 'MNEMONIC' && item.phrase) {
        for (let i = 0; i <= item.index; i++) {
          const acc = walletFromMnemonic(item.phrase, i);
          allAccounts.push({ 
            ...acc, 
            groupId: item.id, 
            name: item.accountNames?.[i] || `Account ${i + 1}` 
          });
        }
      } else if (item.type === 'KEY' && item.key && item.network) {
        const acc = walletFromPrivateKey(item.key, item.network);
        allAccounts.push({ 
          ...acc, 
          isImported: true, 
          groupId: item.id, 
          name: item.name || `${item.network} Root`
        });
      }
    });
    setAccounts(allAccounts);
  };

  const initializeVault = async (mnemonic: string, password: string) => {
    const firstItem: VaultItem = { id: Math.random().toString(36).substr(2, 9), type: 'MNEMONIC', phrase: mnemonic, index: 0 };
    const items = [firstItem];
    await saveVault(items, password);
    setVaultItems(items);
    deriveAll(items);
    setIsLocked(false);
    setHasVault(true);
  };

  const initializeFromKey = async (key: string, network: 'ETH' | 'SOL', password: string) => {
    const firstItem: VaultItem = { id: Math.random().toString(36).substr(2, 9), type: 'KEY', key, network, index: 0 };
    const items = [firstItem];
    await saveVault(items, password);
    setVaultItems(items);
    deriveAll(items);
    setIsLocked(false);
    setHasVault(true);
  };

  const addMnemonicVault = async (mnemonic: string, password: string) => {
    const encrypted = localStorage.getItem('vault');
    if (!encrypted) return;
    const decData = await decrypt(encrypted, password);
    const items = JSON.parse(decData);
    const newItem: VaultItem = { id: Math.random().toString(36).substr(2, 9), type: 'MNEMONIC', phrase: mnemonic, index: 0 };
    items.push(newItem);
    await saveVault(items, password);
    setVaultItems(items);
    deriveAll(items);
  };

  const importKeyVault = async (key: string, network: 'ETH' | 'SOL', password: string) => {
    const encrypted = localStorage.getItem('vault');
    if (!encrypted) return;
    const decData = await decrypt(encrypted, password);
    const items = JSON.parse(decData);
    const newItem: VaultItem = { id: Math.random().toString(36).substr(2, 9), type: 'KEY', key, network, index: 0 };
    items.push(newItem);
    await saveVault(items, password);
    setVaultItems(items);
    deriveAll(items);
  };

  const deriveMoreFromMnemonic = async (groupId: string, password: string) => {
    const encrypted = localStorage.getItem('vault');
    if (!encrypted) return;
    const decData = await decrypt(encrypted, password);
    const items: VaultItem[] = JSON.parse(decData);
    const item = items.find(i => i.id === groupId);
    if (item && item.type === 'MNEMONIC') {
      item.index += 1;
      await saveVault(items, password);
      setVaultItems(items);
      deriveAll(items);
    }
  };

  const updateAccountName = async (groupId: string, index: number, name: string, password: string) => {
    const encrypted = localStorage.getItem('vault');
    if (!encrypted) return;
    const decData = await decrypt(encrypted, password);
    const items: VaultItem[] = JSON.parse(decData);
    const item = items.find(i => i.id === groupId);
    if (item) {
      if (item.type === 'MNEMONIC') {
        if (!item.accountNames) item.accountNames = {};
        item.accountNames[index] = name;
      } else {
        item.name = name;
      }
      await saveVault(items, password);
      setVaultItems(items);
      deriveAll(items);
    }
  };

  const unlockVault = async (password: string): Promise<boolean> => {
    const encrypted = localStorage.getItem('vault');
    if (!encrypted) return false;
    try {
      const decData = await decrypt(encrypted, password);
      let items: VaultItem[] = [];
      try {
        items = JSON.parse(decData);
        // Handle legacy top-level array or mnemonic string if needed
        if (!Array.isArray(items)) {
           // Basic heuristic for legacy single-item vault
           const data = items as any;
           if (data.phrase || decData.includes(' ')) {
              items = [{ id: 'default', type: 'MNEMONIC', phrase: data.phrase || decData, index: data.index || 0 }];
           }
        }
      } catch {
        items = [{ id: 'default', type: 'MNEMONIC', phrase: decData, index: 0 }];
      }
      setVaultItems(items);
      deriveAll(items);
      setIsLocked(false);
      return true;
    } catch (e) {
      return false;
    }
  };

  const logout = () => {
    setAccounts([]);
    setVaultItems([]);
    setIsLocked(true);
    setHasVault(!!localStorage.getItem('vault'));
  };

  const activeAccount = accounts[activeAccountIndex] || accounts[0] || null;

  return (
    <WalletContext.Provider value={{ 
      vaultItems,
      accounts, 
      activeAccountIndex, 
      activeAccount, 
      isLocked,
      hasVault,
      initializeVault,
      initializeFromKey,
      addMnemonicVault,
      importKeyVault,
      deriveMoreFromMnemonic,
      updateAccountName,
      unlockVault,
      setActiveAccountIndex, 
      isLoading,
      logout
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
