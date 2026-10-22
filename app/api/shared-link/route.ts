import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';

// ── DB-backed, expiring shared-link store ────────────────────────────────────
// Exclusively created by HR administrators with payload bounds & rate limiting.
// Token resolution (GET) uses service-role client for the token-gated manager view.

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RECORDS = 10000; // Maximum attendance records per shared link
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

// Simple in-memory rate limit: 15 creation requests per 60 seconds per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit = 15, windowMs = 60000): boolean {
  const now = Date.now();
  const state = rateLimitMap.get(key);
  if (!state || now > state.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (state.count >= limit) {
    return false;
  }
  state.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  // 1. Session & Role Verification (HR admins only)
  const employee = await getCurrentEmployee();
  if (!employee || (employee.role !== 'hr' && employee.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Unauthorized: only HR administrators can create shared links' }, { status: 403 });
  }

  // 2. Rate Limiting per employee
  if (!checkRateLimit(employee.id, 15, 60000)) {
    return NextResponse.json({ error: 'Rate limit exceeded: please wait before generating another link' }, { status: 429 });
  }

  // 3. Payload size and schema validation
  const rawText = await req.text();
  if (rawText.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'Payload too large (maximum 5MB)' }, { status: 413 });
  }

  let body: { records?: unknown[] } = {};
  try {
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || !Array.isArray(body.records)) {
    return NextResponse.json({ error: 'records array required' }, { status: 400 });
  }

  if (body.records.length > MAX_RECORDS) {
    return NextResponse.json({ error: `Too many records (maximum ${MAX_RECORDS} rows per link)` }, { status: 400 });
  }

  const supabase = createServiceClient();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  // Opportunity cleanup: opportunistically delete expired links
  try {
    await supabase.from('shared_links').delete().lte('expires_at', new Date().toISOString());
  } catch {
    // Non-blocking cleanup
  }

  const { data, error } = await supabase
    .from('shared_links')
    .insert({
      data: body.records,
      expires_at: expiresAt,
      created_by: employee.id,
    })
    .select('token')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create shared link' }, { status: 500 });
  }

  return NextResponse.json({ token: data.token, expiresAt });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('shared_links')
    .select('data, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!data || new Date(data.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'not found or expired' }, { status: 404 });
  }

  return NextResponse.json({ records: data.data });
}

export async function DELETE(req: NextRequest) {
  const employee = await getCurrentEmployee();
  if (!employee || (employee.role !== 'hr' && employee.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Unauthorized: only HR administrators can revoke shared links' }, { status: 403 });
  }

  const token = req.nextUrl.searchParams.get('token');
  const supabase = createServiceClient();

  if (token) {
    await supabase.from('shared_links').delete().eq('token', token);
    return NextResponse.json({ success: true, message: 'Shared link revoked' });
  }

  // If no specific token passed, delete all expired shared links
  const { count } = await supabase
    .from('shared_links')
    .delete({ count: 'exact' })
    .lte('expires_at', new Date().toISOString());

  return NextResponse.json({ success: true, revokedCount: count ?? 0 });
}
