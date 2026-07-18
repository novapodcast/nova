"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../lib/i18n';

interface PricingTier {
  id: string;
  plan_name: string;
  display_name_en: string;
  display_name_rw: string;
  duration_months: number;
  price_rwf: number;
  savings_rwf: number;
  features_en: string[];
  features_rw: string[];
  is_highlighted: boolean;
  is_active: boolean;
  sort_order: number;
}

export default function AdminPricingPage() {
  const { language } = useLanguage();
  const { loading: guardLoading, authorized } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PricingTier>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [allowlistOnly, setAllowlistOnly] = useState(false);

  const invalidatePricingCaches = (tierId?: string) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem('pricing_tiers_v1');
    if (tierId) {
      window.sessionStorage.removeItem(`dash_tier_${tierId}`);
    }
  };

  useEffect(() => {
    if (authorized) {
      setLoading(false);
      loadTiers();
    }
  }, [authorized]);

  const loadTiers = async () => {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('plan_name', { ascending: true });
    if (!error && data) {
      setTiers(data as PricingTier[]);
    }
  };

  const startEdit = (tier: PricingTier) => {
    setEditingId(tier.id);
    setEditForm(tier);
    setMessage(null);
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setMessage(null);
    setSaveError(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    setSaving(true);
    setMessage(null);
    setSaveError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/admin/pricing/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }

      invalidatePricingCaches(editingId);
      setMessage({ type: 'success', text: 'Pricing tier updated successfully!' });
      setEditingId(null);
      setEditForm({});
      loadTiers();
    } catch (e: any) {
      setSaveError(e?.message || 'Failed to save');
      setMessage({ type: 'error', text: `Failed to save: ${e?.message || 'Unknown error'}` });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tier: PricingTier) => {
    const { error } = await supabase
      .from('pricing_tiers')
      .update({ is_active: !tier.is_active })
      .eq('id', tier.id);

    if (!error) {
      invalidatePricingCaches(tier.id);
      loadTiers();
      setMessage({ type: 'success', text: `${tier.plan_name} ${!tier.is_active ? 'activated' : 'deactivated'}` });
    } else {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    }
  };

  if (guardLoading || !authorized || loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">Checking access…</div>
      </div>
    );
  }

  const familyOf = (tier: PricingTier) => {
    const base = tier.plan_name?.split('_')[0]?.trim();
    return base || tier.display_name_en || tier.display_name_rw || tier.plan_name;
  };

  const grouped = tiers.reduce((acc, t) => {
    const fam = familyOf(t);
    if (!acc[fam]) acc[fam] = {} as { monthly?: PricingTier; annual?: PricingTier; other?: PricingTier[] };
    if (t.duration_months === 1) acc[fam].monthly = t;
    else if (t.duration_months === 12) acc[fam].annual = t;
    else {
      acc[fam].other = acc[fam].other ? [...acc[fam].other!, t] : [t];
    }
    return acc;
  }, {} as Record<string, { monthly?: PricingTier; annual?: PricingTier; other?: PricingTier[] }>);

  const planOrder = ['Basic', 'Pro', 'Premium'];
  const families = Object.keys(grouped).sort((a, b) => {
    const ia = planOrder.indexOf(a);
    const ib = planOrder.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="container py-12 md:py-16">
      {allowlistOnly && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          <div className="flex items-center justify-between gap-3">
            <div>Complete admin setup for your account.</div>
            <button
              onClick={async () => {
                try {
                  const { data: s } = await supabase.auth.getSession();
                  const tok = s.session?.access_token;
                  if (!tok) throw new Error('Not authenticated');
                  const r = await fetch('/api/admin/users/promote-self', { method: 'POST', headers: { Authorization: `Bearer ${tok}` } });
                  if (!r.ok) throw new Error('Request failed');
                  setAllowlistOnly(false);
                  setMessage({ type: 'success', text: 'Admin role enabled.' });
                } catch (e: any) {
                  setMessage({ type: 'error', text: e?.message || 'Failed to enable admin' });
                }
              }}
              className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20"
            >
              Finalize admin role
            </button>
          </div>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('admin.pricingManagement', language)}</h1>
        <p className="text-muted">{t('admin.pricingSubtitle', language)}</p>
      </div>

      <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <h3 className="text-sm font-semibold text-blue-400 mb-2">💡 Pricing Structure</h3>
        <ul className="text-sm text-blue-300 space-y-1">
          <li>• Each plan has <strong>two variants</strong>: Monthly (1m) and Annual (12m)</li>
          <li>• <strong>Monthly</strong>: Users pay per month (e.g., 1,500 RWF/month)</li>
          <li>• <strong>Annual</strong>: Users pay once per year, typically with 25% discount (e.g., 13,500 RWF/year = 1,125 RWF/month)</li>
          <li>• Edit each variant separately to set different prices and features</li>
          <li>• The public pricing page shows both options with a Monthly/Annual toggle</li>
        </ul>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {families.map((fam) => {
          const g = grouped[fam];
          const variants: Array<{ label: string; tier?: PricingTier }> = [
            { label: 'Monthly', tier: g.monthly },
            { label: 'Annual', tier: g.annual },
          ];
          return (
            <div key={fam} className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
              <h2 className="text-2xl font-bold mb-4">{fam}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {variants.map(({ label, tier }) => (
                  <div key={label} className="rounded-lg border border-white/10 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-0.5 rounded bg-white/5">{label}</span>
                        {tier?.is_highlighted && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{t('admin.mostPopular', language)}</span>
                        )}
                        {tier && !tier.is_active && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">{t('admin.inactive', language)}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {tier && (
                          <>
                            <button onClick={() => startEdit(tier)} className="px-3 py-1.5 text-sm rounded-md bg-white/5 hover:bg-white/10">
                              {t('admin.edit', language)}
                            </button>
                            <button onClick={() => toggleActive(tier)} className="px-3 py-1.5 text-sm rounded-md border border-white/10 hover:border-white/30">
                              {tier.is_active ? t('admin.deactivate', language) : t('admin.activate', language)}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {tier ? (
                      editingId === tier.id ? (
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm mb-1">{t('admin.planName', language)} (EN)</label>
                              <input type="text" value={editForm.display_name_en || ''} onChange={(e) => setEditForm({ ...editForm, display_name_en: e.target.value })} className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2" />
                            </div>
                            <div>
                              <label className="block text-sm mb-1">{t('admin.planName', language)} (RW)</label>
                              <input type="text" value={editForm.display_name_rw || ''} onChange={(e) => setEditForm({ ...editForm, display_name_rw: e.target.value })} className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2" />
                            </div>
                            <div>
                              <label className="block text-sm mb-1">{t('admin.price', language)} (RWF)</label>
                              <input type="number" value={editForm.price_rwf || 0} onChange={(e) => setEditForm({ ...editForm, price_rwf: parseInt(e.target.value) || 0 })} className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2" />
                            </div>
                            <div>
                              <label className="block text-sm mb-1">{t('admin.savings', language)} (RWF)</label>
                              <input type="number" value={editForm.savings_rwf || 0} onChange={(e) => setEditForm({ ...editForm, savings_rwf: parseInt(e.target.value) || 0 })} className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm mb-1">{t('admin.features', language)} (EN)</label>
                            <textarea value={(editForm.features_en || []).join('\n')} onChange={(e) => setEditForm({ ...editForm, features_en: e.target.value.split('\n').filter(Boolean) })} className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 h-24" />
                          </div>
                          <div>
                            <label className="block text-sm mb-1">{t('admin.features', language)} (RW)</label>
                            <textarea value={(editForm.features_rw || []).join('\n')} onChange={(e) => setEditForm({ ...editForm, features_rw: e.target.value.split('\n').filter(Boolean) })} className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 h-24" />
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={editForm.is_highlighted || false} onChange={(e) => setEditForm({ ...editForm, is_highlighted: e.target.checked })} className="rounded" />
                              <span className="text-sm">{t('admin.highlighted', language)}</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={editForm.is_active !== false} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} className="rounded" />
                              <span className="text-sm">{t('admin.active', language)}</span>
                            </label>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={saveEdit} disabled={saving} className="px-4 py-2 rounded-md bg-primary text-black font-semibold hover:opacity-90 disabled:opacity-50">
                              {saving ? t('admin.saving', language) : t('admin.save', language)}
                            </button>
                            <button onClick={cancelEdit} className="px-4 py-2 rounded-md border border-white/10 hover:border-white/30">
                              {t('admin.cancel', language)}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-2">
                            <span className="text-2xl font-bold">{tier.price_rwf.toLocaleString()} RWF</span>
                            {tier.duration_months === 1 && <span className="text-muted ml-2">per month</span>}
                            {tier.duration_months === 12 && (
                              <>
                                <span className="text-muted ml-2">per year</span>
                                <span className="text-sm text-primary ml-3">({Math.round(tier.price_rwf / 12).toLocaleString()} RWF/mo)</span>
                              </>
                            )}
                          </div>
                          <div className="text-sm text-muted">
                            <strong>Features:</strong> {tier.features_en.join(', ')}
                          </div>
                        </>
                      )
                    ) : (
                      <div className="text-sm text-muted">No {label.toLowerCase()} variant found for {fam}. Create and activate a {label.toLowerCase()} tier in the pricing_tiers table.</div>
                    )}
                  </div>
                ))}
              </div>
              {grouped[fam].other && grouped[fam].other!.length > 0 && (
                <div className="mt-4 text-xs text-muted">Other variants: {grouped[fam].other!.map(o => `${o.duration_months}m`).join(', ')}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <p className="text-sm text-blue-400">
          <strong>{t('admin.note', language)}:</strong> {t('admin.pricingNote', language)}
        </p>
      </div>
    </div>
  );
}
