'use client';

import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { decrypt } from '@/lib/encryption';
import { LucideX, LucideEye, LucideEyeOff, LucideCopy, LucideCheck, LucideShieldAlert, LucideKey, LucideLayers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { vaultItems, accounts } = useWallet();
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [revealedItemId, setRevealedItemId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleUnlock = async () => {
    const encrypted = localStorage.getItem('vault');
    if (!encrypted) return;
    try {
      await decrypt(encrypted, password);
      setIsUnlocked(true);
      setError('');
    } catch (e) {
      setError('Invalid password');
    }
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="modal-sheet"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Security & Secrets</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 2 }}>Backup your phrases and private keys</p>
          </div>
          <button className="btn-ghost" onClick={onClose}><LucideX size={18} /></button>
        </div>

        {!isUnlocked ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <LucideShieldAlert size={48} color="#6366f1" style={{ marginBottom: '24px' }} />
            <p style={{ marginBottom: '24px', fontSize: '14px' }}>Authorization required to view vault secrets.</p>
            <input
              type="password"
              className="input-field"
              placeholder="Vault Password"
              style={{ marginBottom: 12 }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            />
            {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</p>}
            <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleUnlock}>
              Unlock Secrets
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '32px' }}>
            {vaultItems.map((item, i) => (
              <section key={item.id} style={{ borderBottom: i === vaultItems.length - 1 ? 'none' : '1px solid var(--glass-stroke)', paddingBottom: '32px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {item.type === 'MNEMONIC' ? <LucideLayers size={14} color="var(--blue)" /> : <LucideKey size={14} color="var(--blue)" />}
                        <h3 style={{ fontSize: 13, fontWeight: 700 }}>
                          {item.type === 'MNEMONIC' ? `Phrase Group ${i + 1}` : `Standalone Key ${i + 1}`}
                        </h3>
                     </div>
                     <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => setRevealedItemId(revealedItemId === item.id ? null : item.id)}>
                       {revealedItemId === item.id ? 'Hide' : 'Reveal'}
                     </button>
                 </div>

                 <AnimatePresence>
                   {revealedItemId === item.id && (
                     <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-stroke)', borderRadius: '12px', padding: '20px', position: 'relative', marginTop: '8px' }}>
                          {item.type === 'MNEMONIC' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                              {item.phrase?.split(' ').map((word, wordIdx) => (
                                <div key={wordIdx} style={{ fontSize: '12px' }}>
                                  <span style={{ color: 'var(--accent-muted)', marginRight: '6px' }}>{wordIdx + 1}</span>{word}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all', paddingRight: '40px' }}>
                              <p style={{ color: 'var(--accent-muted)', fontSize: '9px', marginBottom: '4px' }}>PRIVATE KEY ({item.network})</p>
                              {item.key}
                            </div>
                          )}
                          <button 
                            onClick={() => copy(item.type === 'MNEMONIC' ? item.phrase! : item.key!, item.id)}
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--accent-muted)' }}
                          >
                            {copied === item.id ? <LucideCheck size={16} color="#10b981" /> : <LucideCopy size={16} />}
                          </button>
                        </div>
                        
                        {item.type === 'MNEMONIC' && (
                          <div style={{ marginTop: '20px' }}>
                            <p style={{ fontSize: '10px', color: 'var(--accent-muted)', fontWeight: 'bold', marginBottom: '12px' }}>DERIVED PRIVATE KEYS</p>
                            <div style={{ display: 'grid', gap: '8px' }}>
                               {accounts.filter(a => a.groupId === item.id).map((acc, accIdx) => (
                                 <div key={accIdx} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '8px', border: '0.5px solid var(--glass-stroke)' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{acc.name}</div>
                                    <div style={{ opacity: 0.6, fontSize: '10px', wordBreak: 'break-all' }}>ETH: {acc.ethPrivateKey}</div>
                                    <div style={{ opacity: 0.6, fontSize: '10px', wordBreak: 'break-all', marginTop: '2px' }}>SOL: {acc.solPrivateKey}</div>
                                    <div style={{ opacity: 0.6, fontSize: '10px', wordBreak: 'break-all', marginTop: '2px' }}>BTC (WIF): {acc.btcPrivateKey}</div>
                                 </div>
                               ))}
                            </div>
                          </div>
                        )}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </section>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
