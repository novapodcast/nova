"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';
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
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PricingTier>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const email = data.user?.email ?? null;
      if (!email || !isAdminEmail(email)) {
        router.replace('/dashboard');
        return;
      }
      setLoading(false);
      loadTiers();
    });
    return () => { active = false; };
  }, [router]);

  const loadTiers = async () => {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (!error && data) {
      setTiers(data as PricingTier[]);
    }
  };

  const startEdit = (tier: PricingTier) => {
    setEditingId(tier.id);
    setEditForm(tier);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setMessage(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('pricing_tiers')
      .update({
        display_name_en: editForm.display_name_en,
        display_name_rw: editForm.display_name_rw,
        price_rwf: editForm.price_rwf,
        savings_rwf: editForm.savings_rwf,
        features_en: editForm.features_en,
        features_rw: editForm.features_rw,
        is_highlighted: editForm.is_highlighted,
        is_active: editForm.is_active,
      })
      .eq('id', editingId);

    setSaving(false);

    if (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: 'Pricing tier updated successfully!' });
      setEditingId(null);
      setEditForm({});
      loadTiers();
    }
  };

  const toggleActive = async (tier: PricingTier) => {
    const { error } = await supabase
      .from('pricing_tiers')
      .update({ is_active: !tier.is_active })
      .eq('id', tier.id);

    if (!error) {
      loadTiers();
      setMessage({ type: 'success', text: `${tier.plan_name} ${!tier.is_active ? 'activated' : 'deactivated'}` });
    } else {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    }
  };

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">Checking access…</div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('admin.pricingManagement', language)}</h1>
        <p className="text-muted">{t('admin.pricingSubtitle', language)}</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {tiers.map((tier) => (
          <div key={tier.id} className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
            {editingId === tier.id ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">{t('admin.planName', language)} (EN)</label>
                    <input
                      type="text"
                      value={editForm.display_name_en || ''}
                      onChange={(e) => setEditForm({ ...editForm, display_name_en: e.target.value })}
                      className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">{t('admin.planName', language)} (RW)</label>
                    <input
                      type="text"
                      value={editForm.display_name_rw || ''}
                      onChange={(e) => setEditForm({ ...editForm, display_name_rw: e.target.value })}
                      className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">{t('admin.price', language)} (RWF)</label>
                    <input
                      type="number"
                      value={editForm.price_rwf || 0}
                      onChange={(e) => setEditForm({ ...editForm, price_rwf: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">{t('admin.savings', language)} (RWF)</label>
                    <input
                      type="number"
                      value={editForm.savings_rwf || 0}
                      onChange={(e) => setEditForm({ ...editForm, savings_rwf: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">{t('admin.features', language)} (EN)</label>
                  <textarea
                    value={(editForm.features_en || []).join('\n')}
                    onChange={(e) => setEditForm({ ...editForm, features_en: e.target.value.split('\n').filter(Boolean) })}
                    className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 h-24"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t('admin.features', language)} (RW)</label>
                  <textarea
                    value={(editForm.features_rw || []).join('\n')}
                    onChange={(e) => setEditForm({ ...editForm, features_rw: e.target.value.split('\n').filter(Boolean) })}
                    className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 h-24"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_highlighted || false}
                      onChange={(e) => setEditForm({ ...editForm, is_highlighted: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">{t('admin.highlighted', language)}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_active !== false}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">{t('admin.active', language)}</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="px-4 py-2 rounded-md bg-primary text-black font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? t('admin.saving', language) : t('admin.save', language)}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 rounded-md border border-white/10 hover:border-white/30"
                  >
                    {t('admin.cancel', language)}
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="flex items-start justify-between">
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{tier.display_name_en}</h3>
                    <span className="text-sm text-muted">({tier.plan_name})</span>
                    {tier.is_highlighted && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{t('admin.mostPopular', language)}</span>}
                    {!tier.is_active && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">{t('admin.inactive', language)}</span>}
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-bold">{tier.price_rwf.toLocaleString()} RWF</span>
                    {tier.duration_months > 0 && <span className="text-muted ml-2">/ {tier.duration_months} month{tier.duration_months > 1 ? 's' : ''}</span>}
                    {tier.savings_rwf > 0 && <span className="text-green-400 ml-3 text-sm">Save {tier.savings_rwf} RWF</span>}
                  </div>
                  <div className="text-sm text-muted">
                    <strong>Features:</strong> {tier.features_en.join(', ')}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => startEdit(tier)}
                    className="px-3 py-1.5 text-sm rounded-md bg-white/5 hover:bg-white/10"
                  >
                    {t('admin.edit', language)}
                  </button>
                  <button
                    onClick={() => toggleActive(tier)}
                    className="px-3 py-1.5 text-sm rounded-md border border-white/10 hover:border-white/30"
                  >
                    {tier.is_active ? t('admin.deactivate', language) : t('admin.activate', language)}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <p className="text-sm text-blue-400">
          <strong>{t('admin.note', language)}:</strong> {t('admin.pricingNote', language)}
        </p>
      </div>
    </div>
  );
}
