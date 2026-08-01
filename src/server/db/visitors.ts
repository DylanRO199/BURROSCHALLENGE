import 'server-only';
import { and, count, gt, sql } from 'drizzle-orm';
import { db } from './client';
import { visitors } from './schema';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function upsertVisitor(sessionId: string): Promise<{ active: number; total: number }> {
  const now = new Date();

  await db
    .insert(visitors)
    .values({ sessionId, firstSeenAt: now, lastSeenAt: now })
    .onConflictDoUpdate({
      target: visitors.sessionId,
      set: { lastSeenAt: now },
    });

  const activeThreshold = new Date(now.getTime() - ACTIVE_WINDOW_MS);

  const [activeResult, totalResult] = await Promise.all([
    db
      .select({ value: count() })
      .from(visitors)
      .where(gt(visitors.lastSeenAt, activeThreshold)),
    db.select({ value: count() }).from(visitors),
  ]);

  return {
    active: activeResult[0]?.value ?? 0,
    total: totalResult[0]?.value ?? 0,
  };
}
