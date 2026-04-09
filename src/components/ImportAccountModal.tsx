'use client';

import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { LucideX, LucideKey, LucideShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImportAccountModal({ onClose }: { onClose: () => void }) {
  const { importAccountFromKey } = useWallet();
  const [key, setKey] = useState('');
  const [network, setNetwork] = useState<'ETH' | 'SOL'>('ETH');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImport = async () => {
    if (!key.trim()) { setError('Key required'); return; }
    if (!password) { setError('Password required'); return; }
    setIsProcessing(true);
    try {
      await importAccountFromKey(key.trim(), network, password);
      onClose();
    } catch (e) {
      setError('Import failed. Check key & password.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Import Account</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--accent-muted)' }}><LucideX size={18} /></button>
        </div>

        <div style={{ border: '1px solid rgba(255,165,0,0.2)', background: 'rgba(255,165,0,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '10px' }}>
          <LucideShieldAlert size={16} color="#ffca28" style={{ marginTop: '2px' }} />
          <p style={{ fontSize: '11px', color: '#ffca28' }}>Importing an external key adds it to your current vault permanently. Access requires your vault password.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button className={network === 'ETH' ? 'btn-secondary' : 'btn-secondary'} style={{ flex: 1, borderColor: network === 'ETH' ? '#fff' : 'var(--glass-stroke)' }} onClick={() => setNetwork('ETH')}>ETH</button>
          <button className={network === 'SOL' ? 'btn-secondary' : 'btn-secondary'} style={{ flex: 1, borderColor: network === 'SOL' ? '#fff' : 'var(--glass-stroke)' }} onClick={() => setNetwork('SOL')}>SOL</button>
        </div>

        <textarea 
          className="input-field" 
          placeholder="Private Key (Hex or Base58)" 
          style={{ width: '100%', height: '80px', marginBottom: '12px', resize: 'none' }} 
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />

        <input 
          type="password" 
          className="input-field" 
          placeholder="Vault Password to Authorize" 
          style={{ width: '100%', marginBottom: '16px' }} 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p style={{ color: '#f43f5e', fontSize: '11px', marginBottom: '12px' }}>{error}</p>}

        <button className="btn-primary" style={{ width: '100%' }} onClick={handleImport} disabled={isProcessing}>
          {isProcessing ? 'Importing...' : 'Add Account'}
        </button>
      </motion.div>
    </div>
  );
}
