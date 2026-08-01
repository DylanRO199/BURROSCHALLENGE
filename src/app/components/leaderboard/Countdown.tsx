'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  endsAt: string | null;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(endsAtIso: string): TimeRemaining {
  const endTime = new Date(endsAtIso).getTime();
  const now = Date.now();
  const diffMs = endTime - now;

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isExpired: false };
}

export function Countdown({ endsAt }: CountdownProps) {
  const [time, setTime] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    if (!endsAt) return;

    setTime(calculateTimeRemaining(endsAt));

    const interval = setInterval(() => {
      setTime(calculateTimeRemaining(endsAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt]);

  if (!endsAt || !time) return null;

  if (time.isExpired) {
    return (
      <div className="countdown-container countdown-container--expired">
        <span className="countdown-label">EL TORNEO HA FINALIZADO</span>
      </div>
    );
  }

  return (
    <div className="countdown-container">
      <div className="countdown-content">
        <svg
          className="countdown-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="countdown-label">EL TORNEO TERMINA EN</span>
        <div className="countdown-timer">
          <span className="countdown-number">{time.days}<span className="countdown-unit">d</span></span>
          <span className="countdown-separator">:</span>
          <span className="countdown-number">{String(time.hours).padStart(2, '0')}<span className="countdown-unit">h</span></span>
          <span className="countdown-separator">:</span>
          <span className="countdown-number">{String(time.minutes).padStart(2, '0')}<span className="countdown-unit">m</span></span>
          <span className="countdown-separator">:</span>
          <span className="countdown-number">{String(time.seconds).padStart(2, '0')}<span className="countdown-unit">s</span></span>
        </div>
      </div>
    </div>
  );
}
