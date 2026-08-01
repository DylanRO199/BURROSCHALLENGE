'use client';

import { useEffect, useRef, useState } from 'react';

const PING_INTERVAL_MS = 30_000; // 30 seconds

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'bq_session_id';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function VisitorCounter() {
  const [active, setActive] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const sessionId = useRef<string>('');

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
    if (!sessionId.current) return;

    const ping = async () => {
      try {
        const res = await fetch('/api/visitors/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId.current }),
        });
        if (res.ok) {
          const data = await res.json() as { active: number; total: number };
          setActive(data.active);
          setTotal(data.total);
        }
      } catch {
        // silently ignore
      }
    };

    void ping();
    const interval = setInterval(() => void ping(), PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (active === null) return null;

  return (
    <div className="visitor-counter" aria-label="Estadísticas de visitantes">
      <div className="visitor-row">
        <span className="visitor-dot active-dot" />
        <span className="visitor-label">
          <strong>{active}</strong> en línea
        </span>
      </div>
      <div className="visitor-row">
        <span className="visitor-dot total-dot" />
        <span className="visitor-label">
          <strong>{(total ?? 0).toLocaleString('es-CL')}</strong> visitas totales
        </span>
      </div>
    </div>
  );
}
