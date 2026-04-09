'use client';

import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { ethers } from 'ethers';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { LucideX, LucideScan, LucideArrowRight, LucideLoader, LucideArrowUpRight, LucideFuel, LucideCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SendModal({ onClose, onRefresh }: { onClose: () => void; onRefresh: () => void }) {
  const { activeAccount } = useWallet();
  const [activeTab, setActiveTab] = useState<'ETH' | 'SOL'>(activeAccount?.ethAddress ? 'ETH' : 'SOL');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!activeAccount) return null;

  const handleSend = async () => {
    setIsSending(true);
    setError(null);
    try {
      if (activeTab === 'ETH') {
        const provider = new ethers.JsonRpcProvider('https://ethereum.publicnode.com');
        const signer = new ethers.Wallet(activeAccount.ethPrivateKey, provider);
        const tx = await signer.sendTransaction({ to, value: ethers.parseEther(amount) });
        setTxHash(tx.hash);
      } else {
        const connection = new Connection('https://solana.publicnode.com', 'confirmed');
        const fromPubKey = new PublicKey(activeAccount.solAddress);
        const toPubKey = new PublicKey(to);
        const transaction = new Transaction().add(
          SystemProgram.transfer({ fromPubkey: fromPubKey, toPubkey: toPubKey, lamports: parseFloat(amount) * LAMPORTS_PER_SOL })
        );
        const secretKey = ethers.getBytes('0x' + activeAccount.solPrivateKey);
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubKey;
        const signature = await connection.sendTransaction(transaction, [{ publicKey: fromPubKey, secretKey }]);
        setTxHash(signature);
      }
      onRefresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSending(false);
    }
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
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Send</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 2 }}>Broadcast a signed transaction</p>
          </div>
          <button className="btn-ghost" onClick={onClose}><LucideX size={18} /></button>
        </div>

        <AnimatePresence mode="wait">
          {!txHash ? (
            <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Tab toggle */}
              <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 12, marginBottom: 20 }}>
                {activeAccount.ethAddress && (
                  <button
                    onClick={() => setActiveTab('ETH')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
                      background: activeTab === 'ETH' ? '#fff' : 'transparent',
                      color: activeTab === 'ETH' ? '#000' : 'var(--text-dim)',
                      transition: 'all 0.2s',
                    }}
                  >Ethereum</button>
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

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-dim)', letterSpacing: 1, display: 'block', marginBottom: 8 }}>RECIPIENT ADDRESS</label>
                <input
                  className="input-field"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder={activeTab === 'ETH' ? '0x...' : 'Base58 address'}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-dim)', letterSpacing: 1, display: 'block', marginBottom: 8 }}>AMOUNT ({activeTab})</label>
                <input
                  className="input-field"
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ fontSize: 24, fontWeight: 800 }}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', fontSize: 12, padding: '12px 14px', borderRadius: 10, marginBottom: 16, border: '1px solid rgba(244,63,94,0.2)' }}>
                  {error}
                </div>
              )}

              <button
                className="btn-primary"
                style={{ width: '100%', padding: '16px', marginBottom: 12 }}
                onClick={handleSend}
                disabled={isSending || !to || !amount}
              >
                {isSending
                  ? <><LucideLoader size={16} className="spin" /> Signing &amp; Broadcasting...</>
                  : <><LucideArrowRight size={16} /> Sign &amp; Broadcast</>
                }
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 11 }}>
                <LucideFuel size={12} /> Gas fees will be deducted from your balance
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', paddingTop: 20 }}
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                style={{
                  width: 72, height: 72, background: '#10b981', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px', boxShadow: '0 0 40px rgba(16,185,129,0.35)',
                }}
              >
                <LucideCheck size={36} color="#fff" />
              </motion.div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Broadcast Successful</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 24 }}>Transaction injected into the network.</p>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-stroke)', borderRadius: 12, padding: '14px 16px', marginBottom: 24, textAlign: 'left' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 6 }}>TX HASH</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', wordBreak: 'break-all' }}>{txHash}</div>
              </div>
              <button className="btn-primary" style={{ width: '100%', padding: '16px' }} onClick={onClose}>Done</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
