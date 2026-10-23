import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      fullName,
      email,
      companyName,
      employeeCount,
      phone,
      hardwareBrand,
      preferredSlot,
      notes,
    } = body;

    if (!fullName || !email || !companyName || !employeeCount) {
      return NextResponse.json(
        { error: 'Full name, corporate email, company name, and team size are required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid work email address.' },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(url, key);

    const { data, error } = await supabase
      .from('demo_requests')
      .insert({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        company_name: companyName.trim(),
        employee_count: employeeCount,
        phone: phone ? phone.trim() : null,
        hardware_brand: hardwareBrand ? hardwareBrand.trim() : null,
        preferred_slot: preferredSlot ? preferredSlot.trim() : null,
        notes: notes ? notes.trim() : null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[API Demo Request] Supabase insert failed:', error);
      return NextResponse.json({ error: 'Failed to record demo request.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Our solutions specialist will reach out to schedule your live walkthrough.',
      id: data.id,
    });
  } catch (err: unknown) {
    console.error('[API Demo Request] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
