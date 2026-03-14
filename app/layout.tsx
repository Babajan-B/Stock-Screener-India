import type { Metadata } from 'next';
import './globals.css';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'StockIN – Indian Stock Market Dashboard',
  description: 'Real-time NSE & BSE Indian stock market data – live prices, charts, and portfolio tracker.',
  keywords: 'NSE, BSE, Indian stocks, stock market, real-time data, NIFTY, SENSEX',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
