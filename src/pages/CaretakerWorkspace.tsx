import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Calendar, FileText, ShieldCheck } from 'lucide-react';
import { WorkspaceShell } from '../components/Layout';
import { apiFetch, formatKes } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Enquiry, Property, ViewingRequest } from '../types';

export function CaretakerDashboardPage() {
  const { user } = useAuth();
  const [assignedProps, setAssignedProps] = useState<Property[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch<{ properties: Property[] }>('/api/properties/managed/mine'),
      apiFetch<{ enquiries: Enquiry[] }>('/api/properties/enquiries/mine'),
      apiFetch<{ viewings: ViewingRequest[] }>('/api/properties/viewings/mine'),
    ])
      .then(([p, e, v]) => {
        setAssignedProps(p.properties);
        setEnquiries(e.enquiries);
        setViewings(v.viewings);
      })
      .catch(() => {});
  }, []);

  return (
    <WorkspaceShell
      title="Resident Caretaker Workspace"
      subtitle={`Signed in as ${user?.full_name}. Access is strictly scoped to properties explicitly assigned to you.`}
    >
      <div className="space-y-8">
        <div className="rounded-2xl border border-[#c1c8c2] bg-white p-5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#296a46] shrink-0 mt-0.5" />
          <div className="text-xs text-[#414844] space-y-1">
            <p className="text-sm font-bold text-[#002517]">Scoped Caretaker Access Policy</p>
            <p>
              You only see and manage buildings with an active caretaker assignment record. Other properties owned by the same landlord remain private unless explicitly assigned.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5">
            <p className="text-xs font-semibold text-[#414844]">Assigned Properties</p>
            <p className="text-2xl font-extrabold text-[#002517] mt-1 tabular-nums">{assignedProps.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5">
            <p className="text-xs font-semibold text-[#414844]">Pending Enquiries</p>
            <p className="text-2xl font-extrabold text-[#002517] mt-1 tabular-nums">
              {enquiries.filter((e) => e.status === 'new').length}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5">
            <p className="text-xs font-semibold text-[#414844]">Upcoming Viewings</p>
            <p className="text-2xl font-extrabold text-[#002517] mt-1 tabular-nums">
              {viewings.filter((v) => v.status === 'pending' || v.status === 'accepted').length}
            </p>
          </div>
        </div>

        <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#002517] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#296a46]" />
              <span>Your Actively Assigned Properties</span>
            </h2>
            <Link to="/caretaker/properties" className="text-xs font-semibold text-[#296a46] hover:underline">
              Open details
            </Link>
          </div>

          {assignedProps.length === 0 ? (
            <p className="text-sm text-[#414844]">
              You currently have no active property assignments. Ask a verified Property Owner to assign you to a building.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedProps.map((p) => (
                <div key={p.id} className="rounded-xl border border-[#c1c8c2]/80 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#002517]">{p.title}</h3>
                    <span className="text-xs font-semibold text-[#296a46] tabular-nums">
                      {formatKes(p.monthly_rent_kes)}/mo
                    </span>
                  </div>
                  <p className="text-xs text-[#414844]">
                    {p.town}, {p.estate} · {p.units_available} units available
                  </p>
                  <div className="text-[11px] text-[#414844] pt-1">
                    Permissions:{' '}
                    {[
                      p.can_edit_details ? 'Edit Details' : null,
                      p.can_upload_images ? 'Upload Photos' : null,
                      p.can_manage_enquiries ? 'Enquiries' : null,
                      p.can_manage_viewings ? 'Viewings' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#002517] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#296a46]" />
                <span>Assigned Enquiries</span>
              </h2>
              <Link to="/caretaker/enquiries" className="text-xs font-semibold text-[#296a46] hover:underline">
                Respond →
              </Link>
            </div>
            {enquiries.slice(0, 3).map((e) => (
              <div key={e.id} className="text-xs py-2 border-b border-[#c1c8c2]/40 last:border-b-0">
                <span className="font-bold text-[#002517]">{e.property_title}:</span> {e.subject} ({e.status})
              </div>
            ))}
            {enquiries.length === 0 && <p className="text-xs text-[#414844]">No enquiries for assigned properties.</p>}
          </section>

          <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#002517] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#296a46]" />
                <span>Assigned Viewings</span>
              </h2>
              <Link to="/caretaker/viewings" className="text-xs font-semibold text-[#296a46] hover:underline">
                Manage →
              </Link>
            </div>
            {viewings.slice(0, 3).map((v) => (
              <div key={v.id} className="text-xs py-2 border-b border-[#c1c8c2]/40 last:border-b-0 tabular-nums">
                <span className="font-bold text-[#002517]">{v.property_title}:</span> {v.requested_date} at{' '}
                {v.requested_time} ({v.status})
              </div>
            ))}
            {viewings.length === 0 && <p className="text-xs text-[#414844]">No viewing requests for assigned properties.</p>}
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}

export function CaretakerPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ properties: Property[] }>('/api/properties/managed/mine')
      .then((res) => setProperties(res.properties))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WorkspaceShell
      title="Assigned Properties"
      subtitle="Only properties with an active caretaker assignment appear here."
    >
      {loading ? (
        <p className="text-sm text-[#414844]">Loading assigned properties...</p>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-10 text-center text-sm text-[#414844]">
          No properties are currently assigned to your caretaker account.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {properties.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#002517]">{p.title}</h2>
                  <p className="text-xs text-[#414844]">
                    {p.town}, {p.estate} · {formatKes(p.monthly_rent_kes)}/mo
                  </p>
                </div>
                <span className="text-xs font-bold capitalize px-2.5 py-1 rounded bg-[#effdf1] text-[#296a46]">
                  {p.listing_status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-[#414844] line-clamp-2">{p.description}</p>
              <div className="flex items-center gap-3 pt-2 border-t border-[#c1c8c2]/50">
                {Boolean(p.can_edit_details) && (
                  <Link
                    to={`/caretaker/properties/${p.id}/edit`}
                    className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-bold"
                  >
                    Edit Permitted Info & Photos
                  </Link>
                )}
                <Link
                  to={`/properties/${p.id}`}
                  className="px-4 py-2 rounded-lg border border-[#c1c8c2] text-xs font-semibold text-[#121e17]"
                >
                  View Public Page
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
