import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.RIOT_API_KEY || '';
  const cleanKey = key.replace(/^['"]|['"]$/g, '').trim();

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    keyDiagnostics: {
      hasKey: !!key,
      length: key.length,
      startsWithQuote: key.startsWith('"') || key.startsWith("'"),
      endsWithQuote: key.endsWith('"') || key.endsWith("'"),
      hasWhitespace: /\s/.test(key),
      firstFive: key.substring(0, 8),
      lastFive: key.substring(key.length - 5),
    },
    cleanKeyDiagnostics: {
      length: cleanKey.length,
      firstFive: cleanKey.substring(0, 8),
      lastFive: cleanKey.substring(cleanKey.length - 5),
    }
  });
}
