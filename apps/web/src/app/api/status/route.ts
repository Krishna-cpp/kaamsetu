import { integrationStatus } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(integrationStatus());
}
