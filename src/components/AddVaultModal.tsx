'use client';

import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { generateMnemonic } from '@/lib/wallet';
import { LucideX, LucidePlus, LucideImport, LucideShield, LucideChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NETWORKS = [
  { id: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { id: 'SOL', name: 'Solana', color: '#14F195' },
  { id: 'BTC', name: 'Bitcoin', color: '#F7931A' },
  { id: 'BASE', name: 'Base', color: '#0052FF' },
  { id: 'ARBITRUM', name: 'Arbitrum', color: '#28A0F0' },
  { id: 'POLYGON', name: 'Polygon', color: '#8247E5' },
  { id: 'HYPER', name: 'HyperEVM', color: '#FFFFFF' },
  { id: 'SEPOLIA', name: 'Sepolia', color: '#A0A0A0' }
];

export default function AddVaultModal({ onClose }: { onClose: () => void }) {
  const { addMnemonicVault, importKeyVault } = useWallet();
  const [tab, setTab] = useState<'PHRASE' | 'KEY'>('PHRASE');
  const [step, setStep] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState('ETH');
  
  const [mnemonicWords, setMnemonicWords] = useState<12 | 24>(12);
  const [inputText, setInputText] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async () => {
    if (!password) { setError('Password required'); return; }
    setIsProcessing(true);
    try {
      if (tab === 'PHRASE') {
        const text = inputText.trim() || generateMnemonic(mnemonicWords);
        await addMnemonicVault(text, password);
      } else {
        if (!inputText.trim()) throw new Error('Key required');
        await importKeyVault(inputText.trim(), selectedNetwork as any, password);
      }
      onClose();
    } catch (e: any) {
      setError(e.message || 'Action failed');
    } finally { setIsProcessing(false); }
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
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Add Vault</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 2 }}>Import or create a new vault entity</p>
          </div>
          <button className="btn-ghost" onClick={onClose}><LucideX size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '8px', marginBottom: '32px' }}>
          <button 
            className={tab === 'PHRASE' ? 'btn-primary' : 'btn-secondary'} 
            style={{ flex: 1, padding: '10px', fontSize: '10px', border: 'none' }} 
            onClick={() => { setTab('PHRASE'); setStep(1); }}
          >RECOVERY PHRASE</button>
          <button 
            className={tab === 'KEY' ? 'btn-primary' : 'btn-secondary'} 
            style={{ flex: 1, padding: '10px', fontSize: '10px', border: 'none' }} 
            onClick={() => { setTab('KEY'); setStep(1); }}
          >STANDALONE KEY</button>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'PHRASE' ? (
            <motion.div key="phrase" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
               <p style={{ fontSize: '11px', color: '#666', marginBottom: '20px' }}>Generate a new seed or import an existing recovery phrase.</p>
               <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                 {[12, 24].map(w => (
                   <button key={w} className="btn-secondary" style={{ flex: 1, borderColor: mnemonicWords === w ? '#fff' : '#222', fontSize: '10px' }} onClick={() => setMnemonicWords(w as 12 | 24)}>{w} WORDS</button>
                 ))}
               </div>
               <textarea 
                 className="input-field" 
                 placeholder="Leave empty to generate new phrase..." 
                 style={{ width: '100%', height: '80px', marginBottom: '20px' }} 
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
               />
               <input type="password" className="input-field" placeholder="Vault Password" style={{ width: '100%', marginBottom: '20px' }} value={password} onChange={(e) => setPassword(e.target.value)} />
               {error && <p style={{ color: '#f43f5e', fontSize: '11px', marginBottom: '12px' }}>{error}</p>}
               <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleAction} disabled={isProcessing}>
                 {inputText ? 'IMPORT PHRASE' : 'GENERATE PHRASE'}
               </button>
            </motion.div>
          ) : (
            <motion.div key="key" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
               {step === 1 ? (
                 <>
                   <p style={{ fontSize: '11px', color: '#666', marginBottom: '16px' }}>Step 1: Select Chain</p>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                     {NETWORKS.map(net => (
                       <button 
                         key={net.id} 
                         className="btn-secondary" 
                         style={{ 
                            padding: '12px', borderColor: selectedNetwork === net.id ? net.color : '#222',
                            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px'
                         }} 
                         onClick={() => { setSelectedNetwork(net.id); setStep(2); }}
                       >
                         <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: net.color }} />
                         {net.name}
                       </button>
                     ))}
                   </div>
                 </>
               ) : (
                 <>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: NETWORKS.find(n => n.id === selectedNetwork)?.color }} />
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{selectedNetwork} KEY</span>
                      <button onClick={() => setStep(1)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#0052FF', fontSize: '10px' }}>CHANGE CHAIN</button>
                   </div>
                   <textarea 
                     className="input-field" 
                     placeholder={`Enter ${selectedNetwork} private key...`} 
                     style={{ width: '100%', height: '80px', marginBottom: '20px' }} 
                     value={inputText}
                     onChange={(e) => setInputText(e.target.value)}
                     autoFocus
                   />
                   <input type="password" className="input-field" placeholder="Vault Password" style={{ width: '100%', marginBottom: '20px' }} value={password} onChange={(e) => setPassword(e.target.value)} />
                   {error && <p style={{ color: '#f43f5e', fontSize: '11px', marginBottom: '12px' }}>{error}</p>}
                   <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleAction} disabled={isProcessing}>
                     AUTHORIZE IMPORT
                   </button>
                 </>
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
