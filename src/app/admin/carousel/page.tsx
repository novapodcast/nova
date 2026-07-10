"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAdminGuard } from '@/lib/useAdminGuard';

type Slide = {
  id?: string;
  title_en: string;
  title_rw: string;
  subtitle_en?: string | null;
  subtitle_rw?: string | null;
  description_en?: string | null;
  description_rw?: string | null;
  cta_label_en?: string | null;
  cta_label_rw?: string | null;
  cta_url?: string | null;
  background_image_url?: string | null;
  background_color?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  start_at?: string | null;
  end_at?: string | null;
};

export default function AdminCarouselPage() {
  const { loading: guardLoading, authorized } = useAdminGuard();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [editing, setEditing] = useState<Slide | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authorized) fetchSlides();
  }, [authorized]);

  async function fetchSlides() {
    setLoading(true);
    const { data } = await supabase
      .from('carousel_slides')
      .select('*')
      .order('sort_order', { ascending: true });
    setSlides(data || []);
    setLoading(false);
  }

  function startNew() {
    setEditing({
      title_en: '',
      title_rw: '',
      subtitle_en: '',
      subtitle_rw: '',
      description_en: '',
      description_rw: '',
      cta_label_en: 'Play Now',
      cta_label_rw: 'Tangira Kumva',
      cta_url: '/podcasts',
      background_color: '#0a0a0a',
      is_active: true,
      sort_order: slides.length,
    });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await supabase.from('carousel_slides').update(editing).eq('id', editing.id);
      } else {
        await supabase.from('carousel_slides').insert(editing);
      }
      await fetchSlides();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this slide?')) return;
    await supabase.from('carousel_slides').delete().eq('id', id);
    await fetchSlides();
  }

  if (guardLoading || !authorized) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">Checking access…</div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Hero Carousel</h1>
        <button onClick={startNew} className="px-4 py-2 bg-primary text-black rounded-lg">+ New Slide</button>
      </div>

      {loading && <div className="text-muted">Loading…</div>}

      {!loading && (
        <div className="space-y-3 mb-8">
          {slides.map((s) => (
            <div key={s.id} className="bg-[var(--surface)] p-4 rounded-lg border border-white/10 flex items-center justify-between">
              <div>
                <div className="font-semibold">{s.title_en} / {s.title_rw}</div>
                <div className="text-xs text-muted">{s.subtitle_en} · order {s.sort_order} · {s.is_active ? 'Active' : 'Inactive'}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(s)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Edit</button>
                <button onClick={() => remove(String(s.id))} className="px-3 py-1 text-sm bg-red-600 text-white rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="bg-[var(--surface)] p-6 rounded-lg border border-white/10 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Title (EN)</label>
              <input value={editing.title_en} onChange={(e)=>setEditing({...editing!, title_en:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div>
              <label className="text-sm">Title (RW)</label>
              <input value={editing.title_rw} onChange={(e)=>setEditing({...editing!, title_rw:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div>
              <label className="text-sm">Subtitle (EN)</label>
              <input value={editing.subtitle_en||''} onChange={(e)=>setEditing({...editing!, subtitle_en:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div>
              <label className="text-sm">Subtitle (RW)</label>
              <input value={editing.subtitle_rw||''} onChange={(e)=>setEditing({...editing!, subtitle_rw:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Description (EN)</label>
              <textarea value={editing.description_en||''} onChange={(e)=>setEditing({...editing!, description_en:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded" rows={3}/>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Description (RW)</label>
              <textarea value={editing.description_rw||''} onChange={(e)=>setEditing({...editing!, description_rw:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded" rows={3}/>
            </div>
            <div>
              <label className="text-sm">CTA Label (EN)</label>
              <input value={editing.cta_label_en||''} onChange={(e)=>setEditing({...editing!, cta_label_en:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div>
              <label className="text-sm">CTA Label (RW)</label>
              <input value={editing.cta_label_rw||''} onChange={(e)=>setEditing({...editing!, cta_label_rw:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">CTA URL</label>
              <input value={editing.cta_url||''} onChange={(e)=>setEditing({...editing!, cta_url:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div>
              <label className="text-sm">Background Color</label>
              <input value={editing.background_color||''} onChange={(e)=>setEditing({...editing!, background_color:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div>
              <label className="text-sm">Background Image URL</label>
              <input value={editing.background_image_url||''} onChange={(e)=>setEditing({...editing!, background_image_url:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div>
              <label className="text-sm">Sort Order</label>
              <input type="number" value={editing.sort_order||0} onChange={(e)=>setEditing({...editing!, sort_order: Number(e.target.value)})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={!!editing.is_active} onChange={(e)=>setEditing({...editing!, is_active:e.target.checked})} />
              <span className="text-sm">Active</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-black rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={()=>setEditing(null)} className="px-4 py-2 bg-white/10 rounded-lg">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
