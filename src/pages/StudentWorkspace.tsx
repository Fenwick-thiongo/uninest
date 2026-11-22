import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, FileText, Heart, Search, Shield } from 'lucide-react';
import { WorkspaceShell } from '../components/Layout';
import { PropertyCard } from '../components/PropertyCard';
import { apiFetch, formatDateShort, formatKes, KENYAN_TOWNS } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Enquiry, Property, ViewingRequest } from '../types';

export function StudentDashboardPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<Property[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);
  const [recommended, setRecommended] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ properties: Property[] }>('/api/properties/saved/mine'),
      apiFetch<{ enquiries: Enquiry[] }>('/api/properties/enquiries/mine'),
      apiFetch<{ viewings: ViewingRequest[] }>('/api/properties/viewings/mine'),
      apiFetch<{ properties: Property[] }>(
        `/api/properties?limit=3${user?.profile?.preferred_town ? `&town=${encodeURIComponent(user.profile.preferred_town)}` : ''}`
      ),
    ])
      .then(([s, e, v, r]) => {
        setSaved(s.properties);
        setEnquiries(e.enquiries);
        setViewings(v.viewings);
        setRecommended(r.properties);
      })
      .finally(() => setLoading(false));
  }, [user?.profile?.preferred_town]);

  const profileFields = [
    user?.full_name,
    user?.phone,
    user?.studentProfile?.institution,
    user?.studentProfile?.campus,
    user?.studentProfile?.course,
    user?.profile?.preferred_town,
  ];
  const completionPct = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  return (
    <WorkspaceShell
      title={`Karibu, ${user?.full_name.split(' ')[0]}`}
      subtitle="Track your saved accommodation, enquiries, and scheduled property viewings."
      action={
        <Link
          to="/find-a-house"
          className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-bold hover:bg-[#123b2a] inline-flex items-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Find a House</span>
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Metrics + Profile Completion */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5 space-y-1">
            <p className="text-xs font-semibold text-[#414844]">Saved Properties</p>
            <p className="text-2xl font-extrabold text-[#002517] tabular-nums">{saved.length}</p>
            <Link to="/student/saved" className="text-xs font-semibold text-[#296a46] hover:underline">
              View saved list →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5 space-y-1">
            <p className="text-xs font-semibold text-[#414844]">Active Enquiries</p>
            <p className="text-2xl font-extrabold text-[#002517] tabular-nums">{enquiries.length}</p>
            <Link to="/student/enquiries" className="text-xs font-semibold text-[#296a46] hover:underline">
              Track responses →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5 space-y-1">
            <p className="text-xs font-semibold text-[#414844]">Viewing Requests</p>
            <p className="text-2xl font-extrabold text-[#002517] tabular-nums">{viewings.length}</p>
            <Link to="/student/viewings" className="text-xs font-semibold text-[#296a46] hover:underline">
              Manage schedule →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#414844]">Profile Completion</span>
              <span className="font-bold text-[#002517] tabular-nums">{completionPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#effdf1] overflow-hidden border border-[#c1c8c2]/50">
              <div className="h-full bg-[#296a46]" style={{ width: `${completionPct}%` }} />
            </div>
            <Link to="/student/profile" className="block text-xs font-semibold text-[#296a46] hover:underline">
              Update campus profile →
            </Link>
          </div>
        </div>

        {/* Host Application Status Banner if present */}
        {user?.latestHostApplication && (
          <div className="rounded-2xl border border-[#c1c8c2] bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#296a46] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-[#002517]">
                  Host Application ({user.latestHostApplication.requested_role}) —{' '}
                  <span className="capitalize">{user.latestHostApplication.status}</span>
                </p>
                <p className="text-xs text-[#414844]">
                  Your student workspace remains active while your host application is reviewed.
                </p>
              </div>
            </div>
            <Link to="/apply-host" className="text-xs font-bold text-[#296a46] underline whitespace-nowrap">
              View application
            </Link>
          </div>
        )}

        {/* Recent Enquiries & Upcoming Viewings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#002517] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#296a46]" />
                <span>Recent Enquiries</span>
              </h2>
              <Link to="/student/enquiries" className="text-xs font-semibold text-[#296a46] hover:underline">
                See all
              </Link>
            </div>
            {loading ? (
              <p className="text-sm text-[#414844]">Loading enquiries...</p>
            ) : enquiries.length === 0 ? (
              <p className="text-sm text-[#414844]">No enquiries sent yet.</p>
            ) : (
              <div className="divide-y divide-[#c1c8c2]/50">
                {enquiries.slice(0, 3).map((enq) => (
                  <div key={enq.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#002517] truncate">{enq.property_title}</span>
                      <span className="capitalize font-semibold text-[#296a46]">{enq.status}</span>
                    </div>
                    <p className="text-xs text-[#414844] truncate">{enq.subject}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#002517] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#296a46]" />
                <span>Upcoming Viewings</span>
              </h2>
              <Link to="/student/viewings" className="text-xs font-semibold text-[#296a46] hover:underline">
                See all
              </Link>
            </div>
            {loading ? (
              <p className="text-sm text-[#414844]">Loading viewings...</p>
            ) : viewings.length === 0 ? (
              <p className="text-sm text-[#414844]">No viewing requests scheduled yet.</p>
            ) : (
              <div className="divide-y divide-[#c1c8c2]/50">
                {viewings.slice(0, 3).map((v) => (
                  <div key={v.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#002517] truncate">{v.property_title}</span>
                      <span className="capitalize font-semibold text-[#296a46]">{v.status}</span>
                    </div>
                    <p className="text-xs text-[#414844] tabular-nums">
                      {v.requested_date} at {v.requested_time} · {v.town}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Recommended Properties */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#002517]">
              Recommended{user?.profile?.preferred_town ? ` in ${user.profile.preferred_town}` : ''}
            </h2>
            <Link to="/find-a-house" className="text-xs font-semibold text-[#296a46] hover:underline">
              Browse all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommended.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

export function StudentSavedPage() {
  const [saved, setSaved] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(() => {
    setLoading(true);
    apiFetch<{ properties: Property[] }>('/api/properties/saved/mine')
      .then((res) => setSaved(res.properties))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  return (
    <WorkspaceShell title="Saved Properties" subtitle="Accommodation listings you bookmarked for comparison.">
      {loading ? (
        <p className="text-sm text-[#414844]">Loading saved properties...</p>
      ) : saved.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-10 text-center space-y-3">
          <Heart className="w-8 h-8 text-[#296a46] mx-auto" />
          <h2 className="text-lg font-bold text-[#002517]">No saved properties yet</h2>
          <p className="text-sm text-[#414844]">Save bedsitters, studios, or hostels while browsing Find a House.</p>
          <Link
            to="/find-a-house"
            className="inline-block px-5 py-2.5 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-semibold"
          >
            Browse Houses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {saved.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              onToggleSave={(_id, isSaved) => {
                if (!isSaved) setSaved((prev) => prev.filter((item) => item.id !== p.id));
              }}
            />
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

export function StudentEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ enquiries: Enquiry[] }>('/api/properties/enquiries/mine')
      .then((res) => setEnquiries(res.enquiries))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WorkspaceShell title="My Enquiries" subtitle="Track accommodation enquiries and replies from owners or caretakers.">
      {loading ? (
        <p className="text-sm text-[#414844]">Loading enquiries...</p>
      ) : enquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-10 text-center space-y-2">
          <h2 className="text-lg font-bold text-[#002517]">No enquiries sent yet</h2>
          <p className="text-sm text-[#414844]">Open any property listing to ask about rent, tokens, or semester availability.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enquiries.map((enq) => (
            <div key={enq.id} className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link to={`/properties/${enq.property_id}`} className="text-base font-bold text-[#002517] hover:underline">
                    {enq.property_title}
                  </Link>
                  <p className="text-xs text-[#414844] tabular-nums">
                    {enq.town} · {enq.monthly_rent_kes ? `${formatKes(enq.monthly_rent_kes)}/mo` : ''} · Sent{' '}
                    {formatDateShort(enq.created_at)}
                  </p>
                </div>
                <span className="text-xs font-bold capitalize px-3 py-1 rounded-lg bg-[#effdf1] border border-[#c1c8c2] text-[#002517]">
                  {enq.status}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#121e17]">{enq.subject}</p>
                <p className="text-sm text-[#414844]">{enq.message}</p>
              </div>

              {enq.host_reply && (
                <div className="p-4 rounded-xl bg-[#effdf1] border border-[#c1c8c2]/70 space-y-1">
                  <p className="text-xs font-bold text-[#296a46]">Host Reply</p>
                  <p className="text-sm text-[#121e17]">{enq.host_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

export function StudentViewingsPage() {
  const { notify } = useAuth();
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadViewings = useCallback(() => {
    setLoading(true);
    apiFetch<{ viewings: ViewingRequest[] }>('/api/properties/viewings/mine')
      .then((res) => setViewings(res.viewings))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadViewings();
  }, [loadViewings]);

  const handleCancel = async (id: string) => {
    try {
      await apiFetch(`/api/properties/viewings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      notify('Viewing request cancelled.', 'info');
      loadViewings();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to cancel.', 'error');
    }
  };

  return (
    <WorkspaceShell title="My Viewings" subtitle="Scheduled property inspections and host confirmations.">
      {loading ? (
        <p className="text-sm text-[#414844]">Loading viewing requests...</p>
      ) : viewings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-10 text-center space-y-2">
          <h2 className="text-lg font-bold text-[#002517]">No viewing requests yet</h2>
          <p className="text-sm text-[#414844]">Choose a property on Find a House to request an in-person inspection.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {viewings.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-[#c1c8c2] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <Link to={`/properties/${v.property_id}`} className="text-base font-bold text-[#002517] hover:underline">
                  {v.property_title}
                </Link>
                <p className="text-xs text-[#414844] tabular-nums">
                  Requested: {v.requested_date} at {v.requested_time} · {v.town}
                </p>
                {v.status === 'rescheduled' && v.proposed_date && (
                  <p className="text-xs font-semibold text-[#296a46] tabular-nums">
                    Proposed alternative: {v.proposed_date} at {v.proposed_time}
                  </p>
                )}
                {v.host_notes && <p className="text-xs text-[#414844]">Host note: {v.host_notes}</p>}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold capitalize px-3 py-1 rounded-lg bg-[#effdf1] border border-[#c1c8c2] text-[#002517]">
                  {v.status}
                </span>
                {(v.status === 'pending' || v.status === 'accepted' || v.status === 'rescheduled') && (
                  <button
                    type="button"
                    onClick={() => handleCancel(v.id)}
                    className="text-xs font-semibold text-red-700 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

export function StudentProfilePage() {
  const { user, refreshUser, notify } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [preferredTown, setPreferredTown] = useState(user?.profile?.preferred_town || 'Juja');
  const [institution, setInstitution] = useState(user?.studentProfile?.institution || '');
  const [campus, setCampus] = useState(user?.studentProfile?.campus || '');
  const [course, setCourse] = useState(user?.studentProfile?.course || '');
  const [yearOfStudy, setYearOfStudy] = useState(user?.studentProfile?.year_of_study || 'Year 1');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          phone,
          bio,
          preferredTown,
          institution,
          campus,
          course,
          yearOfStudy,
        }),
      });
      await refreshUser();
      notify('Student profile updated.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceShell title="Student Profile" subtitle="Keep your university, campus, and contact details current.">
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#c1c8c2] p-6 max-w-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#414844] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#414844] mb-1">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#414844] mb-1">University / College</label>
            <input
              type="text"
              required
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#414844] mb-1">Campus</label>
            <input
              type="text"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#414844] mb-1">Course</label>
            <input
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#414844] mb-1">Preferred Town</label>
            <select
              value={preferredTown}
              onChange={(e) => setPreferredTown(e.target.value)}
              className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
            >
              {KENYAN_TOWNS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#414844] mb-1">Year of Study</label>
          <select
            value={yearOfStudy}
            onChange={(e) => setYearOfStudy(e.target.value)}
            className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
          >
            <option value="Year 1">Year 1</option>
            <option value="Year 2">Year 2</option>
            <option value="Year 3">Year 3</option>
            <option value="Year 4">Year 4</option>
            <option value="Postgraduate">Postgraduate</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#414844] mb-1">About / Roommate Preferences</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </WorkspaceShell>
  );
}

export function AccountSettingsPage() {
  const { user, refreshUser, notify } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const getConsent = (channel: 'sms' | 'whatsapp' | 'email_marketing') =>
    Boolean(user?.notificationConsents?.find((c) => c.channel === channel)?.opted_in);

  const toggleConsent = async (channel: 'sms' | 'whatsapp' | 'email_marketing', optedIn: boolean) => {
    try {
      await apiFetch('/api/auth/notification-consents', {
        method: 'POST',
        body: JSON.stringify({ channel, optedIn }),
      });
      await refreshUser();
      notify(optedIn ? `Opted in to ${channel}.` : `Withdrew ${channel} consent.`, 'info');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update consent.', 'error');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPw(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      notify('Password updated successfully.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update password.', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <WorkspaceShell title="Settings & Notification Consent" subtitle="Manage account security and communication preferences.">
      <div className="max-w-2xl space-y-6">
        <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
          <h2 className="text-base font-bold text-[#002517]">Notification Consent Preferences</h2>
          <p className="text-xs text-[#414844]">
            External SMS/WhatsApp delivery activates only when a messaging provider is configured. You can opt in or withdraw consent at any time; every change is recorded in the consent audit log.
          </p>
          <div className="space-y-3">
            {(['sms', 'whatsapp', 'email_marketing'] as const).map((channel) => {
              const active = getConsent(channel);
              return (
                <div key={channel} className="flex items-center justify-between p-3 rounded-xl border border-[#c1c8c2]/70">
                  <div>
                    <p className="text-sm font-semibold text-[#121e17] uppercase">{channel.replace('_', ' ')}</p>
                    <p className="text-xs text-[#414844]">{active ? 'Currently opted in' : 'Not opted in'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleConsent(channel, !active)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border ${
                      active
                        ? 'bg-white border-red-300 text-red-700 hover:bg-red-50'
                        : 'bg-[#002517] border-[#002517] text-[#effdf1]'
                    }`}
                  >
                    {active ? 'Withdraw Consent' : 'Opt In'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
          <h2 className="text-base font-bold text-[#002517]">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-1">New Password (8+ chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingPw}
              className="px-5 py-2.5 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-bold disabled:opacity-50"
            >
              {savingPw ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>
      </div>
    </WorkspaceShell>
  );
}
