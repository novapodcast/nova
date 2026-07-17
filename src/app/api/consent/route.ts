import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const authz = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authz?.startsWith('Bearer ') ? authz.substring('Bearer '.length) : undefined;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userRes.user.id;

    // Fetch all active consent types
    const { data: consentTypes } = await userClient
      .from('consent_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // Fetch user's existing consents
    const { data: userConsents } = await userClient
      .from('user_consents')
      .select('*, consent_type_id, accepted, accepted_at, legal_document_id')
      .eq('user_id', userId);

    // Fetch active legal documents
    const adminClient = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }) : userClient;

    const { data: legalDocs } = await adminClient
      .from('legal_documents')
      .select('*')
      .eq('is_active', true)
      .order('effective_date', { ascending: false });

    // Build response
    const consentMap = new Map();
    (userConsents || []).forEach((uc: any) => {
      consentMap.set(uc.consent_type_id, uc);
    });

    const latestLegalDocs = new Map<string, any>();
    (legalDocs || []).forEach((doc: any) => {
      if (!latestLegalDocs.has(doc.doc_type)) {
        latestLegalDocs.set(doc.doc_type, doc);
      }
    });

    const result = (consentTypes || []).map((ct: any) => {
      const userConsent = consentMap.get(ct.id);
      return {
        id: ct.id,
        code: ct.code,
        display_name_en: ct.display_name_en,
        display_name_rw: ct.display_name_rw,
        is_required: ct.is_required,
        is_toggle: ct.is_toggle,
        description_en: ct.description_en,
        description_rw: ct.description_rw,
        sort_order: ct.sort_order,
        accepted: userConsent?.accepted || false,
        accepted_at: userConsent?.accepted_at || null,
        legal_document_id: userConsent?.legal_document_id || null,
      };
    });

    return NextResponse.json({
      consents: result,
      legal_documents: Object.fromEntries(latestLegalDocs),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const authz = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authz?.startsWith('Bearer ') ? authz.substring('Bearer '.length) : undefined;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userRes.user.id;
    const body = await request.json();
    const { consents } = body as { consents: Array<{ consent_type_id: string; accepted: boolean; legal_document_id?: string }> };

    if (!consents || !Array.isArray(consents)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const ua = request.headers.get('user-agent') || null;

    // Upsert each consent
    const adminClient = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }) : userClient;

    for (const c of consents) {
      const payload = {
        user_id: userId,
        consent_type_id: c.consent_type_id,
        legal_document_id: c.legal_document_id || null,
        accepted: c.accepted,
        accepted_at: c.accepted ? new Date().toISOString() : null,
        ip_address: ip,
        user_agent: ua,
        updated_at: new Date().toISOString(),
      };

      const { error } = await adminClient
        .from('user_consents')
        .upsert(payload, { onConflict: 'user_id,consent_type_id,legal_document_id' });

      if (error) {
        console.error('Consent upsert error:', error);
      }
    }

    // Verify required consents are accepted
    const { data: requiredTypes } = await adminClient
      .from('consent_types')
      .select('id, code')
      .eq('is_required', true)
      .eq('is_active', true);

    const requiredIds = (requiredTypes || []).map((t: any) => t.id);
    const submittedRequired = consents.filter(c => requiredIds.includes(c.consent_type_id) && c.accepted);

    const allRequiredAccepted = requiredIds.length === submittedRequired.length;

    return NextResponse.json({
      ok: true,
      all_required_accepted: allRequiredAccepted,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
