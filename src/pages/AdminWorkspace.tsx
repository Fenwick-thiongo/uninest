import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  History,
  Save,
  Send,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import { WorkspaceShell } from '../components/Layout';
import { apiFetch, formatDateShort, formatKes } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PolicyDocumentBody } from './PolicyPage';
import type {
  AdminPolicyBundle,
  HostApplication,
  PolicyDocumentRecord,
  PolicyDocumentType,
  Property,
} from '../types';

interface AdminStats {
  totalUsers: number;
  students: number;
  owners: number;
  caretakers: number;
  admins: number;
  pendingApplications: number;
  pendingProperties: number;
  approvedProperties: number;
  rejectedProperties: number;
  openReports: number;
}

interface AuditEntry {
  id: string;
  actor_name: string | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata_json: string | null;
  created_at: string;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<AuditEntry[]>([]);

  useEffect(() => {
    apiFetch<{ stats: AdminStats; recentActivity: AuditEntry[] }>('/api/admin/stats')
      .then((res) => {
        setStats(res.stats);
        setActivity(res.recentActivity);
      })
      .catch(() => {});
  }, []);

  return (
    <WorkspaceShell title="Administration Overview" subtitle="Platform metrics, verification queues, and audit activity.">
      <div className="space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Users', val: stats?.totalUsers ?? 0 },
            { label: 'Students', val: stats?.students ?? 0 },
            { label: 'Property Owners', val: stats?.owners ?? 0 },
            { label: 'Resident Caretakers', val: stats?.caretakers ?? 0 },
            { label: 'Pending Applications', val: stats?.pendingApplications ?? 0, link: '/admin/applications' },
            { label: 'Pending Properties', val: stats?.pendingProperties ?? 0, link: '/admin/properties' },
            { label: 'Approved Listings', val: stats?.approvedProperties ?? 0 },
            { label: 'Rejected Listings', val: stats?.rejectedProperties ?? 0 },
            { label: 'Open Reports', val: stats?.openReports ?? 0, link: '/admin/moderation' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-[#c1c8c2] p-5 space-y-1">
              <p className="text-xs font-semibold text-[#414844]">{card.label}</p>
              <p className="text-2xl font-extrabold text-[#002517] tabular-nums">{card.val}</p>
              {card.link && (
                <Link to={card.link} className="text-xs font-semibold text-[#296a46] hover:underline">
                  Review queue →
                </Link>
              )}
            </div>
          ))}
        </div>

        <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#002517]">Recent Platform Audit Activity</h2>
            <Link to="/admin/audit-logs" className="text-xs font-semibold text-[#296a46] hover:underline">
              Full audit log →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#c1c8c2] text-[#414844]">
                  <th className="py-2 pr-4 font-semibold">Time</th>
                  <th className="py-2 pr-4 font-semibold">Actor</th>
                  <th className="py-2 pr-4 font-semibold">Action</th>
                  <th className="py-2 font-semibold">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c1c8c2]/40">
                {activity.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2.5 pr-4 tabular-nums text-[#414844]">{formatDateShort(entry.created_at)}</td>
                    <td className="py-2.5 pr-4 font-semibold text-[#002517]">{entry.actor_name || 'System'}</td>
                    <td className="py-2.5 pr-4 font-mono">{entry.action}</td>
                    <td className="py-2.5 text-[#414844]">{entry.entity_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

export function AdminApplicationsPage() {
  const { notify } = useAuth();
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [reviewNotesById, setReviewNotesById] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<{
    app: HostApplication;
    decision: 'approved' | 'rejected';
  } | null>(null);

  const load = useCallback(() => {
    apiFetch<{ applications: HostApplication[] }>('/api/admin/host-applications').then((res) =>
      setApplications(res.applications)
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const executeDecision = async () => {
    if (!confirmAction) return;
    const notes = reviewNotesById[confirmAction.app.id] || '';
    try {
      await apiFetch(`/api/admin/host-applications/${confirmAction.app.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          decision: confirmAction.decision,
          reviewNotes: notes,
        }),
      });
      notify(`Host application ${confirmAction.decision}.`, 'success');
      setConfirmAction(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Review failed.', 'error');
    }
  };

  return (
    <WorkspaceShell
      title="Host Applications"
      subtitle="Verify owner and caretaker applications. Approvals promote user role atomically while preserving existing account ID."
    >
      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-10 text-center space-y-2">
          <UserCheck className="w-8 h-8 text-[#296a46] mx-auto opacity-75" />
          <h2 className="text-lg font-bold text-[#002517]">No host applications yet</h2>
          <p className="text-sm text-[#414844]">
            Remember: Host application submission remains safely blocked until approved Host Terms and Community Standards are published in Platform Settings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-[#296a46] uppercase">
                    Requested: {app.requested_role} · Status: {app.status}
                  </div>
                  <h3 className="text-lg font-bold text-[#002517] mt-0.5">
                    {app.full_name} ({app.email})
                  </h3>
                  <p className="text-xs text-[#414844]">
                    Phone: {app.phone} · Towns: {app.operating_towns} · ID Ref: {app.national_id_reference}
                  </p>
                </div>
                <span className="text-xs text-[#414844]">{formatDateShort(app.created_at)}</span>
              </div>

              <div className="text-sm text-[#121e17] bg-[#effdf1]/60 rounded-xl p-3 border border-[#c1c8c2]/60 space-y-2">
                <div>
                  <p className="text-xs font-semibold text-[#414844]">Verification Notes:</p>
                  <p>{app.verification_notes}</p>
                </div>
                {app.acceptances && app.acceptances.length > 0 && (
                  <div className="pt-2 border-t border-[#c1c8c2]/50 text-xs text-[#414844]">
                    <span className="font-semibold text-[#002517]">Recorded Policy Acceptances: </span>
                    {app.acceptances
                      .map(
                        (a) =>
                          `${a.document_type === 'host_terms' ? 'Host Terms' : 'Community Standards'} v${a.document_version} (${formatDateShort(a.accepted_at)})`
                      )
                      .join(' · ')}
                  </div>
                )}
              </div>

              {app.status === 'pending' ? (
                <div className="space-y-3 pt-1">
                  <input
                    type="text"
                    value={reviewNotesById[app.id] || ''}
                    onChange={(e) => setReviewNotesById((prev) => ({ ...prev, [app.id]: e.target.value }))}
                    placeholder="Mandatory administrator review notes (required for audit log)..."
                    className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ app, decision: 'approved' })}
                      className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-bold"
                    >
                      Approve & Grant {app.requested_role} Role
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ app, decision: 'rejected' })}
                      className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-bold"
                    >
                      Reject Application
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#414844]">
                  Reviewed by {app.reviewer_name || 'Admin'} on {formatDateShort(app.reviewed_at)} — Notes:{' '}
                  {app.review_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl border border-[#c1c8c2] max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#002517]">Confirm Application Decision</h2>
            <p className="text-sm text-[#414844]">
              Are you sure you want to mark <strong>{confirmAction.app.full_name}</strong>&apos;s application as{' '}
              <strong>{confirmAction.decision}</strong>? This action is atomic and cannot be re-reviewed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-lg border border-[#c1c8c2] text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDecision}
                className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-bold"
              >
                Confirm {confirmAction.decision}
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}

interface AdminPropertyRow extends Property {
  owner_email: string;
  primary_image?: string | null;
}

export function AdminPropertiesPage() {
  const { notify } = useAuth();
  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    apiFetch<{ properties: AdminPropertyRow[] }>('/api/admin/properties').then((res) =>
      setProperties(res.properties)
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerify = async (id: string, decision: 'approved' | 'rejected' | 'suspended' | 'reinstated') => {
    try {
      await apiFetch(`/api/admin/properties/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes: notesById[id] || '' }),
      });
      notify(`Property marked as ${decision}.`, 'success');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Action failed.', 'error');
    }
  };

  return (
    <WorkspaceShell title="Property Verification & Listings" subtitle="Inspect, approve, reject, or suspend student housing listings.">
      <div className="space-y-4">
        {properties.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-16 rounded-lg overflow-hidden bg-[#effdf1] border border-[#c1c8c2]/60 shrink-0">
                  {p.primary_image ? (
                    <img src={p.primary_image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#296a46] capitalize">
                    {p.listing_status.replace('_', ' ')} {p.is_demo ? '· Sample Demo' : ''}
                  </div>
                  <h3 className="text-base font-bold text-[#002517]">{p.title}</h3>
                  <p className="text-xs text-[#414844] tabular-nums">
                    {p.town}, {p.estate} · {formatKes(p.monthly_rent_kes)}/mo · Owner: {p.owner_name} ({p.owner_email})
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={notesById[p.id] || ''}
                onChange={(e) => setNotesById((prev) => ({ ...prev, [p.id]: e.target.value }))}
                placeholder="Verification notes or rejection/suspension reason..."
                className="flex-1 rounded-lg border border-[#c1c8c2] px-3 py-2 text-xs"
              />
              <div className="flex flex-wrap gap-2">
                {p.listing_status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => handleVerify(p.id, p.listing_status === 'suspended' ? 'reinstated' : 'approved')}
                    className="px-3.5 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-bold"
                  >
                    Approve
                  </button>
                )}
                {p.listing_status === 'pending_review' && (
                  <button
                    type="button"
                    onClick={() => handleVerify(p.id, 'rejected')}
                    className="px-3.5 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-bold"
                  >
                    Reject
                  </button>
                )}
                {p.listing_status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => handleVerify(p.id, 'suspended')}
                    className="px-3.5 py-2 rounded-lg border border-amber-300 text-amber-800 text-xs font-bold"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </WorkspaceShell>
  );
}

interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  status: string;
  full_name: string;
  phone: string;
  institution?: string | null;
  created_at: string;
}

export function AdminUsersPage() {
  const { notify } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);

  const load = useCallback(() => {
    apiFetch<{ users: AdminUserRow[] }>('/api/admin/users').then((res) => setUsers(res.users));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (u: AdminUserRow) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      await apiFetch(`/api/admin/users/${u.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, reason: 'Admin account review' }),
      });
      notify(`User account ${nextStatus}.`, 'info');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Action failed.', 'error');
    }
  };

  return (
    <WorkspaceShell title="User Management" subtitle="Inspect accounts across all four roles and manage account status.">
      <div className="bg-white rounded-2xl border border-[#c1c8c2] overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#c1c8c2] text-xs text-[#414844]">
              <th className="p-4 font-semibold">User</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Phone</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Joined</th>
              <th className="p-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c1c8c2]/50">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-4">
                  <div className="font-bold text-[#002517]">{u.full_name}</div>
                  <div className="text-xs text-[#414844]">{u.email}</div>
                </td>
                <td className="p-4 capitalize font-semibold text-[#296a46]">{u.role}</td>
                <td className="p-4 text-xs tabular-nums">{u.phone}</td>
                <td className="p-4 capitalize text-xs font-bold">{u.status}</td>
                <td className="p-4 text-xs tabular-nums text-[#414844]">{formatDateShort(u.created_at)}</td>
                <td className="p-4 text-right">
                  {u.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => toggleStatus(u)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        u.status === 'active'
                          ? 'border-red-200 text-red-700 hover:bg-red-50'
                          : 'border-[#296a46] text-[#296a46] hover:bg-[#effdf1]'
                      }`}
                    >
                      {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WorkspaceShell>
  );
}

interface ReportRow {
  id: string;
  reporter_name: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
}

export function AdminModerationPage() {
  const { notify } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    apiFetch<{ reports: ReportRow[] }>('/api/admin/reports').then((res) => setReports(res.reports));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleModerate = async (id: string, status: 'resolved' | 'dismissed', actionTaken: string) => {
    try {
      await apiFetch(`/api/admin/reports/${id}/moderate`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          actionTaken,
          reason: reasons[id] || `Marked ${status} by administrator`,
        }),
      });
      notify('Moderation action applied.', 'success');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Moderation failed.', 'error');
    }
  };

  return (
    <WorkspaceShell title="Reports & Moderation" subtitle="Review flagged listings, Discover posts, and Community discussions.">
      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-10 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-[#296a46] mx-auto opacity-75" />
          <p className="text-base font-bold text-[#002517]">No safety reports submitted</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-[#296a46] uppercase">
                    {r.target_type.replace('_', ' ')} · {r.status}
                  </span>
                  <h3 className="text-base font-bold text-[#002517]">{r.reason}</h3>
                  <p className="text-xs text-[#414844]">
                    Reported by {r.reporter_name} on {formatDateShort(r.created_at)}
                  </p>
                </div>
              </div>
              {r.details && <p className="text-sm text-[#121e17]">{r.details}</p>}

              {r.status === 'open' ? (
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <input
                    type="text"
                    value={reasons[r.id] || ''}
                    onChange={(e) => setReasons((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Moderation decision notes..."
                    className="flex-1 rounded-lg border border-[#c1c8c2] px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleModerate(r.id, 'resolved', 'hide_content')}
                    className="px-3.5 py-2 rounded-lg bg-red-700 text-white text-xs font-bold"
                  >
                    Hide/Suspend Content
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModerate(r.id, 'dismissed', 'dismissed')}
                    className="px-3.5 py-2 rounded-lg border border-[#c1c8c2] text-xs font-semibold"
                  >
                    Dismiss Report
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#414844]">Resolution: {r.resolution_notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);

  useEffect(() => {
    apiFetch<{ logs: AuditEntry[] }>('/api/admin/audit-logs').then((res) => setLogs(res.logs));
  }, []);

  return (
    <WorkspaceShell title="Audit Logs" subtitle="Immutable administrative, authentication, and verification records.">
      <div className="bg-white rounded-2xl border border-[#c1c8c2] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#c1c8c2] text-[#414844]">
              <th className="p-4 font-semibold">Timestamp</th>
              <th className="p-4 font-semibold">Actor</th>
              <th className="p-4 font-semibold">Action</th>
              <th className="p-4 font-semibold">Entity</th>
              <th className="p-4 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c1c8c2]/50">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="p-4 tabular-nums text-[#414844] whitespace-nowrap">{log.created_at}</td>
                <td className="p-4 font-semibold text-[#002517]">{log.actor_name || log.actor_email || 'System'}</td>
                <td className="p-4 font-mono">{log.action}</td>
                <td className="p-4">{log.entity_type}</td>
                <td className="p-4 font-mono text-[#414844] max-w-xs truncate">{log.metadata_json || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WorkspaceShell>
  );
}

interface PolicyFormState {
  title: string;
  version: string;
  content: string;
  changeNotes: string;
}

function suggestNextVersion(currentVersion: string): string {
  const match = currentVersion.match(/^(\d+)\.(\d+)$/);
  if (match) {
    return `${match[1]}.${Number(match[2]) + 1}`;
  }
  const yearMatch = currentVersion.match(/^(\d{4})\.(\d+)$/);
  if (yearMatch) {
    return `${yearMatch[1]}.${Number(yearMatch[2]) + 1}`;
  }
  return `${currentVersion}-v2`;
}

function buildInitialEditorState(bundle: AdminPolicyBundle): PolicyFormState {
  if (bundle.draft) {
    return {
      title: bundle.draft.title,
      version: bundle.draft.version,
      content: bundle.draft.content,
      changeNotes: bundle.draft.change_notes || '',
    };
  }
  if (bundle.published) {
    return {
      title: bundle.published.title,
      version: suggestNextVersion(bundle.published.version),
      content: bundle.published.content,
      changeNotes: '',
    };
  }
  return {
    title: bundle.label,
    version: '1.0',
    content: '',
    changeNotes: '',
  };
}

export function AdminSettingsPage() {
  const { notify } = useAuth();
  const [supportEmail, setSupportEmail] = useState('');
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const [bundles, setBundles] = useState<AdminPolicyBundle[]>([]);
  const [activeDocType, setActiveDocType] = useState<PolicyDocumentType>('host_terms');
  const [editors, setEditors] = useState<Record<PolicyDocumentType, PolicyFormState>>({
    host_terms: { title: '', version: '', content: '', changeNotes: '' },
    community_standards: { title: '', version: '', content: '', changeNotes: '' },
  });
  const [policyBusy, setPolicyBusy] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    version: string;
    content: string;
    statusLabel: string;
    isDraft: boolean;
  } | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<PolicyDocumentType | null>(null);

  const applyPolicyBundles = useCallback((list: AdminPolicyBundle[]) => {
    setBundles(list);
    setEditors((prev) => {
      const next = { ...prev };
      for (const b of list) {
        next[b.documentType] = buildInitialEditorState(b);
      }
      return next;
    });
  }, []);

  const loadAll = useCallback(() => {
    apiFetch<{ settings: Record<string, string | null>; integrations: Record<string, boolean> }>(
      '/api/admin/settings'
    ).then((res) => {
      setSupportEmail(res.settings.platform_support_email || '');
      setIntegrations(res.integrations);
    });

    apiFetch<{ policies: AdminPolicyBundle[] }>('/api/admin/policies').then((res) => {
      applyPolicyBundles(res.policies);
    });
  }, [applyPolicyBundles]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const activeBundle = bundles.find((b) => b.documentType === activeDocType) || null;
  const activeEditor = editors[activeDocType];

  const updateEditor = (patch: Partial<PolicyFormState>) => {
    setEditors((prev) => ({
      ...prev,
      [activeDocType]: { ...prev[activeDocType], ...patch },
    }));
  };

  const handleSaveDraft = async () => {
    setPolicyBusy(true);
    try {
      const res = await apiFetch<{ message: string; policies: AdminPolicyBundle[] }>(
        `/api/admin/policies/${activeDocType}/draft`,
        {
          method: 'PUT',
          body: JSON.stringify(activeEditor),
        }
      );
      applyPolicyBundles(res.policies);
      notify(res.message, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save draft.', 'error');
    } finally {
      setPolicyBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!confirmPublish) return;
    setPolicyBusy(true);
    try {
      const payload = editors[confirmPublish];
      const res = await apiFetch<{ message: string; policies: AdminPolicyBundle[] }>(
        `/api/admin/policies/${confirmPublish}/publish`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      applyPolicyBundles(res.policies);
      setConfirmPublish(null);
      notify(res.message, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to publish policy.', 'error');
    } finally {
      setPolicyBusy(false);
    }
  };

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ platform_support_email: supportEmail }),
      });
      notify('General platform settings saved.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const publishedCount = bundles.filter((b) => Boolean(b.published)).length;

  return (
    <WorkspaceShell
      title="Platform Settings & Policy Documents"
      subtitle="Review, edit, preview, and publish Host Terms & Conditions and Community Standards, and inspect runtime integrations."
    >
      <div className="max-w-4xl space-y-6">
        {/* Policy Gate Summary */}
        <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#002517] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#296a46]" />
                <span>Policy Documents Management (Host Onboarding Gate)</span>
              </h2>
              <p className="text-xs text-[#414844] mt-1">
                Host applications remain unavailable until both documents have an administrator-approved published version. Published versions remain immutable in history.
              </p>
            </div>
            <div className="text-xs font-bold">
              {publishedCount === 2 ? (
                <span className="inline-flex items-center gap-1.5 text-[#296a46]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Both Policies Published (Host Registration Open)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{publishedCount}/2 Published (Host Registration Blocked)</span>
                </span>
              )}
            </div>
          </div>

          {/* Document Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bundles.map((b) => {
              const isActive = b.documentType === activeDocType;
              return (
                <button
                  key={b.documentType}
                  type="button"
                  onClick={() => setActiveDocType(b.documentType)}
                  className={`p-4 rounded-xl border text-left transition-colors space-y-1.5 ${
                    isActive
                      ? 'border-[#002517] bg-[#effdf1]'
                      : 'border-[#c1c8c2] bg-white hover:bg-[#effdf1]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-[#002517]">{b.label}</span>
                    {b.published ? (
                      <span className="text-[11px] font-bold text-[#296a46]">
                        Published · v{b.published.version}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700">Unpublished (Draft Only)</span>
                    )}
                  </div>
                  <p className="text-xs text-[#414844]">
                    {b.published
                      ? `Live since ${formatDateShort(b.published.published_at)}${
                          b.draft ? ` · Active draft: v${b.draft.version}` : ''
                        }`
                      : b.draft?.is_initial_draft
                      ? `Initial draft (v${b.draft.version}) — requires admin review & approval`
                      : b.draft
                      ? `Draft saved (v${b.draft.version}) — not yet published`
                      : 'No draft created yet'}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Policy Editor */}
          {activeBundle && (
            <div className="pt-4 border-t border-[#c1c8c2]/60 space-y-4">
              {activeBundle.draft?.is_initial_draft && !activeBundle.published && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Initial Draft — Administrator Review Required</p>
                    <p className="mt-0.5 leading-relaxed">
                      This substantive Kenyan student accommodation draft is unpublished and not legally approved. Review and adapt the text, set an official release version (e.g. <code>1.0</code> or <code>2026.1</code>), preview it, and publish when approved.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#414844] mb-1">Document Title</label>
                  <input
                    type="text"
                    value={activeEditor.title}
                    onChange={(e) => updateEditor({ title: e.target.value })}
                    placeholder="e.g. UniNest Kenya Host Terms & Conditions"
                    className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#414844] mb-1">
                    Version Identifier
                  </label>
                  <input
                    type="text"
                    value={activeEditor.version}
                    onChange={(e) => updateEditor({ version: e.target.value })}
                    placeholder="e.g. 1.0 or 2026.1"
                    className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">
                  Revision / Change Notes (optional, recorded in version history)
                </label>
                <input
                  type="text"
                  value={activeEditor.changeNotes}
                  onChange={(e) => updateEditor({ changeNotes: e.target.value })}
                  placeholder="e.g. Reviewed Kenya Data Protection clause and viewing fee prohibition"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#414844]">
                    Policy Content ({activeBundle.label})
                  </label>
                  {activeBundle.published && (
                    <button
                      type="button"
                      onClick={() =>
                        updateEditor({
                          title: activeBundle.published!.title,
                          content: activeBundle.published!.content,
                        })
                      }
                      className="text-xs font-semibold text-[#296a46] hover:underline"
                    >
                      Reset text to currently published (v{activeBundle.published.version})
                    </button>
                  )}
                </div>
                <textarea
                  rows={14}
                  value={activeEditor.content}
                  onChange={(e) => updateEditor({ content: e.target.value })}
                  className="w-full rounded-xl border border-[#c1c8c2] px-3.5 py-2.5 text-sm leading-relaxed font-sans"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={policyBusy}
                    onClick={() =>
                      setPreviewDoc({
                        title: activeEditor.title || activeBundle.label,
                        version: activeEditor.version || 'Draft',
                        content: activeEditor.content,
                        statusLabel: activeBundle.published
                          ? `Draft Preview (Live is v${activeBundle.published.version})`
                          : 'Unpublished Draft Preview',
                        isDraft: true,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#c1c8c2] text-xs font-bold text-[#121e17] hover:bg-[#effdf1] disabled:opacity-50"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Before Publishing</span>
                  </button>

                  <button
                    type="button"
                    disabled={policyBusy}
                    onClick={handleSaveDraft}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#296a46] text-xs font-bold text-[#296a46] hover:bg-[#effdf1] disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Draft</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={policyBusy}
                  onClick={() => setConfirmPublish(activeDocType)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#002517] text-[#effdf1] text-xs font-bold hover:bg-[#123b2a] disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {activeBundle.published ? 'Publish Updated Version' : 'Publish Approved Version'}
                  </span>
                </button>
              </div>

              {/* Version History Table */}
              <div className="pt-5 border-t border-[#c1c8c2]/60 space-y-3">
                <h3 className="text-xs font-bold text-[#002517] uppercase tracking-wide flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#296a46]" />
                  <span>Version History ({activeBundle.label})</span>
                </h3>
                {activeBundle.history.length === 0 ? (
                  <p className="text-xs text-[#414844]">No policy versions recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#c1c8c2] text-[#414844]">
                          <th className="py-2 pr-3 font-semibold">Version</th>
                          <th className="py-2 pr-3 font-semibold">Status</th>
                          <th className="py-2 pr-3 font-semibold">Date</th>
                          <th className="py-2 pr-3 font-semibold">Publisher / Author</th>
                          <th className="py-2 pr-3 font-semibold">Notes</th>
                          <th className="py-2 text-right font-semibold">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c1c8c2]/40">
                        {activeBundle.history.map((item: PolicyDocumentRecord) => (
                          <tr key={item.id}>
                            <td className="py-2.5 pr-3 font-bold text-[#002517]">v{item.version}</td>
                            <td className="py-2.5 pr-3">
                              <span
                                className={`font-bold capitalize ${
                                  item.status === 'published'
                                    ? 'text-[#296a46]'
                                    : item.status === 'draft'
                                    ? 'text-amber-700'
                                    : 'text-[#414844]'
                                }`}
                              >
                                {item.status}
                                {item.is_initial_draft ? ' (initial draft)' : ''}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 tabular-nums text-[#414844]">
                              {formatDateShort(item.published_at || item.updated_at)}
                            </td>
                            <td className="py-2.5 pr-3 text-[#414844]">
                              {item.published_by_name || item.created_by_name || 'System'}
                            </td>
                            <td className="py-2.5 pr-3 text-[#414844] max-w-xs truncate">
                              {item.change_notes || '—'}
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewDoc({
                                    title: item.title,
                                    version: item.version,
                                    content: item.content,
                                    statusLabel:
                                      item.status === 'published'
                                        ? `Published on ${formatDateShort(item.published_at)}`
                                        : item.status === 'archived'
                                        ? `Archived · Originally published ${formatDateShort(item.published_at)}`
                                        : 'Unpublished Draft',
                                    isDraft: item.status === 'draft',
                                  })
                                }
                                className="font-semibold text-[#296a46] hover:underline"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* External Integration Status */}
        <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-3">
          <h2 className="text-base font-bold text-[#002517] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#296a46]" />
            <span>External Integration Status (Honest Runtime Check)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Supabase Project Connection', ok: integrations.supabaseConfigured },
              { label: 'Outbound Email Provider (SMTP/Resend)', ok: integrations.emailProviderConfigured },
              { label: 'SMS Gateway Provider', ok: integrations.smsProviderConfigured },
              { label: 'WhatsApp Business Provider', ok: integrations.whatsappProviderConfigured },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3 rounded-xl border border-[#c1c8c2]/70 flex items-center justify-between"
              >
                <span className="font-medium text-[#121e17]">{item.label}</span>
                <span className={`font-bold ${item.ok ? 'text-[#296a46]' : 'text-amber-700'}`}>
                  {item.ok ? 'Configured' : 'Not Configured'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Support Email Settings */}
        <form onSubmit={handleSaveGeneralSettings} className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#002517]">General Platform Contact</h2>
            <p className="text-xs text-[#414844] mt-0.5">
              Official support and policy appeal contact email shown to platform users.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#414844] mb-1">Support Contact Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={savingSettings}
            className="px-5 py-2.5 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold disabled:opacity-50"
          >
            {savingSettings ? 'Saving...' : 'Save Contact Settings'}
          </button>
        </form>
      </div>

      {/* Preview / Historical Document Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#c1c8c2] max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#c1c8c2]/60 pb-3">
              <div>
                <p className="text-xs font-bold text-[#296a46]">{previewDoc.statusLabel}</p>
                <h3 className="text-lg font-extrabold text-[#002517] mt-0.5">{previewDoc.title}</h3>
                <p className="text-xs text-[#414844]">Version: v{previewDoc.version}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-3 py-1.5 rounded-lg border border-[#c1c8c2] text-xs font-semibold text-[#121e17]"
              >
                Close
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto rounded-xl border border-[#c1c8c2]/60 p-5 bg-[#effdf1]/40">
              <PolicyDocumentBody content={previewDoc.content} />
            </div>
          </div>
        </div>
      )}

      {/* Confirm Publication Modal */}
      {confirmPublish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#c1c8c2] max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-[#002517]">
              Publish {confirmPublish === 'host_terms' ? 'Host Terms & Conditions' : 'Community Standards'}?
            </h3>
            <p className="text-sm text-[#414844] leading-relaxed">
              You are publishing version <strong>v{editors[confirmPublish].version}</strong>. Once published, this version becomes immediately visible to Property Owner and Resident Caretaker applicants and cannot be edited retroactively. Any previously published version will be archived while preserving existing applicant acceptance records.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={policyBusy}
                onClick={() => setConfirmPublish(null)}
                className="px-4 py-2 rounded-lg border border-[#c1c8c2] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={policyBusy}
                onClick={handlePublish}
                className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-bold disabled:opacity-50"
              >
                {policyBusy ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
