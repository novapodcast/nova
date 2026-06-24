"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAdminGuard } from '@/lib/useAdminGuard';

type Category = {
  id?: string;
  slug: string;
  name_en: string;
  name_rw: string;
  color: string;
  sort_order: number;
  is_active: boolean;
};

export default function AdminCategoriesPage() {
  const { loading: guardLoading, authorized } = useAdminGuard();
  const [cats, setCats] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (authorized) fetchCats(); }, [authorized]);

  async function fetchCats() {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    setCats(data || []);
    setLoading(false);
  }

  function startNew() {
    setEditing({ slug: '', name_en: '', name_rw: '', color: '#22c55e', sort_order: cats.length, is_active: true });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await supabase.from('categories').update(editing).eq('id', editing.id);
      } else {
        await supabase.from('categories').insert(editing);
      }
      await fetchCats();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this category?')) return;
    await supabase.from('categories').delete().eq('id', id);
    await fetchCats();
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
        <h1 className="text-2xl font-bold">Categories</h1>
        <button onClick={startNew} className="px-4 py-2 bg-primary text-black rounded-lg">+ New Category</button>
      </div>

      {loading && <div className="text-muted">Loading…</div>}

      {!loading && (
        <div className="space-y-3 mb-8">
          {cats.map((c) => (
            <div key={c.id} className="bg-[var(--surface)] p-4 rounded-lg border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: c.color }} />
                <div>
                  <div className="font-semibold">{c.name_rw} / {c.name_en}</div>
                  <div className="text-xs text-muted">slug: {c.slug} · order {c.sort_order} · {c.is_active ? 'Active' : 'Inactive'}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(c)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Edit</button>
                <button onClick={() => remove(String(c.id))} className="px-3 py-1 text-sm bg-red-600 text-white rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="bg-[var(--surface)] p-6 rounded-lg border border-white/10 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm">Slug</label>
              <input value={editing.slug} onChange={(e)=>setEditing({...editing!, slug:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div>
              <label className="text-sm">Name (EN)</label>
              <input value={editing.name_en} onChange={(e)=>setEditing({...editing!, name_en:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div>
              <label className="text-sm">Name (RW)</label>
              <input value={editing.name_rw} onChange={(e)=>setEditing({...editing!, name_rw:e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div>
              <label className="text-sm">Color</label>
              <input type="color" value={editing.color} onChange={(e)=>setEditing({...editing!, color:e.target.value})} className="w-full h-10 rounded"/>
            </div>
            <div>
              <label className="text-sm">Sort Order</label>
              <input type="number" value={editing.sort_order} onChange={(e)=>setEditing({...editing!, sort_order:Number(e.target.value)})} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded"/>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={editing.is_active} onChange={(e)=>setEditing({...editing!, is_active:e.target.checked})} />
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
