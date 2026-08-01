'use client';

import { useEffect, useState } from 'react';

interface LiveBadgeProps {
  isOnline: boolean;
  activeGameStartTime: string | null;
  riotId?: string; // "GameName#TAG" — used to build op.gg live link
}

function formatElapsed(startIso: string): string {
  const start = new Date(startIso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - start);
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildOpGgLiveUrl(riotId: string): string {
  const [name, tag] = riotId.split('#');
  return `https://www.op.gg/summoners/las/${encodeURIComponent(name)}-${encodeURIComponent(tag ?? 'LAS')}/ingame`;
}

export function LiveBadge({ isOnline, activeGameStartTime, riotId }: LiveBadgeProps) {
  const [elapsed, setElapsed] = useState<string>('00:00');

  useEffect(() => {
    if (!isOnline || !activeGameStartTime) return;
    setElapsed(formatElapsed(activeGameStartTime));
    const interval = setInterval(() => {
      setElapsed(formatElapsed(activeGameStartTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOnline, activeGameStartTime]);

  if (!isOnline) {
    return <span className="live-badge live-badge--offline">Ausente</span>;
  }

  const href = riotId ? buildOpGgLiveUrl(riotId) : '#';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="live-badge live-badge--online live-badge--link"
      title="Ver partida en vivo en OP.GG"
    >
      <span className="live-badge__dot" />
      EN VIVO · {elapsed}
      <svg
        className="live-badge__arrow"
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M1.5 8.5L8.5 1.5M8.5 1.5H3.5M8.5 1.5V6.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
