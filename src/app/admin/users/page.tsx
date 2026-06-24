"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAdminGuard } from '@/lib/useAdminGuard';

type User = {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  subscription_status?: string;
  plan_name?: string;
};

export default function AdminUsersPage() {
  const { loading: guardLoading, authorized } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');

  useEffect(() => {
    if (authorized) {
      fetchUsers();
      setLoading(false);
    }
  }, [authorized]);

  async function fetchUsers() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const res = await fetch('/api/admin/users/list', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  }

  async function toggleAdminRole(userId: string, currentIsAdmin: boolean) {
    if (!confirm(`${currentIsAdmin ? 'Remove' : 'Grant'} admin access?`)) return;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const res = await fetch('/api/admin/users/toggle-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, isAdmin: !currentIsAdmin }),
    });

    if (res.ok) {
      await fetchUsers();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to update user');
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      filterRole === 'all' ||
      (filterRole === 'admin' && user.is_admin) ||
      (filterRole === 'user' && !user.is_admin);
    return matchesSearch && matchesRole;
  });

  if (guardLoading || !authorized || loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">{guardLoading ? 'Checking access…' : 'Loading users…'}</div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <h1 className="text-3xl font-bold mb-2">User Management</h1>
      <p className="text-muted mb-8">Manage users and permissions</p>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="🔍 Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as any)}
          className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
        >
          <option value="all">All Users</option>
          <option value="admin">Admins Only</option>
          <option value="user">Regular Users</option>
        </select>
      </div>

      <div className="bg-[var(--surface)] rounded-xl ring-1 ring-white/5 overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Subscription</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Joined</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-white/5 transition">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-white">{user.full_name || 'No name'}</div>
                    <div className="text-sm text-muted">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {user.is_admin ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary">Admin</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-white/10 text-muted">User</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-muted">
                  {user.subscription_status === 'active' ? (
                    <span className="text-green-400">{user.plan_name || 'Active'}</span>
                  ) : (
                    <span>Free</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-muted">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => toggleAdminRole(user.id, user.is_admin)}
                    className="px-3 py-1 text-xs font-semibold rounded bg-white/10 hover:bg-white/20 transition"
                  >
                    {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 text-muted">
          {searchQuery || filterRole !== 'all' ? 'No users match your filters.' : 'No users yet.'}
        </div>
      )}

      <div className="mt-6 text-sm text-muted">
        Total: {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
