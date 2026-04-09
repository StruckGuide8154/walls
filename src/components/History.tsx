'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { getEvmHistory, getSolHistory, getCache, setCache } from '@/lib/api';
import { LucideExternalLink, LucideArrowUpRight, LucideArrowDownLeft, LucideLoader2, LucideChevronLeft, LucideChevronRight, LucideBox } from 'lucide-react';

const EXPLORERS: Record<string, string> = {
  ETH: 'https://etherscan.io',
  SOL: 'https://solscan.io',
  BTC: 'https://www.blockchain.com/explorer/transactions/btc',
  BASE: 'https://basescan.org',
  ARBITRUM: 'https://arbiscan.io',
  POLYGON: 'https://polygonscan.com',
  HYPER: 'https://explorer.hyperliquid.xyz',
  SEPOLIA: 'https://sepolia.etherscan.io'
};

const ITEMS_PER_PAGE = 6;

export default function History({ network }: { network: string }) {
  const { activeAccount } = useWallet();
  const [history, setHistory] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    if (!activeAccount) return;
    setIsLoading(true);
    try {
      const addr = network === 'SOL' ? activeAccount.solAddress : (network === 'BTC' ? activeAccount.btcAddress : activeAccount.ethAddress);
      if (!addr) { setHistory([]); setIsLoading(false); return; }
      const cacheKey = `history_detailed_v2_${network}_${addr}`;
      const cached = await getCache(cacheKey);
      if (cached) setHistory(cached);
      let h = network === 'SOL' ? await getSolHistory(addr) : await getEvmHistory(addr, network);
      setHistory(h);
      await setCache(cacheKey, h);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchHistory(); setCurrentPage(1); }, [activeAccount, network]);

  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
  const displayed = history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoading && history.length === 0) return (
    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '9px', letterSpacing: '1px' }}>SYNCING...</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {history.length === 0 ? (
          <p style={{ fontSize: '10px', color: '#333', padding: '10px' }}>No Activity.</p>
        ) : (
          displayed.map((tx, i) => {
            const isOut = (tx.from || '').toLowerCase() === (activeAccount?.ethAddress || '').toLowerCase() || 
                          (tx.from || '').toLowerCase() === (activeAccount?.solAddress || '').toLowerCase();
            const time = tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const date = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString([], { month: 'numeric', day: 'numeric' }) : '';
            
            return (
              <div key={tx.hash || i} style={{ 
                padding: '8px 12px', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.02)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                 <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                       {isOut ? <LucideArrowUpRight size={10} color="#f43f5e" /> : <LucideArrowDownLeft size={10} color="#10b981" />}
                    </div>
                    <div style={{ flex: 1 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '800', color: '#fff' }}>
                            {isOut ? 'SENT' : 'RCVD'} {parseFloat(tx.value || '0').toFixed(4)} {tx.symbol}
                          </span>
                          <span style={{ fontSize: '8px', color: '#333', fontWeight: '900' }}>{date} {time}</span>
                       </div>
                       <div style={{ fontSize: '8px', color: '#444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', wordBreak: 'break-all' }}>
                             {tx.isContract && <LucideBox size={8} color="#0052FF" />}
                             <span>{isOut ? `TO: ${tx.to}` : `FROM: ${tx.from}`}</span>
                          </div>
                          <span style={{ opacity: 0.5 }}>FEE: {parseFloat(tx.fee || '0').toFixed(6)}</span>
                       </div>
                    </div>
                 </div>
                 <a href={`${EXPLORERS[network] || EXPLORERS.ETH}/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ marginLeft: '12px', opacity: 0.1 }}>
                    <LucideExternalLink size={10} color="#fff" />
                 </a>
              </div>
            );
          })
        )}
      </div>
      
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '12px' }}>
           <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ background: 'none', border: 'none', color: currentPage === 1 ? '#111' : '#444' }}><LucideChevronLeft size={14} /></button>
           <span style={{ fontSize: '8px', fontWeight: '900', color: '#222', letterSpacing: '2px' }}>{currentPage} / {totalPages}</span>
           <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ background: 'none', border: 'none', color: currentPage === totalPages ? '#111' : '#444' }}><LucideChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}
