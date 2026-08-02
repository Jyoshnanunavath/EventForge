import { useState } from 'react';
import { User, Mail, Building2, Phone, Save, Image } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui';
import { initials } from '@/lib/utils';

export function SettingsPage() {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    company: profile?.company || '',
    phone: profile?.phone || '',
    avatar_url: profile?.avatar_url || '',
    bio: profile?.bio || '',
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateProfile(form);
    setSaving(false);
    if (error) toast(error, 'error');
    else toast('Profile updated successfully');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-neutral-900">Settings</h1><p className="text-sm text-neutral-500 mt-0.5">Manage your profile and preferences</p></div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xl font-bold">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full rounded-full object-cover" /> : initials(profile?.full_name || 'U')}
          </div>
          <div>
            <h2 className="font-bold text-neutral-900">{profile?.full_name}</h2>
            <p className="text-sm text-neutral-500 capitalize">{profile?.role}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input className="input pl-10" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input className="input pl-10 bg-neutral-50" disabled value={profile?.id || ''} /></div>
            <p className="text-xs text-neutral-400 mt-1">Email cannot be changed</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Company</label>
              <div className="relative"><Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input className="input pl-10" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Inc." /></div>
            </div>
            <div>
              <label className="label">Phone</label>
              <div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input className="input pl-10" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555-0100" /></div>
            </div>
          </div>
          <div>
            <label className="label">Avatar URL</label>
            <div className="relative"><Image className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input className="input pl-10" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" /></div>
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea className="input min-h-[80px]" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself…" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : <><Save className="w-4 h-4" /> Save Changes</>}</button>
          </div>
        </form>
      </div>

      {/* Notification preferences */}
      <div className="card p-6">
        <h3 className="font-semibold text-neutral-900 mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { label: 'Booking confirmations', desc: 'Get notified when you book a ticket', defaultChecked: true },
            { label: 'Event reminders', desc: 'Reminders before your events start', defaultChecked: true },
            { label: 'New event announcements', desc: 'Be the first to know about new events', defaultChecked: false },
            { label: 'Speaker updates', desc: 'Updates when speakers are announced', defaultChecked: true },
          ].map((p) => (
            <div key={p.label} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50">
              <div><p className="text-sm font-medium text-neutral-900">{p.label}</p><p className="text-xs text-neutral-500">{p.desc}</p></div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={p.defaultChecked} className="sr-only peer" />
                <div className="w-11 h-6 bg-neutral-200 rounded-full peer peer-checked:bg-primary-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
