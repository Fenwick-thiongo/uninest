import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Flag,
  Heart,
  MapPin,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { PublicLayout } from '../components/Layout';
import { ReportModal } from '../components/ReportModal';
import { apiFetch, formatKes } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Property } from '../types';

export default function PropertyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user, notify } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [saved, setSaved] = useState(false);

  // Enquiry Form
  const [enqSubject, setEnqSubject] = useState('');
  const [enqMessage, setEnqMessage] = useState('');
  const [enqMonth, setEnqMonth] = useState('2026-09');
  const [sendingEnq, setSendingEnq] = useState(false);

  // Viewing Request Form
  const [viewDate, setViewDate] = useState('');
  const [viewTime, setViewTime] = useState('14:00');
  const [viewNotes, setViewNotes] = useState('');
  const [sendingView, setSendingView] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<{ property: Property }>(`/api/properties/${id}`)
      .then((res) => {
        setProperty(res.property);
        setSaved(Boolean(res.property.is_saved));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Property not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggleSave = async () => {
    if (!property) return;
    if (!user) {
      notify('Sign in to save favourite properties.', 'info');
      navigate('/login');
      return;
    }
    try {
      if (saved) {
        await apiFetch(`/api/properties/${property.id}/save`, { method: 'DELETE' });
        setSaved(false);
        notify('Removed from saved properties.', 'info');
      } else {
        await apiFetch(`/api/properties/${property.id}/save`, { method: 'POST' });
        setSaved(true);
        notify('Saved to your favourites.', 'success');
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update saved list.', 'error');
    }
  };

  const handleStartMessage = async () => {
    if (!property) return;
    if (!user) {
      notify('Please sign in to message the property host.', 'info');
      navigate('/login');
      return;
    }
    try {
      const res = await apiFetch<{ conversationId: string }>('/api/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: property.id,
          subject: property.title,
        }),
      });
      navigate(`/messages?c=${res.conversationId}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not open conversation.', 'error');
    }
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    if (!user) {
      notify('Please sign in to send an enquiry.', 'info');
      navigate('/login');
      return;
    }
    setSendingEnq(true);
    try {
      await apiFetch(`/api/properties/${property.id}/enquiries`, {
        method: 'POST',
        body: JSON.stringify({
          subject: enqSubject,
          message: enqMessage,
          moveInMonth: enqMonth,
        }),
      });
      notify('Enquiry sent! Track replies in your workspace.', 'success');
      setEnqSubject('');
      setEnqMessage('');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to send enquiry.', 'error');
    } finally {
      setSendingEnq(false);
    }
  };

  const handleViewingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    if (!user) {
      notify('Please sign in to request a viewing.', 'info');
      navigate('/login');
      return;
    }
    setSendingView(true);
    try {
      await apiFetch(`/api/properties/${property.id}/viewings`, {
        method: 'POST',
        body: JSON.stringify({
          requestedDate: viewDate,
          requestedTime: viewTime,
          notes: viewNotes,
        }),
      });
      notify('Viewing request submitted for host confirmation.', 'success');
      setViewDate('');
      setViewNotes('');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to request viewing.', 'error');
    } finally {
      setSendingView(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="h-96 bg-white rounded-2xl border border-[#c1c8c2]/60 animate-pulse" />
        </div>
      </PublicLayout>
    );
  }

  if (error || !property) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold text-[#002517]">Listing Unavailable</h1>
          <p className="text-sm text-[#414844]">{error || 'This property could not be found.'}</p>
          <Link to="/find-a-house" className="inline-block px-5 py-2.5 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-semibold">
            Back to Find a House
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const images = property.images || [];
  const activeImage = images[activeImgIdx]?.image_url;
  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/find-a-house"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#296a46] hover:text-[#002517]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to all accommodation</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSave}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                saved
                  ? 'bg-[#002517] border-[#002517] text-[#c5f176]'
                  : 'bg-white border-[#c1c8c2] text-[#121e17] hover:bg-[#effdf1]'
              }`}
            >
              <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
              <span>{saved ? 'Saved' : 'Save Property'}</span>
            </button>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="px-3.5 py-2 rounded-lg border border-[#c1c8c2] bg-white text-sm font-medium text-[#414844] hover:text-red-700 inline-flex items-center gap-1.5"
            >
              <Flag className="w-4 h-4" />
              <span>Report</span>
            </button>
          </div>
        </div>

        {/* Gallery & Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-3">
            <div className="aspect-[16/10] rounded-2xl overflow-hidden border border-[#c1c8c2] bg-white">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={property.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#effdf1] text-[#123b2a]">
                  <Building2 className="w-12 h-12 mb-2 opacity-60" />
                  <span className="text-sm font-medium">No property photo uploaded</span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImgIdx(idx)}
                    className={`aspect-[4/3] rounded-lg overflow-hidden border-2 ${
                      idx === activeImgIdx ? 'border-[#002517]' : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={img.image_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#c1c8c2] p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-xs font-semibold text-[#296a46]">
                {property.property_type} · {property.room_type} ·{' '}
                {property.is_demo ? 'Sample Demonstration Listing' : 'Verified Listing'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002517] leading-tight">
                {property.title}
              </h1>
              <p className="text-sm text-[#414844] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#296a46] shrink-0" />
                <span>
                  {property.town}, {property.estate}
                  {property.address_landmark ? ` — ${property.address_landmark}` : ''}
                </span>
              </p>

              <div className="p-4 rounded-xl bg-[#effdf1] border border-[#c1c8c2]/60 flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs text-[#414844]">Monthly Rent</p>
                  <p className="text-2xl font-extrabold text-[#002517] tabular-nums">
                    {formatKes(property.monthly_rent_kes)}
                    <span className="text-xs font-medium text-[#414844]">/month</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#414844]">Deposit</p>
                  <p className="text-base font-bold text-[#121e17] tabular-nums">
                    {formatKes(property.deposit_kes)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-[#c1c8c2]/70 p-3">
                  <p className="text-xs text-[#414844]">Availability</p>
                  <p className="font-bold text-[#002517] capitalize tabular-nums">
                    {property.availability_status} ({property.units_available} units)
                  </p>
                </div>
                <div className="rounded-xl border border-[#c1c8c2]/70 p-3">
                  <p className="text-xs text-[#414844]">Nearest Campus</p>
                  <p className="font-bold text-[#002517] truncate">
                    {property.nearby_institution || 'Multiple Campuses'}
                  </p>
                </div>
              </div>

              {/* Public Host & Caretaker Info (Personal phone protected) */}
              <div className="pt-2 border-t border-[#c1c8c2]/60 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-[#296a46]" />
                  <span className="font-semibold text-[#121e17]">
                    Property Owner: {property.owner_name || 'Verified Host'}
                  </span>
                </div>
                {property.assigned_caretaker && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserCheck className="w-4 h-4 text-[#296a46]" />
                    <span className="text-[#414844]">
                      Resident Caretaker: <strong className="text-[#121e17]">{property.assigned_caretaker.full_name}</strong>
                    </span>
                  </div>
                )}
                <p className="text-xs text-[#414844]">
                  Personal contact details are protected. Use UniNest messaging, enquiries, or viewing requests below.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartMessage}
              className="w-full py-3 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold hover:bg-[#123b2a] transition-colors inline-flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Message {property.assigned_caretaker ? 'Resident Caretaker' : 'Property Owner'}</span>
            </button>
          </div>
        </div>

        {/* Description, Amenities & Action Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-3">
              <h2 className="text-xl font-bold text-[#002517]">About this Accommodation</h2>
              <p className="text-sm sm:text-base text-[#414844] leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
              <h2 className="text-xl font-bold text-[#002517]">Included Amenities</h2>
              {property.amenities?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {property.amenities.map((am) => (
                    <div
                      key={am.id}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-[#effdf1]/60 border border-[#c1c8c2]/60 text-sm font-medium text-[#121e17]"
                    >
                      <Check className="w-4 h-4 text-[#296a46] shrink-0" />
                      <span>{am.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#414844]">Contact the host to confirm utility and amenity inclusions.</p>
              )}
            </section>

            <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-2">
              <h2 className="text-xl font-bold text-[#002517]">Location & Campus Proximity</h2>
              <p className="text-sm text-[#414844]">
                Town: <strong className="text-[#121e17]">{property.town}</strong> · Estate:{' '}
                <strong className="text-[#121e17]">{property.estate}</strong>
                {property.distance_to_institution ? ` · Distance: ${property.distance_to_institution}` : ''}
              </p>
              {property.address_landmark && (
                <p className="text-sm text-[#414844]">Landmark: {property.address_landmark}</p>
              )}
            </section>
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Request Viewing Form */}
            <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#296a46]" />
                <h2 className="text-lg font-bold text-[#002517]">Request a Property Viewing</h2>
              </div>
              <form onSubmit={handleViewingSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#414844] mb-1">Preferred Date</label>
                    <input
                      type="date"
                      required
                      min={minDate}
                      value={viewDate}
                      onChange={(e) => setViewDate(e.target.value)}
                      className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#414844] mb-1">Preferred Time</label>
                    <input
                      type="time"
                      required
                      value={viewTime}
                      onChange={(e) => setViewTime(e.target.value)}
                      className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#414844] mb-1">Notes for Host</label>
                  <textarea
                    rows={2}
                    value={viewNotes}
                    onChange={(e) => setViewNotes(e.target.value)}
                    placeholder="e.g. Looking to inspect ground floor units"
                    className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingView}
                  className="w-full py-2.5 rounded-lg bg-[#c5f176] text-[#002517] text-sm font-bold hover:bg-[#abefc1] transition-colors disabled:opacity-50"
                >
                  {sendingView ? 'Sending Request...' : 'Request Viewing'}
                </button>
              </form>
            </section>

            {/* Send Enquiry Form */}
            <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#002517]">Send Formal Enquiry</h2>
              <form onSubmit={handleEnquirySubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#414844] mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={enqSubject}
                    onChange={(e) => setEnqSubject(e.target.value)}
                    placeholder="e.g. Deposit terms & Wi-Fi reliability"
                    className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#414844] mb-1">Expected Move-in Month</label>
                  <input
                    type="month"
                    value={enqMonth}
                    onChange={(e) => setEnqMonth(e.target.value)}
                    className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#414844] mb-1">Message</label>
                  <textarea
                    rows={3}
                    required
                    minLength={5}
                    value={enqMessage}
                    onChange={(e) => setEnqMessage(e.target.value)}
                    placeholder="Ask about lease duration, water, KPLC tokens, or security..."
                    className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingEnq}
                  className="w-full py-2.5 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-bold hover:bg-[#123b2a] transition-colors disabled:opacity-50"
                >
                  {sendingEnq ? 'Submitting...' : 'Send Enquiry'}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        targetType="property"
        targetId={property.id}
        targetLabel={property.title}
        onClose={() => setReportOpen(false)}
      />
    </PublicLayout>
  );
}
