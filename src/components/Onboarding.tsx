'use client';

import React, { useState } from 'react';
import { generateMnemonic } from '@/lib/wallet';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideArrowLeft, LucideLock, LucideRefreshCcw, LucideShieldCheck, LucideImport } from 'lucide-react';

export default function Onboarding() {
  const { initializeVault, initializeFromKey, unlockVault, hasVault } = useWallet();
  const [step, setStep] = useState<'initial' | 'create' | 'import' | 'unlock'>(hasVault ? 'unlock' : 'initial');
  const [importMode, setImportMode] = useState<'PHRASE' | 'KEY'>('PHRASE');
  const [network, setNetwork] = useState<'ETH' | 'SOL'>('ETH');
  const [mnemonicWords, setMnemonicWords] = useState<12 | 24>(12);

  const [mnemonicText, setMnemonicText] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateNew = () => {
    const m = generateMnemonic(mnemonicWords);
    setMnemonicText(m);
    setStep('create');
  };

  const regenerateMnemonic = () => setMnemonicText(generateMnemonic(mnemonicWords));

  const handleFinishCreate = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setIsProcessing(true);
    try { await initializeVault(mnemonicText, password); }
    catch { setError('Failed to create vault.'); }
    finally { setIsProcessing(false); }
  };

  const handleImport = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setIsProcessing(true);
    try {
      if (importMode === 'PHRASE') {
        if (!mnemonicText.trim().includes(' ')) { setError('Invalid recovery phrase.'); setIsProcessing(false); return; }
        await initializeVault(mnemonicText.trim(), password);
      } else {
        if (!mnemonicText.trim()) { setError('Private key is required.'); setIsProcessing(false); return; }
        await initializeFromKey(mnemonicText.trim(), network, password);
      }
    } catch { setError('Import failed. Please check your credentials.'); }
    finally { setIsProcessing(false); }
  };

  const handleUnlock = async () => {
    setIsProcessing(true);
    const success = await unlockVault(password);
    if (!success) setError('Incorrect password.');
    setIsProcessing(false);
  };

  const words = mnemonicText ? mnemonicText.split(' ') : [];

  return (
    <div style={{
      height: '100dvh', height: '100vh', width: '100vw',
      background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      overflow: 'hidden',
      position: 'fixed', inset: 0,
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '280px', height: '280px',
        background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', userSelect: 'none',
      }} />

      <AnimatePresence mode="wait">

        {/* ═══ INITIAL ═══ */}
        {step === 'initial' && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}
          >
            {/* Logo */}
            <div style={{ marginBottom: 40 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 0 40px rgba(56,189,248,0.15)',
              }}>
                <span style={{ fontSize: 34, fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>A</span>
              </div>
              <div className="abrupt-wordmark" style={{ fontSize: 32, marginBottom: 8 }}>Abrupt</div>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, fontWeight: 500 }}>Self-custodial. Purely client-side.</p>
            </div>

            {/* Word count toggle */}
            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 12, marginBottom: 20 }}>
              <button
                onClick={() => setMnemonicWords(12)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
                  background: mnemonicWords === 12 ? '#fff' : 'transparent',
                  color: mnemonicWords === 12 ? '#000' : 'var(--text-dim)',
                  transition: 'all 0.2s',
                }}
              >12 Words</button>
              <button
                onClick={() => setMnemonicWords(24)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
                  background: mnemonicWords === 24 ? '#fff' : 'transparent',
                  color: mnemonicWords === 24 ? '#000' : 'var(--text-dim)',
                  transition: 'all 0.2s',
                }}
              >24 Words</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-primary" style={{ padding: '16px' }} onClick={handleCreateNew}>
                <LucideShieldCheck size={16} /> Create New Wallet
              </button>
              <button className="btn-secondary" style={{ padding: '16px' }} onClick={() => setStep('import')}>
                <LucideImport size={16} /> Import Existing Wallet
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ UNLOCK ═══ */}
        {step === 'unlock' && (
          <motion.div
            key="unlock"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}
          >
            <div style={{ marginBottom: 40 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16, margin: '0 auto 16px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-stroke)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LucideLock size={24} color="var(--blue)" />
              </div>
              <div className="abrupt-wordmark" style={{ fontSize: 28, marginBottom: 6 }}>Abrupt</div>
              <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>Enter your password to unlock</p>
            </div>

            <input
              type="password"
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              autoFocus
              style={{ marginBottom: error ? 8 : 16 }}
            />
            {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12, textAlign: 'left' }}>{error}</p>}
            <button className="btn-primary" style={{ width: '100%', padding: '16px' }} onClick={handleUnlock} disabled={isProcessing}>
              {isProcessing ? 'Unlocking...' : 'Unlock Vault'}
            </button>
          </motion.div>
        )}

        {/* ═══ CREATE ═══ */}
        {step === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            style={{ width: '100%', maxWidth: 400 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => setStep('initial')} className="btn-ghost"><LucideArrowLeft size={18} /></button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Backup Phrase</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Write these down safely</div>
              </div>
              <button onClick={regenerateMnemonic} className="btn-ghost"><LucideRefreshCcw size={14} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 20 }}>
              {words.map((word, i) => (
                <div key={i} style={{
                  padding: '8px 10px', background: 'rgba(56,189,248,0.04)',
                  border: '1px solid rgba(56,189,248,0.12)', borderRadius: 8,
                  fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', minWidth: 14, textAlign: 'right' }}>{i + 1}</span>
                  <span style={{ fontWeight: 600 }}>{word}</span>
                </div>
              ))}
            </div>

            <input type="password" className="input-field" placeholder="Set vault password" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: 8 }} />
            <input type="password" className="input-field" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFinishCreate()} style={{ marginBottom: error ? 8 : 16 }} />
            {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</p>}
            <button className="btn-primary" style={{ width: '100%', padding: '16px' }} onClick={handleFinishCreate} disabled={isProcessing}>
              {isProcessing ? 'Creating...' : 'Create Vault'}
            </button>
          </motion.div>
        )}

        {/* ═══ IMPORT ═══ */}
        {step === 'import' && (
          <motion.div
            key="import"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            style={{ width: '100%', maxWidth: 400 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => setStep('initial')} className="btn-ghost"><LucideArrowLeft size={18} /></button>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Import Wallet</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Restore an existing vault</div>
              </div>
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 12, marginBottom: 16 }}>
              <button
                onClick={() => setImportMode('PHRASE')}
                style={{
                  flex: 1, padding: '10px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
                  background: importMode === 'PHRASE' ? '#fff' : 'transparent',
                  color: importMode === 'PHRASE' ? '#000' : 'var(--text-dim)',
                  transition: 'all 0.2s',
                }}
              >Phrase</button>
              <button
                onClick={() => setImportMode('KEY')}
                style={{
                  flex: 1, padding: '10px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
                  background: importMode === 'KEY' ? '#fff' : 'transparent',
                  color: importMode === 'KEY' ? '#000' : 'var(--text-dim)',
                  transition: 'all 0.2s',
                }}
              >Private Key</button>
            </div>

            {importMode === 'KEY' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {(['ETH', 'SOL'] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setNetwork(n)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      background: network === n ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${network === n ? 'rgba(56,189,248,0.4)' : 'var(--glass-stroke)'}`,
                      color: network === n ? 'var(--blue)' : 'var(--text-dim)',
                      transition: 'all 0.2s',
                    }}
                  >{n}</button>
                ))}
              </div>
            )}

            <textarea
              className="input-field"
              placeholder={importMode === 'PHRASE' ? 'Enter your recovery phrase...' : 'Enter your private key...'}
              style={{ height: 90, resize: 'none', marginBottom: 10, fontSize: 14 }}
              value={mnemonicText}
              onChange={e => setMnemonicText(e.target.value)}
            />
            <input type="password" className="input-field" placeholder="Set vault password" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: 8 }} />
            <input type="password" className="input-field" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleImport()} style={{ marginBottom: error ? 8 : 16 }} />
            {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</p>}
            <button className="btn-primary" style={{ width: '100%', padding: '16px' }} onClick={handleImport} disabled={isProcessing}>
              {isProcessing ? 'Restoring...' : 'Restore Vault'}
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
