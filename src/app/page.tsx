'use client';

import { useWallet } from '@/context/WalletContext';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { activeAccount, isLocked, isLoading } = useWallet();

  if (isLoading) {
    return (
      <div className="flex-center" style={{ height: '100dvh', background: '#000' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="abrupt-wordmark" style={{ fontSize: '28px', marginBottom: '24px' }}>Abrupt</div>
          <div style={{ width: '32px', height: '2px', background: 'rgba(56,189,248,0.3)', margin: '0 auto', borderRadius: '99px', overflow: 'hidden', position: 'relative' }}>
            <div className="pulse" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: 'var(--blue)', borderRadius: '99px' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isLocked ? (
        <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Onboarding />
        </motion.div>
      ) : (
        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Dashboard />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
