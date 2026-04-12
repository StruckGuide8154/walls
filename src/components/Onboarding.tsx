'use client';

import React, { useState } from 'react';
import { generateMnemonic } from '@/lib/wallet';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LucideArrowLeft,
  LucideLock,
  LucideRefreshCcw,
  LucideShieldCheck,
  LucideImport,
  LucideEye,
  LucideEyeOff,
  LucideAlertTriangle,
  LucideCopy,
  LucideCheck,
} from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateNew = () => {
    const m = generateMnemonic(mnemonicWords);
    setMnemonicText(m);
    setPassword('');
    setConfirmPassword('');
    setError('');
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
    if (!password) { setError('Enter your password.'); return; }
    setIsProcessing(true);
    const success = await unlockVault(password);
    if (!success) setError('Incorrect password.');
    setIsProcessing(false);
  };

  const copyPhrase = () => {
    navigator.clipboard.writeText(mnemonicText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const words = mnemonicText ? mnemonicText.split(' ') : [];

  return (
    <div style={{
      height: '100dvh',
      width: '100vw',
      background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(56,189,248,0.07) 0%, #000 60%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      overflow: 'hidden',
      position: 'fixed',
      inset: 0,
    }}>

      <AnimatePresence mode="wait">

        {/* ═══════════════════ UNLOCK ═══════════════════ */}
        {step === 'unlock' && (
          <motion.div
            key="unlock"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            {/* Icon */}
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: 'rgba(56,189,248,0.06)',
              border: '1px solid rgba(56,189,248,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 24,
              boxShadow: '0 0 48px rgba(56,189,248,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
              <LucideLock size={30} color="var(--blue)" strokeWidth={1.8} />
            </div>

            {/* Title */}
            <div className="abrupt-wordmark" style={{ fontSize: 30, marginBottom: 6 }}>Abrupt</div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 36, fontWeight: 500 }}>
              Enter your password to unlock
            </p>

            {/* Password input */}
            <div style={{ position: 'relative', width: '100%', marginBottom: error ? 8 : 14 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                autoFocus
                style={{ paddingRight: 48 }}
              />
              <button
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-dim)', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? <LucideEyeOff size={16} /> : <LucideEye size={16} />}
              </button>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12, alignSelf: 'flex-start' }}
              >
                {error}
              </motion.p>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '16px', marginBottom: 16, fontSize: 15 }}
              onClick={handleUnlock}
              disabled={isProcessing}
            >
              {isProcessing ? 'Unlocking...' : 'Unlock Vault'}
            </button>

            <button
              onClick={() => setStep('initial')}
              style={{
                background: 'none', border: 'none', color: 'var(--text-dim)',
                fontSize: 12, fontWeight: 500,
              }}
            >
              Use a different wallet
            </button>
          </motion.div>
        )}

        {/* ═══════════════════ INITIAL ═══════════════════ */}
        {step === 'initial' && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            style={{ width: '100%', maxWidth: 340 }}
          >
            {/* Logo block */}
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{
                width: 76, height: 76, borderRadius: 22,
                background: 'rgba(56,189,248,0.06)',
                border: '1px solid rgba(56,189,248,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 0 56px rgba(56,189,248,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}>
                <span style={{
                  fontSize: 36, fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic', fontWeight: 700, color: 'var(--blue)', lineHeight: 1,
                  textShadow: '0 0 24px rgba(56,189,248,0.5)',
                }}>A</span>
              </div>
              <div className="abrupt-wordmark" style={{ fontSize: 32, marginBottom: 8 }}>Abrupt</div>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
                Self-custodial. Purely client-side.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn-primary"
                style={{ padding: '17px 20px', fontSize: 15, flexDirection: 'column', gap: 2 }}
                onClick={handleCreateNew}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LucideShieldCheck size={17} /> Create New Wallet
                </span>
                <span style={{ fontSize: 11, opacity: 0.65, fontWeight: 500 }}>Generate a fresh seed phrase</span>
              </button>

              <button
                className="btn-secondary"
                style={{ padding: '17px 20px', fontSize: 15, flexDirection: 'column', gap: 2 }}
                onClick={() => { setPassword(''); setConfirmPassword(''); setError(''); setStep('import'); }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LucideImport size={17} /> Import Existing Wallet
                </span>
                <span style={{ fontSize: 11, opacity: 0.45, fontWeight: 500 }}>Use a phrase or private key</span>
              </button>
            </div>

            {/* Word count selector — shown here as a subtle toggle below */}
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>Recovery phrase:</span>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', padding: 3, borderRadius: 8 }}>
                {([12, 24] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setMnemonicWords(n)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700,
                      background: mnemonicWords === n ? 'rgba(56,189,248,0.15)' : 'transparent',
                      color: mnemonicWords === n ? 'var(--blue)' : 'var(--text-dim)',
                      transition: 'all 0.15s',
                    }}
                  >{n} words</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════ CREATE ═══════════════════ */}
        {step === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.22 }}
            style={{
              width: '100%', maxWidth: 400,
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto', maxHeight: '100dvh',
              paddingTop: 8, paddingBottom: 8,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={() => setStep('initial')} className="btn-ghost"><LucideArrowLeft size={18} /></button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Recovery Phrase</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>Write these words down in order</div>
              </div>
              <button
                onClick={regenerateMnemonic}
                className="btn-ghost"
                title="Regenerate"
              >
                <LucideRefreshCcw size={15} />
              </button>
            </div>

            {/* Warning */}
            <div style={{
              display: 'flex', gap: 10, padding: '10px 14px',
              background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.18)',
              borderRadius: 10, marginBottom: 16,
            }}>
              <LucideAlertTriangle size={15} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: 'rgba(244,63,94,0.85)', lineHeight: 1.5, fontWeight: 500 }}>
                Never share this phrase. Anyone with it can access your funds permanently.
              </p>
            </div>

            {/* Phrase grid */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 5,
                filter: showPhrase ? 'none' : 'blur(6px)',
                userSelect: showPhrase ? 'text' : 'none',
                transition: 'filter 0.2s',
              }}>
                {words.map((word, i) => (
                  <div key={i} style={{
                    padding: '9px 10px',
                    background: 'rgba(56,189,248,0.04)',
                    border: '1px solid rgba(56,189,248,0.1)',
                    borderRadius: 9,
                    fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)', minWidth: 14, textAlign: 'right', fontWeight: 700 }}>{i + 1}</span>
                    <span>{word}</span>
                  </div>
                ))}
              </div>

              {/* Show/hide overlay */}
              {!showPhrase && (
                <button
                  onClick={() => setShowPhrase(true)}
                  style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.3)', borderRadius: 9,
                    border: 'none', gap: 8,
                  }}
                >
                  <LucideEye size={22} color="var(--blue)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Tap to reveal</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>Make sure no one is watching</span>
                </button>
              )}
            </div>

            {/* Phrase actions */}
            {showPhrase && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  onClick={() => setShowPhrase(false)}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-stroke)',
                    color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <LucideEyeOff size={13} /> Hide
                </button>
                <button
                  onClick={copyPhrase}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                    background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'var(--glass-stroke)'}`,
                    color: copied ? 'var(--green)' : 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? <><LucideCheck size={13} /> Copied</> : <><LucideCopy size={13} /> Copy</>}
                </button>
              </div>
            )}

            {/* Password fields */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Set vault password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                style={{ paddingRight: 48 }}
              />
              <button
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-dim)', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? <LucideEyeOff size={16} /> : <LucideEye size={16} />}
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: error ? 8 : 16 }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleFinishCreate()}
                style={{ paddingRight: 48 }}
              />
              <button
                onClick={() => setShowConfirmPassword(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-dim)', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showConfirmPassword ? <LucideEyeOff size={16} /> : <LucideEye size={16} />}
              </button>
            </div>

            {/* Password strength hint */}
            {password.length > 0 && password.length < 8 && (
              <p style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>
                At least 8 characters required
              </p>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}
              >
                {error}
              </motion.p>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: 15 }}
              onClick={handleFinishCreate}
              disabled={isProcessing}
            >
              {isProcessing ? 'Creating Vault...' : 'Create Vault'}
            </button>
          </motion.div>
        )}

        {/* ═══════════════════ IMPORT ═══════════════════ */}
        {step === 'import' && (
          <motion.div
            key="import"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.22 }}
            style={{
              width: '100%', maxWidth: 400,
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto', maxHeight: '100dvh',
              paddingTop: 8, paddingBottom: 8,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setStep('initial')} className="btn-ghost"><LucideArrowLeft size={18} /></button>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Import Wallet</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>Restore an existing vault</div>
              </div>
            </div>

            {/* Mode toggle */}
            <div style={{
              display: 'flex', gap: 4,
              background: 'rgba(255,255,255,0.03)',
              padding: 3, borderRadius: 11, marginBottom: 16,
            }}>
              {(['PHRASE', 'KEY'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setImportMode(mode); setMnemonicText(''); setError(''); }}
                  style={{
                    flex: 1, padding: '11px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
                    background: importMode === mode ? '#fff' : 'transparent',
                    color: importMode === mode ? '#000' : 'var(--text-dim)',
                    transition: 'all 0.18s',
                  }}
                >
                  {mode === 'PHRASE' ? 'Recovery Phrase' : 'Private Key'}
                </button>
              ))}
            </div>

            {/* Network select (private key only) */}
            {importMode === 'KEY' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {(['ETH', 'SOL'] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setNetwork(n)}
                    style={{
                      flex: 1, padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      background: network === n ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${network === n ? 'rgba(56,189,248,0.35)' : 'var(--glass-stroke)'}`,
                      color: network === n ? 'var(--blue)' : 'var(--text-dim)',
                      transition: 'all 0.18s',
                    }}
                  >{n}</button>
                ))}
              </div>
            )}

            {/* Phrase / key input */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <textarea
                className="input-field"
                placeholder={
                  importMode === 'PHRASE'
                    ? 'word1 word2 word3 ... (12 or 24 words)'
                    : 'Paste your private key here'
                }
                style={{
                  height: importMode === 'PHRASE' ? 100 : 76,
                  resize: 'none',
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontFamily: importMode === 'KEY' ? 'monospace' : 'inherit',
                  paddingRight: importMode === 'PHRASE' ? 44 : 16,
                }}
                value={mnemonicText}
                onChange={e => { setMnemonicText(e.target.value); setError(''); }}
              />
              {importMode === 'PHRASE' && mnemonicText.trim() && (
                <span style={{
                  position: 'absolute', bottom: 10, right: 12,
                  fontSize: 10, fontWeight: 700,
                  color: [12, 24].includes(mnemonicText.trim().split(/\s+/).length)
                    ? 'var(--green)' : 'var(--text-dim)',
                }}>
                  {mnemonicText.trim().split(/\s+/).length}w
                </span>
              )}
            </div>

            {/* Password fields */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Set vault password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                style={{ paddingRight: 48 }}
              />
              <button
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-dim)', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? <LucideEyeOff size={16} /> : <LucideEye size={16} />}
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: error ? 8 : 16 }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleImport()}
                style={{ paddingRight: 48 }}
              />
              <button
                onClick={() => setShowConfirmPassword(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-dim)', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showConfirmPassword ? <LucideEyeOff size={16} /> : <LucideEye size={16} />}
              </button>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}
              >
                {error}
              </motion.p>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: 15 }}
              onClick={handleImport}
              disabled={isProcessing}
            >
              {isProcessing ? 'Restoring...' : 'Restore Vault'}
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
