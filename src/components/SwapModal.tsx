'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { RPC_ENDPOINTS } from '@/lib/api';
import { getSolTokens, type TokenBalance } from '@/lib/tokens';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LucideArrowDownUp,
  LucideChevronDown,
  LucideLoader,
  LucideX,
  LucideCheck,
  LucideAlertTriangle,
  LucideRefreshCcw,
  LucideZap,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOL_MINT = 'So11111111111111111111111111111111111111112';

interface KnownToken {
  mint: string;
  symbol: string;
  name: string;
  color?: string;
}

const KNOWN_TOKENS: KnownToken[] = [
  { mint: SOL_MINT,                                            symbol: 'SOL',     name: 'Solana',           color: '#14F195' },
  { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',    symbol: 'USDC',    name: 'USD Coin',         color: '#2775CA' },
  { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',    symbol: 'USDT',    name: 'Tether USD',       color: '#26A17B' },
  { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',     symbol: 'JUP',     name: 'Jupiter',          color: '#C0A060' },
  { mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',    symbol: 'RAY',     name: 'Raydium',          color: '#5AC4BE' },
  { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',    symbol: 'BONK',    name: 'Bonk',             color: '#FCA131' },
  { mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',     symbol: 'mSOL',    name: 'Marinade SOL',     color: '#AEE4D9' },
  { mint: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',    symbol: 'WETH',    name: 'Wrapped Ether',    color: '#627EEA' },
  { mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',    symbol: 'PYTH',    name: 'Pyth Network',     color: '#9945FF' },
  { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',      symbol: 'ORCA',    name: 'Orca',             color: '#0F8FD1' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{ swapInfo: { label: string }; percent: number }>;
}

interface SwapModalProps {
  onClose: () => void;
  initialInputMint?: string;
  solBalanceRaw?: number; // in SOL
  userTokens?: TokenBalance[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDecimals(amount: string, decimals: number): number {
  return parseFloat(amount) / Math.pow(10, decimals);
}

function fromDecimals(amount: number, decimals: number): string {
  return Math.floor(amount * Math.pow(10, decimals)).toString();
}

function fmtAmt(amount: number, decimals = 6): string {
  if (amount === 0) return '0';
  if (amount < 0.000001) return amount.toFixed(9);
  if (amount < 0.001) return amount.toFixed(6);
  if (amount < 1) return amount.toFixed(4);
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

// ─── Token Picker Popup ───────────────────────────────────────────────────────

interface TokenPickerProps {
  tokens: KnownToken[];
  onSelect: (token: KnownToken) => void;
  onClose: () => void;
  excluding?: string;
}

function TokenPicker({ tokens, onSelect, onClose, excluding }: TokenPickerProps) {
  const [q, setQ] = useState('');
  const filtered = tokens
    .filter(t => t.mint !== excluding)
    .filter(t =>
      !q ||
      t.symbol.toLowerCase().includes(q.toLowerCase()) ||
      t.name.toLowerCase().includes(q.toLowerCase()) ||
      t.mint.toLowerCase().includes(q.toLowerCase())
    );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
        borderRadius: 20, zIndex: 10, display: 'flex', flexDirection: 'column', padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>Select Token</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
          <LucideX size={16} />
        </button>
      </div>
      <input
        autoFocus
        placeholder="Search name, symbol or mint…"
        value={q}
        onChange={e => setQ(e.target.value)}
        className="input-field"
        style={{ marginBottom: 10, fontSize: 12 }}
      />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.map(tok => (
          <button key={tok.mint} onClick={() => onSelect(tok)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 8px', background: 'none', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer',
              textAlign: 'left',
            }}>
            <div style={{
              width: 32, height: 32, borderRadius: 99,
              background: tok.color ? `${tok.color}22` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${tok.color ?? 'rgba(255,255,255,0.1)'}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 900, color: tok.color ?? '#888', flexShrink: 0,
            }}>
              {tok.symbol.slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{tok.symbol}</div>
              <div style={{ fontSize: 10, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tok.name}</div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#444', fontSize: 12, padding: 24 }}>No tokens found</div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SwapModal({ onClose, initialInputMint = SOL_MINT, userTokens = [] }: SwapModalProps) {
  const { activeAccount } = useWallet();

  // Build token list: KNOWN_TOKENS + any user tokens not already in list
  const tokenList: KnownToken[] = [
    ...KNOWN_TOKENS,
    ...userTokens
      .filter(ut => ut.mint && !KNOWN_TOKENS.find(kt => kt.mint === ut.mint))
      .map(ut => ({ mint: ut.mint!, symbol: ut.symbol, name: ut.name })),
  ];

  const [inputToken,  setInputToken]  = useState<KnownToken>(tokenList.find(t => t.mint === initialInputMint) ?? KNOWN_TOKENS[0]);
  const [outputToken, setOutputToken] = useState<KnownToken>(KNOWN_TOKENS[1]); // USDC default
  const [inputAmt,    setInputAmt]    = useState('');
  const [quote,       setQuote]       = useState<QuoteResponse | null>(null);
  const [quoteError,  setQuoteError]  = useState<string | null>(null);
  const [isFetching,  setIsFetching]  = useState(false);
  const [slippage,    setSlippage]    = useState(50); // bps, 50 = 0.5%
  const [showPicker,  setShowPicker]  = useState<'input' | 'output' | null>(null);
  const [txStatus,    setTxStatus]    = useState<'idle' | 'signing' | 'sending' | 'confirmed' | 'error'>('idle');
  const [txSig,       setTxSig]       = useState<string | null>(null);
  const [txError,     setTxError]     = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User's balance of the selected input token
  const inputBalance = (() => {
    if (inputToken.mint === SOL_MINT) {
      // find SOL balance from userTokens raw data isn't available here – caller passes solBalanceRaw
      return null; // shown via prop
    }
    return userTokens.find(t => t.mint === inputToken.mint)?.amount ?? null;
  })();

  // Fetch Jupiter quote
  const fetchQuote = useCallback(async (amt: string, inMint: string, outMint: string, slipBps: number) => {
    if (!amt || parseFloat(amt) <= 0) { setQuote(null); setQuoteError(null); return; }
    // Determine input token decimals
    const inIsSOL = inMint === SOL_MINT;
    const inDecimals = inIsSOL ? 9 : (userTokens.find(t => t.mint === inMint)?.decimals ?? 6);
    const amountRaw = fromDecimals(parseFloat(amt), inDecimals);
    if (amountRaw === '0') { setQuote(null); return; }

    setIsFetching(true);
    setQuoteError(null);
    try {
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inMint}&outputMint=${outMint}&amount=${amountRaw}&slippageBps=${slipBps}&onlyDirectRoutes=false`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? `HTTP ${res.status}`);
      }
      const data: QuoteResponse = await res.json();
      setQuote(data);
    } catch (e: any) {
      setQuote(null);
      setQuoteError(e.message ?? 'Quote failed');
    } finally {
      setIsFetching(false);
    }
  }, [userTokens]);

  // Debounced quote on input change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchQuote(inputAmt, inputToken.mint, outputToken.mint, slippage);
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputAmt, inputToken, outputToken, slippage, fetchQuote]);

  const flipTokens = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmt('');
    setQuote(null);
  };

  // ─── Execute Swap ───────────────────────────────────────────────────────────

  const executeSwap = async () => {
    if (!quote || !activeAccount?.solPrivateKey || !activeAccount.solAddress) return;
    setTxStatus('signing');
    setTxError(null);
    try {
      // 1. Get swap transaction from Jupiter
      const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: activeAccount.solAddress,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        }),
      });

      if (!swapRes.ok) {
        const err = await swapRes.json().catch(() => ({}));
        throw new Error((err as any).error ?? `Swap API error ${swapRes.status}`);
      }

      const { swapTransaction } = await swapRes.json();
      if (!swapTransaction) throw new Error('No transaction returned');

      // 2. Deserialize and sign
      const txBytes = Buffer.from(swapTransaction, 'base64');
      const tx = VersionedTransaction.deserialize(txBytes);
      const keypair = Keypair.fromSecretKey(Buffer.from(activeAccount.solPrivateKey, 'hex'));
      tx.sign([keypair]);

      setTxStatus('sending');

      // 3. Send
      const connection = new Connection(RPC_ENDPOINTS.SOL, 'confirmed');
      const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      // 4. Confirm
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');

      setTxSig(sig);
      setTxStatus('confirmed');
      setInputAmt('');
      setQuote(null);
    } catch (e: any) {
      setTxError(e.message ?? 'Swap failed');
      setTxStatus('error');
    }
  };

  // ─── Derived output display ─────────────────────────────────────────────────

  const outDecimals = outputToken.mint === SOL_MINT ? 9
    : (userTokens.find(t => t.mint === outputToken.mint)?.decimals ?? 6);
  const outAmt = quote ? toDecimals(quote.outAmount, outDecimals) : null;
  const priceImpact = quote ? parseFloat(quote.priceImpactPct) : null;
  const highImpact = priceImpact !== null && priceImpact > 2;
  const route = quote?.routePlan.map(r => r.swapInfo.label).join(' → ') ?? '';

  // ─── Render ─────────────────────────────────────────────────────────────────

  const canSwap = quote && txStatus === 'idle' && !isFetching && !quoteError && activeAccount?.solAddress;
  const isBusy = txStatus === 'signing' || txStatus === 'sending';

  return (
    <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 400, padding: '16px' }}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 20 }}
        transition={{ duration: 0.22 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: 420, padding: 0, overflow: 'hidden', position: 'relative' }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LucideZap size={14} color="#14F195" />
            <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.5 }}>Swap</span>
            <span style={{ fontSize: 9, color: '#555', fontWeight: 700, marginLeft: 2 }}>via Jupiter</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
            <LucideX size={16} />
          </button>
        </div>

        {/* ── Not SOL account warning ── */}
        {!activeAccount?.solAddress && (
          <div style={{ margin: '16px 20px', padding: 12, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, fontSize: 12, color: '#f43f5e', display: 'flex', gap: 8, alignItems: 'center' }}>
            <LucideAlertTriangle size={14} />
            This account has no Solana address. Jupiter swaps require a SOL wallet.
          </div>
        )}

        {/* ── Swap UI ── */}
        {activeAccount?.solAddress && (
          <div style={{ padding: '16px 20px 20px', position: 'relative' }}>

            {/* Token Picker overlay */}
            <AnimatePresence>
              {showPicker && (
                <TokenPicker
                  tokens={tokenList}
                  excluding={showPicker === 'input' ? outputToken.mint : inputToken.mint}
                  onSelect={tok => {
                    if (showPicker === 'input') setInputToken(tok);
                    else setOutputToken(tok);
                    setShowPicker(null);
                    setQuote(null);
                  }}
                  onClose={() => setShowPicker(null)}
                />
              )}
            </AnimatePresence>

            {/* Input Box */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#444', fontWeight: 700 }}>YOU PAY</span>
                {inputBalance !== null && (
                  <button onClick={() => setInputAmt(String(inputBalance))}
                    style={{ background: 'none', border: 'none', fontSize: 10, color: '#0052FF', fontWeight: 700, cursor: 'pointer' }}>
                    MAX {fmtAmt(inputBalance)}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setShowPicker('input')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: inputToken.color ? `${inputToken.color}18` : 'rgba(255,255,255,0.06)', border: `1px solid ${inputToken.color ?? 'rgba(255,255,255,0.1)'}44`, borderRadius: 99, padding: '6px 10px 6px 8px', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 99, background: inputToken.color ? `${inputToken.color}22` : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: inputToken.color ?? '#888' }}>
                    {inputToken.symbol.slice(0, 2)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{inputToken.symbol}</span>
                  <LucideChevronDown size={12} color="#555" />
                </button>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={inputAmt}
                  onChange={e => setInputAmt(e.target.value)}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'right', width: 0 }}
                />
              </div>
            </div>

            {/* Flip Button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
              <button onClick={flipTokens}
                style={{ width: 32, height: 32, borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                <LucideArrowDownUp size={14} />
              </button>
            </div>

            {/* Output Box */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 14px 12px', marginBottom: 14 }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#444', fontWeight: 700 }}>YOU RECEIVE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setShowPicker('output')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: outputToken.color ? `${outputToken.color}18` : 'rgba(255,255,255,0.06)', border: `1px solid ${outputToken.color ?? 'rgba(255,255,255,0.1)'}44`, borderRadius: 99, padding: '6px 10px 6px 8px', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 99, background: outputToken.color ? `${outputToken.color}22` : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: outputToken.color ?? '#888' }}>
                    {outputToken.symbol.slice(0, 2)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{outputToken.symbol}</span>
                  <LucideChevronDown size={12} color="#555" />
                </button>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {isFetching ? (
                    <LucideLoader size={18} color="#444" className="spin" style={{ marginLeft: 'auto' }} />
                  ) : (
                    <span style={{ fontSize: 22, fontWeight: 800, color: outAmt ? '#14F195' : '#333' }}>
                      {outAmt !== null ? fmtAmt(outAmt, outDecimals) : '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quote Details */}
            {quote && !quoteError && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#444', fontWeight: 600 }}>Price Impact</span>
                  <span style={{ color: highImpact ? '#f43f5e' : '#14F195', fontWeight: 700 }}>
                    {highImpact && <LucideAlertTriangle size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
                    {priceImpact !== null ? (priceImpact < 0.01 ? '<0.01%' : `${priceImpact.toFixed(2)}%`) : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#444', fontWeight: 600 }}>Slippage</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[25, 50, 100, 300].map(bps => (
                      <button key={bps} onClick={() => setSlippage(bps)}
                        style={{ padding: '2px 6px', borderRadius: 4, border: `1px solid ${slippage === bps ? '#0052FF' : 'rgba(255,255,255,0.08)'}`, background: slippage === bps ? 'rgba(0,82,255,0.15)' : 'none', color: slippage === bps ? '#0052FF' : '#555', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                        {bps / 100}%
                      </button>
                    ))}
                  </div>
                </div>
                {route && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: '#444', fontWeight: 600, flexShrink: 0 }}>Route</span>
                    <span style={{ color: '#555', fontWeight: 600, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quote error */}
            {quoteError && (
              <div style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, marginBottom: 14, fontSize: 11, color: '#f43f5e', display: 'flex', gap: 6, alignItems: 'center' }}>
                <LucideAlertTriangle size={12} />
                {quoteError}
              </div>
            )}

            {/* TX Status */}
            {txStatus === 'confirmed' && txSig && (
              <div style={{ padding: '10px 14px', background: 'rgba(20,241,149,0.06)', border: '1px solid rgba(20,241,149,0.2)', borderRadius: 10, marginBottom: 14, fontSize: 11, color: '#14F195', display: 'flex', gap: 8, alignItems: 'center' }}>
                <LucideCheck size={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Swap confirmed!</div>
                  <div style={{ fontSize: 9, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{txSig}</div>
                </div>
                <button onClick={() => { setTxStatus('idle'); setTxSig(null); }}
                  style={{ background: 'none', border: 'none', color: '#14F195', cursor: 'pointer', flexShrink: 0 }}>
                  <LucideRefreshCcw size={12} />
                </button>
              </div>
            )}

            {txStatus === 'error' && txError && (
              <div style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, marginBottom: 14, fontSize: 11, color: '#f43f5e', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <LucideAlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Swap failed</div>
                  <div style={{ fontSize: 10, color: '#c0392b', wordBreak: 'break-word' }}>{txError}</div>
                </div>
                <button onClick={() => { setTxStatus('idle'); setTxError(null); }}
                  style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', flexShrink: 0 }}>
                  <LucideX size={12} />
                </button>
              </div>
            )}

            {/* Swap / Status Button */}
            <button
              onClick={txStatus === 'idle' || txStatus === 'error' ? executeSwap : undefined}
              disabled={!canSwap || isBusy}
              className="btn-primary"
              style={{ width: '100%', fontSize: 13, fontWeight: 900, padding: '14px 0', opacity: (!canSwap && txStatus === 'idle') ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {txStatus === 'signing' && <><LucideLoader size={14} className="spin" /> Signing…</>}
              {txStatus === 'sending' && <><LucideLoader size={14} className="spin" /> Sending…</>}
              {(txStatus === 'idle' || txStatus === 'error') && (
                isFetching ? <><LucideLoader size={14} className="spin" /> Fetching Quote…</> :
                !inputAmt || parseFloat(inputAmt) <= 0 ? 'Enter Amount' :
                quoteError ? 'No Route Found' :
                !quote ? 'Fetching Route…' :
                `Swap ${inputToken.symbol} → ${outputToken.symbol}`
              )}
              {txStatus === 'confirmed' && <><LucideCheck size={14} /> Done — Swap Again</>}
            </button>

            <p style={{ textAlign: 'center', fontSize: 9, color: '#333', marginTop: 10 }}>
              Powered by Jupiter Exchange · Solana only
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
