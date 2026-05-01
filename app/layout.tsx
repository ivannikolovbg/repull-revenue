import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Repull Revenue',
  description:
    'Open-source revenue management starter — pricing intelligence + market data, one fork-and-deploy template. Powered by Repull.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
