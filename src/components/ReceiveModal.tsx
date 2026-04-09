'use client';

import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { QRCodeSVG } from 'qrcode.react';
import { LucideX, LucideCopy, LucideCheck, LucideHash } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReceiveModal({ onClose }: { onClose: () => void }) {
  const { activeAccount } = useWallet();
  const [activeTab, setActiveTab] = useState<'ETH' | 'SOL'>(activeAccount?.ethAddress ? 'ETH' : 'SOL');
  const [copied, setCopied] = useState(false);

  if (!activeAccount) return null;

  const address = activeTab === 'ETH' ? activeAccount.ethAddress : activeAccount.solAddress;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Receive</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 2 }}>Share your address to receive funds</p>
          </div>
          <button className="btn-ghost" onClick={onClose}><LucideX size={18} /></button>
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 12, marginBottom: 24 }}>
          {activeAccount.ethAddress && (
            <button
              onClick={() => setActiveTab('ETH')}
              style={{
                flex: 1, padding: '10px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
                background: activeTab === 'ETH' ? '#fff' : 'transparent',
                color: activeTab === 'ETH' ? '#000' : 'var(--text-dim)',
                transition: 'all 0.2s',
              }}
            >Ethereum (EVM)</button>
          )}
          {activeAccount.solAddress && (
            <button
              onClick={() => setActiveTab('SOL')}
              style={{
                flex: 1, padding: '10px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
                background: activeTab === 'SOL' ? '#fff' : 'transparent',
                color: activeTab === 'SOL' ? '#000' : 'var(--text-dim)',
                transition: 'all 0.2s',
              }}
            >Solana</button>
          )}
        </div>

        {/* QR Code */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 20, boxShadow: '0 0 40px rgba(56,189,248,0.15)' }}>
            <QRCodeSVG value={address} size={200} />
          </div>
        </div>

        {/* Address */}
        <div
          onClick={handleCopy}
          style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-stroke)',
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}
        >
          <div style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: '#888', wordBreak: 'break-all' }}>{address}</div>
          {copied ? <LucideCheck size={16} color="var(--blue)" /> : <LucideCopy size={16} color="#555" />}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
          Tap address to copy to clipboard
        </p>
      </motion.div>
    </div>
  );
}
