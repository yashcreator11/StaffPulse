import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { searchParams } = new URL(req.url);
  const next = searchParams.get('next') || '/';
  const url = new URL(next, req.url);
  return NextResponse.redirect(url);
}
