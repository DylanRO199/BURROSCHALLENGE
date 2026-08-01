import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'BURROS QUEUE CHALLENGE - SoloQ Leaderboard',
  icons: { icon: '/icon.svg' },
  description: 'Leaderboard oficial del torneo BURROS QUEUE CHALLENGE en League of Legends LAS.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}