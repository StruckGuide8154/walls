'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { getEvmBalance, getSolBalance, getBtcBalance, getCache, getNetworkStats } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LucideRefreshCcw,
  LucideCopy,
  LucidePlusCircle,
  LucideLogOut,
  LucideSettings,
  LucideShieldAlert,
  LucideEdit3,
  LucideArrowRightLeft,
  LucideCheck,
  LucideWallet,
  LucideLayoutGrid,
  LucideHistory,
  LucideChevronDown,
  LucideSend,
  LucideQrCode,
  LucideUser,
  LucideBox,
  LucideKey,
  LucideLayers,
} from 'lucide-react';
import ReceiveModal from './ReceiveModal';
import SendModal from './SendModal';
import SettingsModal from './SettingsModal';
import AddVaultModal from './AddVaultModal';
import History from './History';

const NETWORKS = [
  { id: 'ETH',      name: 'Ethereum',   color: '#627EEA' },
  { id: 'SOL',      name: 'Solana',     color: '#14F195' },
  { id: 'BTC',      name: 'Bitcoin',    color: '#F7931A' },
  { id: 'BASE',     name: 'Base',       color: '#0052FF' },
  { id: 'ARBITRUM', name: 'Arbitrum',   color: '#28A0F0' },
  { id: 'POLYGON',  name: 'Polygon',    color: '#8247E5' },
  { id: 'HYPER',    name: 'HyperEVM',   color: '#FFFFFF' },
  { id: 'SEPOLIA',  name: 'Sepolia',    color: '#A0A0A0' },
];

type MobileTab = 'home' | 'networks' | 'history' | 'accounts';

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    vaultItems, accounts, activeAccount, activeAccountIndex,
    setActiveAccountIndex, deriveMoreFromMnemonic, updateAccountName, logout,
  } = useWallet();

  const isMobile = useIsMobile();

  const [balances, setBalances]           = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [showReceive, setShowReceive]     = useState(false);
  const [showSend, setShowSend]           = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [showAddVault, setShowAddVault]   = useState(false);
  const [copied, setCopied]               = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState('ETH');
  const [networkStats, setNetworkStats]   = useState({ block: '...', gas: '...' });
  const [hideEmpty, setHideEmpty]         = useState(false);
  const [mobileTab, setMobileTab]         = useState<MobileTab>('home');

  const [passphrasePrompt, setPassphrasePrompt] = useState<string | null>(null);
  const [derivePassword, setDerivePassword]     = useState('');
  const [editingAccount, setEditingAccount]     = useState<{ groupId: string; index: number; currentName: string } | null>(null);
  const [newName, setNewName]       = useState('');
  const [editPassword, setEditPassword] = useState('');

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatBal = (val: string | undefined) => {
    if (!val || val === '0') return '0.00';
    const num = parseFloat(val);
    if (num === 0) return '0.00';
    if (num < 0.0001) return num.toFixed(8);
    if (num < 1) return num.toFixed(6);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const refreshBalances = async (forceAll = false) => {
    if (!activeAccount) return;
    setIsRefreshing(true);
    const nb: Record<string, string> = { ...balances };
    try {
      const net = NETWORKS.find(n => n.id === selectedNetwork);
      if (net) {
        const [bal, stats] = await Promise.all([
          net.id === 'SOL' ? (activeAccount.solAddress ? getSolBalance(activeAccount.solAddress) : '0')
            : net.id === 'BTC' ? (activeAccount.btcAddress ? getBtcBalance(activeAccount.btcAddress) : '0')
            : (activeAccount.ethAddress ? getEvmBalance(activeAccount.ethAddress, net.id) : '0'),
          getNetworkStats(net.id),
        ]);
        nb[net.id] = bal;
        setNetworkStats(stats);
      }
    } catch {}
    if (forceAll) {
      await Promise.all(
        NETWORKS.filter(n => n.id !== selectedNetwork).map(async net => {
          try {
            let bal = '0';
            if (net.id === 'SOL') { if (activeAccount.solAddress) bal = await getSolBalance(activeAccount.solAddress); }
            else if (net.id === 'BTC') { if (activeAccount.btcAddress) bal = await getBtcBalance(activeAccount.btcAddress); }
            else { if (activeAccount.ethAddress) bal = await getEvmBalance(activeAccount.ethAddress, net.id); }
            nb[net.id] = bal;
          } catch {}
        }),
      );
    } else {
      for (const net of NETWORKS) {
        if (net.id !== selectedNetwork) {
          const addr = net.id === 'SOL' ? activeAccount.solAddress : net.id === 'BTC' ? activeAccount.btcAddress : activeAccount.ethAddress;
          const cached = await getCache(`${net.id}_bal_${addr}`);
          if (cached) nb[net.id] = cached;
        }
      }
    }
    setBalances(nb);
    setIsRefreshing(false);
  };

  useEffect(() => {
    const autoSelect = async () => {
      await refreshBalances(false);
      for (const net of NETWORKS) {
        if (parseFloat(balances[net.id] || '0') > 0) { setSelectedNetwork(net.id); break; }
      }
    };
    autoSelect();
  }, [activeAccountIndex]);

  const handleDeriveMore = async () => {
    if (!passphrasePrompt) return;
    try { await deriveMoreFromMnemonic(passphrasePrompt, derivePassword); setPassphrasePrompt(null); setDerivePassword(''); }
    catch { alert('Failed'); }
  };

  const handleUpdateName = async () => {
    if (!editingAccount) return;
    try { await updateAccountName(editingAccount.groupId, editingAccount.index, newName, editPassword); setEditingAccount(null); }
    catch { alert('Failed'); }
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  };

  if (!activeAccount) return (
    <div className="flex-center" style={{ height: '100dvh', flexDirection: 'column', gap: 20 }}>
      <LucideShieldAlert size={40} color="#f43f5e" />
      <button className="btn-secondary" onClick={logout}>Safe Recovery</button>
    </div>
  );

  const activeAddr = selectedNetwork === 'SOL' ? activeAccount.solAddress
    : selectedNetwork === 'BTC' ? activeAccount.btcAddress
    : activeAccount.ethAddress;

  const currentNet   = NETWORKS.find(n => n.id === selectedNetwork)!;
  const currentBal   = formatBal(balances[selectedNetwork]);
  const currentToken = selectedNetwork === 'SOL' ? 'SOL' : selectedNetwork === 'BTC' ? 'BTC' : 'ETH';

  // ─────────────────────────────────────────────────────────────────────────────
  // Shared modals (used by both layouts)
  // ─────────────────────────────────────────────────────────────────────────────
  const SharedModals = (
    <>
      {showReceive && <ReceiveModal onClose={() => setShowReceive(false)} />}
      {showSend    && <SendModal onClose={() => setShowSend(false)} onRefresh={refreshBalances} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showAddVault && <AddVaultModal onClose={() => setShowAddVault(false)} />}

      <AnimatePresence>
        {passphrasePrompt && (
          <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card" style={{ padding: 28, width: '90%', maxWidth: 340, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 20 }}>Authorize Derivation</div>
              <input type="password" className="input-field" placeholder="Vault Password"
                style={{ marginBottom: 12, textAlign: 'center' }} value={derivePassword}
                onChange={e => setDerivePassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDeriveMore()} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setPassphrasePrompt(null)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleDeriveMore}>Decrypt</button>
              </div>
            </motion.div>
          </div>
        )}
        {editingAccount && (
          <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card" style={{ padding: 28, width: '90%', maxWidth: 340 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 20 }}>Rename Account</div>
              <input type="text" className="input-field" placeholder="New label" value={newName} onChange={e => setNewName(e.target.value)} style={{ marginBottom: 10 }} />
              <input type="password" className="input-field" placeholder="Confirm Password" value={editPassword}
                onChange={e => setEditPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateName()} style={{ marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingAccount(null)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleUpdateName}>Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  DESKTOP LAYOUT
  // ═══════════════════════════════════════════════════════════════════════════
  const DesktopLayout = (
    <div className="desk-shell desktop-only">
      {/* ── Sidebar ── */}
      <aside className="desk-sidebar">
        <div className="desk-sidebar-header">
          <div className="abrupt-wordmark" style={{ fontSize: 16 }}>Abrupt</div>
          <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
            <LucideSettings size={14} />
          </button>
        </div>

        <div className="desk-inner-scroll" style={{ padding: '16px 12px' }}>
          {vaultItems.map(item => {
            const groupAccounts = accounts.filter(a => a.groupId === item.id);
            return (
              <div key={item.id} style={{ marginBottom: 24 }}>
                <div style={{ padding: '0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#333', letterSpacing: 1 }}>{item.type}</span>
                  {item.type === 'MNEMONIC' && (
                    <button onClick={() => setPassphrasePrompt(item.id)}
                      style={{ background: 'none', border: 'none', color: '#0052FF', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>+</button>
                  )}
                </div>
                {groupAccounts.map(acc => {
                  const absIdx = accounts.findIndex(a => a.groupId === acc.groupId && a.name === acc.name && a.ethAddress === acc.ethAddress);
                  const isActive = activeAccountIndex === absIdx;
                  return (
                    <div key={`${acc.groupId}_${acc.name}`} className="desk-account-item"
                      style={{ background: isActive ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                      onClick={() => setActiveAccountIndex(absIdx)}>
                      <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 400, flex: 1, color: isActive ? '#fff' : '#555' }}>
                        {acc.name}
                      </div>
                      {isActive && (
                        <LucideEdit3 size={10} color="#333" style={{ cursor: 'pointer' }}
                          onClick={e => {
                            e.stopPropagation();
                            setEditingAccount({ groupId: item.id, index: groupAccounts.indexOf(acc), currentName: acc.name || '' });
                            setNewName(acc.name || '');
                          }} />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          <button onClick={() => setShowAddVault(true)}
            style={{ width: '100%', border: '1px dashed #1a1a1a', background: 'transparent', padding: 12, borderRadius: 6, color: '#333', fontSize: 10, cursor: 'pointer' }}>
            <LucidePlusCircle size={12} style={{ margin: '0 auto', display: 'block' }} />
          </button>
        </div>

        <button onClick={logout}
          style={{ padding: '20px 24px', textAlign: 'left', background: 'none', border: 'none', color: '#f43f5e', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <LucideLogOut size={12} /> SHUTDOWN
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="desk-main">
        <header className="desk-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 24, fontWeight: 900 }}>{activeAccount.name}</h2>
              {activeAccount.isImported && (
                <span style={{ fontSize: 8, border: '1px solid #0052FF', color: '#0052FF', padding: '1px 5px', borderRadius: 3 }}>EXTERNAL</span>
              )}
            </div>
            <p style={{ fontSize: 11, color: '#333', marginTop: 4 }}>
              {activeAccount.isImported ? 'Standalone Sovereign Asset' : 'Multi-Chain Sovereign Vault'}
            </p>
          </div>
          <button onClick={() => refreshBalances(true)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <LucideRefreshCcw size={14} className={isRefreshing ? 'spin' : ''} />
          </button>
        </header>

        <div className="desk-content">
          <div className="desk-grid">

            {/* Left column */}
            <div className="desk-col">
              {/* Network filter bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: '#333', letterSpacing: 1 }}>BLOCKCHAIN MATRIX</span>
                <button onClick={() => setHideEmpty(!hideEmpty)}
                  style={{ background: 'none', border: 'none', color: hideEmpty ? '#0052FF' : '#444', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <div style={{ width: 20, height: 10, background: hideEmpty ? '#0052FF' : '#1a1a1a', borderRadius: 5, position: 'relative' }}>
                    <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', position: 'absolute', top: 1, left: hideEmpty ? 11 : 1, transition: 'all 0.2s' }} />
                  </div>
                  HIDE EMPTY
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {NETWORKS.filter(n => !hideEmpty || parseFloat(balances[n.id] || '0') > 0).map(net => (
                  <button key={net.id} className="desk-net-chip"
                    onClick={() => setSelectedNetwork(net.id)}
                    style={{
                      border: `1px solid ${selectedNetwork === net.id ? net.color : 'rgba(255,255,255,0.05)'}`,
                      background: selectedNetwork === net.id ? `${net.color}18` : 'transparent',
                      color: selectedNetwork === net.id ? net.color : '#444',
                    }}>
                    <span style={{ fontSize: 8, color: selectedNetwork === net.id ? net.color : '#333' }}>
                      {formatBal(balances[net.id])}
                    </span>
                    {net.id}
                  </button>
                ))}
              </div>

              {/* Balance card */}
              <div className="desk-glass" style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 32, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, padding: 20, opacity: 0.04, pointerEvents: 'none' }}>
                  <LucideBox size={120} />
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#333', letterSpacing: 2 }}>{selectedNetwork} SOVEREIGN BALANCE</span>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 8, color: '#222', fontWeight: 'bold' }}>BLOCK HEIGHT</p>
                        <p style={{ fontSize: 10, fontWeight: 'bold' }}>#{networkStats.block}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 8, color: '#222', fontWeight: 'bold' }}>GAS PRICE</p>
                        <p style={{ fontSize: 10, fontWeight: 'bold', color: '#14F195' }}>{networkStats.gas} GWEI</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 40 }}>
                    <h1 style={{ fontSize: 64, fontWeight: 900, letterSpacing: -2 }}>{currentBal}</h1>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#333' }}>{currentToken}</span>
                  </div>

                  {activeAddr && (
                    <button onClick={() => copy(activeAddr, 'desk-addr')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '6px 10px', color: '#444', fontSize: 10, marginBottom: 24, cursor: 'pointer' }}>
                      {copied === 'desk-addr' ? <LucideCheck size={10} color="#14F195" /> : <LucideCopy size={10} />}
                      <span style={{ fontFamily: 'monospace' }}>{activeAddr.slice(0, 8)}…{activeAddr.slice(-6)}</span>
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="desk-btn-primary" onClick={() => setShowSend(true)}>INITIATE TRANSFER</button>
                    <button className="desk-btn-secondary" onClick={() => setShowReceive(true)}>RECEIVE ASSETS</button>
                  </div>
                </div>
              </div>

              {/* Portfolio inventory */}
              <div className="desk-glass" style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: '#333' }}>PORTFOLIO INVENTORY</span>
                  <span style={{ fontSize: 9, color: '#0052FF', fontWeight: 'bold' }}>ALCHEMY SYNC: ACTIVE</span>
                </div>
                <div className="desk-inner-scroll">
                  <div className="desk-asset-row" style={{ borderRadius: 8, background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                        {selectedNetwork[0]}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 'bold' }}>Native {selectedNetwork}</p>
                        <p style={{ fontSize: 9, color: '#333' }}>{selectedNetwork} Network Token</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, fontWeight: 'bold' }}>{formatBal(balances[selectedNetwork])}</p>
                      <p style={{ fontSize: 9, color: '#14F195' }}>──</p>
                    </div>
                  </div>
                  <div style={{ padding: 24, textAlign: 'center', opacity: 0.15 }}>
                    <LucideShieldAlert size={20} style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 9, fontWeight: 'bold' }}>NO SECONDARY TOKENS DETECTED</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column — activity */}
            <div className="desk-col">
              <div className="desk-glass" style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 900, color: '#333' }}>LEDGER ACTIVITY</p>
                  <LucideArrowRightLeft size={12} color="#1a1a1a" />
                </div>
                <div className="desk-inner-scroll">
                  <History network={selectedNetwork} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {SharedModals}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  MOBILE LAYOUT
  // ═══════════════════════════════════════════════════════════════════════════
  const MobileLayout = (
    <div className="app-shell mobile-only" style={{ flexDirection: 'column' }}>
      {/* ── Top bar ── */}
      <header className="top-bar">
        <div className="abrupt-wordmark">Abrupt</div>
        <button className="account-pill" onClick={() => setMobileTab('accounts')}
          style={{ background: mobileTab === 'accounts' ? 'var(--blue-dim)' : undefined }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `linear-gradient(135deg, ${currentNet.color}44, ${currentNet.color}22)`,
            border: `1px solid ${currentNet.color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 900, color: currentNet.color, flexShrink: 0,
          }}>
            {(activeAccount.name?.[0] || 'A').toUpperCase()}
          </div>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
            {activeAccount.name}
          </span>
          <LucideChevronDown size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-ghost" onClick={() => refreshBalances(true)}><LucideRefreshCcw size={16} className={isRefreshing ? 'spin' : ''} /></button>
          <button className="btn-ghost" onClick={() => setShowSettings(true)}><LucideSettings size={16} /></button>
        </div>
      </header>

      {/* ── Tab content ── */}
      <div className="content-area">
        <AnimatePresence mode="wait">

          {/* HOME */}
          {mobileTab === 'home' && (
            <motion.div key="m-home" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div className="balance-display">
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${currentNet.color}18`, border: `1px solid ${currentNet.color}44`, borderRadius: 99, padding: '4px 12px', marginBottom: 16 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: currentNet.color, boxShadow: `0 0 6px ${currentNet.color}` }} />
                    <span style={{ fontSize: 10, fontWeight: 900, color: currentNet.color, letterSpacing: 1 }}>{currentNet.name.toUpperCase()}</span>
                  </div>
                </div>
                <div className="balance-amount gradient-text">{currentBal}</div>
                <div className="balance-token">{currentToken}</div>
                {activeAddr && (
                  <button onClick={() => copy(activeAddr, 'm-addr')}
                    style={{ marginTop: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-stroke)', borderRadius: 99, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-dim)' }}>
                    {copied === 'm-addr' ? <><LucideCheck size={11} color="var(--blue)" /><span style={{ color: 'var(--blue)' }}>Copied!</span></>
                      : <><LucideCopy size={11} /><span>{activeAddr.slice(0, 6)}…{activeAddr.slice(-6)}</span></>}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, padding: '0 20px 20px' }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => setShowSend(true)}><LucideSend size={16} /> Send</button>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowReceive(true)}><LucideQrCode size={16} /> Receive</button>
              </div>

              <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px', fontSize: 10 }}>
                {[
                  { label: 'BLOCK', val: `#${networkStats.block}`, valColor: undefined },
                  { label: 'GAS', val: `${networkStats.gas}`, valColor: '#14F195' },
                  { label: 'SYNC', val: 'LIVE', valColor: 'var(--blue)' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-stroke)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-dim)', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: s.valColor }}>{s.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, overflow: 'hidden', padding: '0 20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="section-label" style={{ margin: 0 }}>Recent Activity</div>
                  <button onClick={() => setMobileTab('history')} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 11, fontWeight: 700 }}>See all →</button>
                </div>
                <div className="glass-card scroll-area" style={{ flex: 1, padding: '0 16px' }}>
                  <History network={selectedNetwork} />
                </div>
              </div>
            </motion.div>
          )}

          {/* NETWORKS */}
          {mobileTab === 'networks' && (
            <motion.div key="m-networks" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '20px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="section-label" style={{ margin: 0 }}>Blockchain Matrix</div>
                <button onClick={() => setHideEmpty(!hideEmpty)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: hideEmpty ? 'var(--blue)' : 'var(--text-dim)', fontSize: 9, fontWeight: 800 }}>
                  <div style={{ width: 22, height: 12, background: hideEmpty ? 'var(--blue)' : '#1a1a1a', borderRadius: 99, position: 'relative', transition: 'all 0.2s' }}>
                    <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: hideEmpty ? 12 : 2, transition: 'all 0.2s' }} />
                  </div>
                  HIDE EMPTY
                </button>
              </div>
              <div className="scroll-area" style={{ flex: 1, padding: '0 20px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                  {NETWORKS.filter(n => !hideEmpty || parseFloat(balances[n.id] || '0') > 0).map(net => (
                    <button key={net.id} className={`net-chip ${selectedNetwork === net.id ? 'active' : ''}`}
                      style={{ color: selectedNetwork === net.id ? net.color : undefined, background: selectedNetwork === net.id ? `${net.color}12` : undefined }}
                      onClick={() => setSelectedNetwork(net.id)}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: selectedNetwork === net.id ? net.color : '#333' }}>{formatBal(balances[net.id])}</span>
                      {net.id}
                    </button>
                  ))}
                </div>
                <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${currentNet.color}18`, border: `1px solid ${currentNet.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: currentNet.color, boxShadow: `0 0 8px ${currentNet.color}` }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{currentNet.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{selectedNetwork} Network</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>{currentBal}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dim)' }}>{currentToken}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-primary" style={{ flex: 1, padding: 12 }} onClick={() => setShowSend(true)}><LucideSend size={14} /> Send</button>
                    <button className="btn-secondary" style={{ flex: 1, padding: 12 }} onClick={() => setShowReceive(true)}><LucideQrCode size={14} /> Receive</button>
                  </div>
                </div>
                {activeAddr && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-stroke)', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>ADDRESS</div>
                      <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', color: '#777' }}>{activeAddr.slice(0, 10)}…{activeAddr.slice(-8)}</div>
                    </div>
                    <button className="btn-ghost" onClick={() => copy(activeAddr, 'm-net-addr')}>
                      {copied === 'm-net-addr' ? <LucideCheck size={14} color="var(--blue)" /> : <LucideCopy size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* HISTORY */}
          {mobileTab === 'history' && (
            <motion.div key="m-history" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '20px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="section-label" style={{ margin: 0 }}>Ledger Activity</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {NETWORKS.slice(0, 5).map(net => (
                    <button key={net.id} onClick={() => setSelectedNetwork(net.id)}
                      style={{ width: 28, height: 28, borderRadius: 8, background: selectedNetwork === net.id ? `${net.color}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedNetwork === net.id ? net.color : 'rgba(255,255,255,0.06)'}`, color: selectedNetwork === net.id ? net.color : '#444', fontSize: 7, fontWeight: 900 }}>
                      {net.id.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="scroll-area" style={{ flex: 1, padding: '0 20px 20px' }}>
                <div className="glass-card" style={{ padding: '0 16px' }}>
                  <History network={selectedNetwork} />
                </div>
              </div>
            </motion.div>
          )}

          {/* ACCOUNTS */}
          {mobileTab === 'accounts' && (
            <motion.div key="m-accounts" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '20px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="section-label" style={{ margin: 0 }}>Vaults &amp; Accounts</div>
                <button onClick={() => setShowAddVault(true)} style={{ background: 'none', border: 'none', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>
                  <LucidePlusCircle size={14} /> Add
                </button>
              </div>
              <div className="scroll-area" style={{ flex: 1, padding: '0 20px' }}>
                {vaultItems.map(item => {
                  const groupAccounts = accounts.filter(a => a.groupId === item.id);
                  return (
                    <div key={item.id} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', letterSpacing: 1 }}>{item.type}</span>
                        {item.type === 'MNEMONIC' && (
                          <button onClick={() => setPassphrasePrompt(item.id)} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 11, fontWeight: 800 }}>+ Derive</button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {groupAccounts.map(acc => {
                          const absIdx = accounts.findIndex(a => a.groupId === acc.groupId && a.name === acc.name && a.ethAddress === acc.ethAddress);
                          const isActive = activeAccountIndex === absIdx;
                          return (
                            <div key={`${acc.groupId}_${acc.name}`}
                              style={{ padding: '14px 16px', borderRadius: 12, background: isActive ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? 'rgba(56,189,248,0.3)' : 'var(--glass-stroke)'}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                              onClick={() => setActiveAccountIndex(absIdx)}>
                              <div style={{ width: 36, height: 36, borderRadius: 10, background: isActive ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: isActive ? 'var(--blue)' : 'var(--text-dim)' }}>
                                {(acc.name?.[0] || 'A').toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: isActive ? 700 : 500, fontSize: 13, color: isActive ? '#fff' : '#888', marginBottom: 2 }}>{acc.name}</div>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
                                  {acc.ethAddress && <span>ETH</span>}
                                  {acc.solAddress && <span>SOL</span>}
                                  {acc.btcAddress && <span>BTC</span>}
                                  {acc.isImported && <span style={{ color: 'var(--blue)' }}>EXTERNAL</span>}
                                </div>
                              </div>
                              {isActive && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', boxShadow: '0 0 6px var(--blue)' }} />
                                  <button onClick={e => { e.stopPropagation(); setEditingAccount({ groupId: item.id, index: groupAccounts.indexOf(acc), currentName: acc.name || '' }); setNewName(acc.name || ''); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', padding: 4 }}>
                                    <LucideEdit3 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: 8, marginBottom: 20 }}>
                  <button onClick={logout}
                    style={{ width: '100%', padding: 14, background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 12, color: '#f43f5e', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <LucideLogOut size={14} /> Lock &amp; Shutdown
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Bottom nav ── */}
      <nav className="bottom-nav">
        {([
          { id: 'home',     icon: LucideWallet,      label: 'Wallet'   },
          { id: 'networks', icon: LucideLayoutGrid,   label: 'Networks' },
          { id: 'history',  icon: LucideHistory,      label: 'Activity' },
          { id: 'accounts', icon: LucideUser,         label: 'Vaults'   },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button key={id} className={`nav-btn ${mobileTab === id ? 'active' : ''}`} onClick={() => setMobileTab(id)}>
            <Icon size={20} strokeWidth={mobileTab === id ? 2.5 : 1.5} />
            {label}
          </button>
        ))}
      </nav>

      {SharedModals}
    </div>
  );

  // ─── Render both, CSS handles which is visible ───────────────────────────────
  return (
    <>
      {DesktopLayout}
      {MobileLayout}
    </>
  );
}
