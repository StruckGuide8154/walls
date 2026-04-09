import './globals.css';
import '../lib/polyfills';
import { Playfair_Display, Inter } from 'next/font/google';
import { WalletProvider } from '@/context/WalletContext';
import type { Metadata, Viewport } from 'next';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], style: ['italic'], variable: '--font-playfair' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: 'Abrupt — Self-Custodial Wallet',
  description: 'Abrupt. The most elegant self-custodial multi-chain wallet.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Abrupt',
  },
  icons: {
    apple: '/icon-512.png',
    icon: '/icon-512.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Abrupt" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
      </head>
      <body className={inter.className}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
