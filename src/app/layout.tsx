import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'SoloQ Challenge',
  icons: { icon: '/icon.svg' },
  description: 'Leaderboard competitivo de SoloQ en LAS.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}