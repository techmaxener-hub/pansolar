import { NextResponse } from 'next/server';
import { validateGstin, extractStateCodeFromGstin } from '@solaros/solar-engine';

export async function POST(request: Request) {
  const { gstin } = (await request.json()) as { gstin?: string };
  if (!gstin) {
    return NextResponse.json({ error: 'gstin is required.' }, { status: 400 });
  }

  const result = validateGstin(gstin);
  return NextResponse.json({
    ...result,
    stateCode: result.valid ? extractStateCodeFromGstin(gstin) : null,
  });
}
