import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, Calendar, FileText, Plus, Trash2, Upload, UserPlus } from 'lucide-react';
import { WorkspaceShell } from '../components/Layout';
import { apiFetch, formatDateShort, formatKes, KENYAN_TOWNS, PROPERTY_TYPES } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Amenity, Enquiry, Property, ViewingRequest } from '../types';

export function HostDashboardPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch<{ properties: Property[] }>('/api/properties/managed/mine'),
      apiFetch<{ enquiries: Enquiry[] }>('/api/properties/enquiries/mine'),
      apiFetch<{ viewings: ViewingRequest[] }>('/api/properties/viewings/mine'),
    ])
      .then(([p, e, v]) => {
        setProperties(p.properties);
        setEnquiries(e.enquiries);
        setViewings(v.viewings);
      })
      .catch(() => {});
  }, []);

  const activeCount = properties.filter((p) => p.listing_status === 'approved').length;
  const pendingCount = properties.filter((p) => p.listing_status === 'pending_review').length;
  const pendingViewings = viewings.filter((v) => v.status === 'pending').length;

  return (
    <WorkspaceShell
      title="Property Owner Dashboard"
      subtitle={`Welcome, ${user?.full_name}. Manage your student accommodation listings and tenant enquiries.`}
      action={
        <Link
          to="/host/properties/new"
          className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-bold hover:bg-[#123b2a] inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Property</span>
        </Link>
      }
    >
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5">
            <p className="text-xs font-semibold text-[#414844]">Total Properties</p>
            <p className="text-2xl font-extrabold text-[#002517] mt-1 tabular-nums">{properties.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5">
            <p className="text-xs font-semibold text-[#414844]">Active Listings</p>
            <p className="text-2xl font-extrabold text-[#296a46] mt-1 tabular-nums">{activeCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5">
            <p className="text-xs font-semibold text-[#414844]">Pending Verification</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-1 tabular-nums">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5">
            <p className="text-xs font-semibold text-[#414844]">Total Enquiries</p>
            <p className="text-2xl font-extrabold text-[#002517] mt-1 tabular-nums">{enquiries.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-5">
            <p className="text-xs font-semibold text-[#414844]">Pending Viewings</p>
            <p className="text-2xl font-extrabold text-[#002517] mt-1 tabular-nums">{pendingViewings}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#002517] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#296a46]" />
                <span>Your Properties</span>
              </h2>
              <Link to="/host/properties" className="text-xs font-semibold text-[#296a46] hover:underline">
                Manage all
              </Link>
            </div>
            {properties.length === 0 ? (
              <p className="text-sm text-[#414844]">No listings yet. Create your first property to get started.</p>
            ) : (
              <div className="divide-y divide-[#c1c8c2]/50">
                {properties.slice(0, 4).map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#002517] truncate">{p.title}</p>
                      <p className="text-xs text-[#414844] tabular-nums">
                        {p.town} · {formatKes(p.monthly_rent_kes)}/mo · {p.units_available} units
                      </p>
                    </div>
                    <Link
                      to={`/host/properties/${p.id}/manage`}
                      className="text-xs font-bold text-[#296a46] hover:underline whitespace-nowrap"
                    >
                      {p.listing_status.replace('_', ' ')}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#002517] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#296a46]" />
                <span>Recent Viewing Requests</span>
              </h2>
              <Link to="/host/viewings" className="text-xs font-semibold text-[#296a46] hover:underline">
                View schedule
              </Link>
            </div>
            {viewings.length === 0 ? (
              <p className="text-sm text-[#414844]">No viewing requests received yet.</p>
            ) : (
              <div className="divide-y divide-[#c1c8c2]/50">
                {viewings.slice(0, 4).map((v) => (
                  <div key={v.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#002517] truncate">{v.property_title}</p>
                      <p className="text-xs text-[#414844] tabular-nums">
                        {v.student_name} · {v.requested_date} at {v.requested_time}
                      </p>
                    </div>
                    <span className="text-xs font-bold capitalize text-[#296a46]">{v.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}

export function HostPropertiesListPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ properties: Property[] }>('/api/properties/managed/mine')
      .then((res) => setProperties(res.properties))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WorkspaceShell
      title="My Properties"
      subtitle="Create, edit, upload photos, and assign resident caretakers."
      action={
        <Link
          to="/host/properties/new"
          className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Property</span>
        </Link>
      }
    >
      {loading ? (
        <p className="text-sm text-[#414844]">Loading properties...</p>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-12 text-center space-y-3">
          <h2 className="text-lg font-bold text-[#002517]">No properties listed yet</h2>
          <Link
            to="/host/properties/new"
            className="inline-block px-5 py-2.5 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-bold"
          >
            Create First Listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-[#c1c8c2] overflow-hidden flex flex-col">
              <div className="aspect-[16/10] bg-[#effdf1]">
                {p.images?.[0]?.image_url ? (
                  <img
                    src={p.images[0].image_url}
                    alt={p.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[#414844]">No image yet</div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#296a46] capitalize">
                    {p.listing_status.replace('_', ' ')} · {p.property_type}
                  </div>
                  <h3 className="text-base font-bold text-[#002517]">{p.title}</h3>
                  <p className="text-xs text-[#414844]">
                    {p.town}, {p.estate}
                  </p>
                  <p className="text-sm font-extrabold text-[#002517] tabular-nums pt-1">
                    {formatKes(p.monthly_rent_kes)}/month
                  </p>
                  {p.rejection_reason && (
                    <p className="text-xs text-red-700 pt-1">Admin feedback: {p.rejection_reason}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#c1c8c2]/60">
                  <Link
                    to={`/host/properties/${p.id}/edit`}
                    className="flex-1 text-center py-2 rounded-lg border border-[#c1c8c2] text-xs font-semibold hover:bg-[#effdf1]"
                  >
                    Edit & Photos
                  </Link>
                  <Link
                    to={`/host/properties/${p.id}/manage`}
                    className="flex-1 text-center py-2 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-semibold hover:bg-[#123b2a]"
                  >
                    Caretakers & Status
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

export function PropertyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { notify } = useAuth();

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0]);
  const [roomType, setRoomType] = useState('Private Self-Contained');
  const [town, setTown] = useState(KENYAN_TOWNS[0]);
  const [estate, setEstate] = useState('');
  const [addressLandmark, setAddressLandmark] = useState('');
  const [nearbyInstitution, setNearbyInstitution] = useState('');
  const [distanceToInstitution, setDistanceToInstitution] = useState('');
  const [monthlyRentKes, setMonthlyRentKes] = useState('9500');
  const [depositKes, setDepositKes] = useState('9500');
  const [unitsAvailable, setUnitsAvailable] = useState('1');
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'limited' | 'full'>('available');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<Property['images']>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    apiFetch<{ amenities: Amenity[] }>('/api/properties/amenities')
      .then((res) => setAmenities(res.amenities))
      .catch(() => {});

    if (id) {
      apiFetch<{ property: Property }>(`/api/properties/${id}`)
        .then((res) => {
          const p = res.property;
          setTitle(p.title);
          setDescription(p.description);
          setPropertyType(p.property_type);
          setRoomType(p.room_type);
          setTown(p.town);
          setEstate(p.estate);
          setAddressLandmark(p.address_landmark || '');
          setNearbyInstitution(p.nearby_institution || '');
          setDistanceToInstitution(p.distance_to_institution || '');
          setMonthlyRentKes(String(p.monthly_rent_kes));
          setDepositKes(String(p.deposit_kes));
          setUnitsAvailable(String(p.units_available));
          setAvailabilityStatus(p.availability_status);
          setSelectedAmenities(p.amenities.map((a) => a.id));
          setImages(p.images || []);
        })
        .catch((err) => notify(err instanceof Error ? err.message : 'Could not load property.', 'error'));
    }
  }, [id, notify]);

  const toggleAmenity = (amId: string) => {
    setSelectedAmenities((prev) => (prev.includes(amId) ? prev.filter((a) => a !== amId) : [...prev, amId]));
  };

  const handleSave = async (submitForReview: boolean) => {
    setSaving(true);
    try {
      const payload = {
        title,
        description,
        propertyType,
        roomType,
        town,
        estate,
        addressLandmark,
        nearbyInstitution,
        distanceToInstitution,
        monthlyRentKes: Number(monthlyRentKes),
        depositKes: Number(depositKes),
        unitsAvailable: Number(unitsAvailable),
        availabilityStatus,
        amenityIds: selectedAmenities,
        submitForReview,
      };

      if (isEditing && id) {
        await apiFetch(`/api/properties/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        notify(submitForReview ? 'Listing submitted for admin verification.' : 'Changes saved.', 'success');
        navigate('/host/properties');
      } else {
        const res = await apiFetch<{ id: string }>('/api/properties', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify(
          submitForReview ? 'Property created and submitted for review. Upload photos below.' : 'Draft created. Upload photos below.',
          'success'
        );
        navigate(`/host/properties/${res.id}/edit`);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save listing.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingImg(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiFetch<{ id: string; image_url: string }>(`/api/properties/${id}/images`, {
        method: 'POST',
        body: form,
      });
      setImages((prev) => [
        ...prev,
        { id: res.id, property_id: id, image_url: res.image_url, caption: null, is_primary: prev.length === 0 ? 1 : 0, sort_order: prev.length },
      ]);
      notify('Property photo uploaded.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Image upload failed.', 'error');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleRemoveImage = async (imgId: string) => {
    if (!id) return;
    await apiFetch(`/api/properties/${id}/images/${imgId}`, { method: 'DELETE' });
    setImages((prev) => prev.filter((img) => img.id !== imgId));
  };

  return (
    <WorkspaceShell
      title={isEditing ? 'Edit Property Listing' : 'Add New Property'}
      subtitle="Provide accurate Kenyan KSh pricing, location, amenities, and verified photography."
      action={
        <button
          type="button"
          onClick={() => setPreviewMode((p) => !p)}
          className="px-3.5 py-2 rounded-lg border border-[#c1c8c2] bg-white text-xs font-semibold text-[#002517]"
        >
          {previewMode ? 'Back to Editor' : 'Preview Listing'}
        </button>
      }
    >
      {previewMode ? (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-6 max-w-3xl space-y-4">
          <p className="text-xs font-semibold text-[#296a46]">Listing Preview</p>
          <h2 className="text-2xl font-extrabold text-[#002517]">{title || 'Untitled Property'}</h2>
          <p className="text-sm text-[#414844]">
            {town}, {estate} · {propertyType} · {roomType}
          </p>
          <p className="text-xl font-extrabold text-[#002517] tabular-nums">
            {formatKes(Number(monthlyRentKes) || 0)}/month (Deposit: {formatKes(Number(depositKes) || 0)})
          </p>
          <p className="text-sm text-[#121e17] whitespace-pre-line">{description}</p>
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#414844] mb-1">Property Name / Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Acacia Heights Bedsitter"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Property Type</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
                >
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Room Configuration</label>
                <input
                  type="text"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  placeholder="e.g. Private Self-Contained"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Town</label>
                <select
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
                >
                  {KENYAN_TOWNS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Estate / Neighbourhood</label>
                <input
                  type="text"
                  required
                  value={estate}
                  onChange={(e) => setEstate(e.target.value)}
                  placeholder="e.g. High Point"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Nearby University / College</label>
                <input
                  type="text"
                  value={nearbyInstitution}
                  onChange={(e) => setNearbyInstitution(e.target.value)}
                  placeholder="e.g. JKUAT Main Campus"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Distance / Commute Time</label>
                <input
                  type="text"
                  value={distanceToInstitution}
                  onChange={(e) => setDistanceToInstitution(e.target.value)}
                  placeholder="e.g. 6 min walk"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Monthly Rent (KSh)</label>
                <input
                  type="number"
                  required
                  min={500}
                  value={monthlyRentKes}
                  onChange={(e) => setMonthlyRentKes(e.target.value)}
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Deposit (KSh)</label>
                <input
                  type="number"
                  min={0}
                  value={depositKes}
                  onChange={(e) => setDepositKes(e.target.value)}
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Units Available</label>
                <input
                  type="number"
                  min={0}
                  value={unitsAvailable}
                  onChange={(e) => setUnitsAvailable(e.target.value)}
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Availability Status</label>
                <select
                  value={availabilityStatus}
                  onChange={(e) => setAvailabilityStatus(e.target.value as 'available' | 'limited' | 'full')}
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
                >
                  <option value="available">Available</option>
                  <option value="limited">Limited Units</option>
                  <option value="full">Full</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#414844] mb-1">Landmark / Street Hint</label>
                <input
                  type="text"
                  value={addressLandmark}
                  onChange={(e) => setAddressLandmark(e.target.value)}
                  placeholder="e.g. 400m from Gate C"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#414844] mb-1">Description</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe utilities, water supply, security, study space, and house rules..."
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#414844] mb-2">Amenities</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {amenities.map((am) => (
                  <label
                    key={am.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer ${
                      selectedAmenities.includes(am.id)
                        ? 'bg-[#effdf1] border-[#296a46] text-[#002517]'
                        : 'bg-white border-[#c1c8c2] text-[#414844]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(am.id)}
                      onChange={() => toggleAmenity(am.id)}
                    />
                    <span>{am.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="px-5 py-2.5 rounded-xl border border-[#c1c8c2] bg-white text-sm font-bold text-[#121e17] hover:bg-[#effdf1] disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="px-5 py-2.5 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold hover:bg-[#123b2a] disabled:opacity-50"
              >
                Submit for Verification
              </button>
            </div>
          </div>

          {/* Image Uploads (enabled once property record exists) */}
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
            <h2 className="text-base font-bold text-[#002517]">Property Photos</h2>
            {!isEditing ? (
              <p className="text-xs text-[#414844]">
                Save your listing as a Draft or Submit first to attach verified property images.
              </p>
            ) : (
              <>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#296a46] bg-[#effdf1]/60 text-xs font-bold text-[#002517] cursor-pointer">
                  <Upload className="w-4 h-4 text-[#296a46]" />
                  <span>{uploadingImg ? 'Uploading...' : 'Upload JPEG, PNG, or WEBP Photo (Max 5 MB)'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingImg}
                    onChange={handleImageUpload}
                  />
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((img) => (
                    <div key={img.id} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#c1c8c2]">
                      <img src={img.image_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        aria-label="Delete photo"
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}

interface CaretakerAssignment {
  id: string;
  caretaker_id: string;
  email: string;
  full_name: string;
  phone: string;
  status: string;
  can_edit_details: number;
  can_upload_images: number;
  can_manage_enquiries: number;
  can_manage_viewings: number;
}

export function PropertyManagePage() {
  const { id } = useParams<{ id: string }>();
  const { notify } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [assignments, setAssignments] = useState<CaretakerAssignment[]>([]);
  const [caretakerEmail, setCaretakerEmail] = useState('');
  const [canEdit, setCanEdit] = useState(true);
  const [canImages, setCanImages] = useState(true);
  const [canEnq, setCanEnq] = useState(true);
  const [canView, setCanView] = useState(true);

  const loadData = useCallback(() => {
    if (!id) return;
    Promise.all([
      apiFetch<{ property: Property }>(`/api/properties/${id}`),
      apiFetch<{ assignments: CaretakerAssignment[] }>(`/api/properties/${id}/caretakers`),
    ])
      .then(([p, c]) => {
        setProperty(p.property);
        setAssignments(c.assignments);
      })
      .catch((err) => notify(err instanceof Error ? err.message : 'Failed to load property.', 'error'));
  }, [id, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await apiFetch(`/api/properties/${id}/caretakers`, {
        method: 'POST',
        body: JSON.stringify({
          caretakerEmail,
          canEditDetails: canEdit,
          canUploadImages: canImages,
          canManageEnquiries: canEnq,
          canManageViewings: canView,
        }),
      });
      notify('Resident caretaker assigned to this property.', 'success');
      setCaretakerEmail('');
      loadData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not assign caretaker.', 'error');
    }
  };

  const handleRevoke = async (assignmentId: string) => {
    if (!id) return;
    await apiFetch(`/api/properties/${id}/caretakers/${assignmentId}`, { method: 'DELETE' });
    notify('Caretaker assignment revoked.', 'info');
    loadData();
  };

  const handleToggleUnavailable = async () => {
    if (!property) return;
    const nextUnavail = property.listing_status !== 'unavailable';
    await apiFetch(`/api/properties/${property.id}`, {
      method: 'PUT',
      body: JSON.stringify({ markUnavailable: nextUnavail }),
    });
    notify(nextUnavail ? 'Listing marked unavailable.' : 'Listing resubmitted for review.', 'info');
    loadData();
  };

  return (
    <WorkspaceShell
      title={property ? `Manage: ${property.title}` : 'Property Management'}
      subtitle="Explicitly assign resident caretakers and control listing availability."
    >
      {property && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#296a46] capitalize">
                Status: {property.listing_status.replace('_', ' ')}
              </p>
              <h2 className="text-lg font-bold text-[#002517]">{property.title}</h2>
              <p className="text-xs text-[#414844]">
                {property.town}, {property.estate} · {formatKes(property.monthly_rent_kes)}/month
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/host/properties/${property.id}/edit`}
                className="px-3.5 py-2 rounded-lg border border-[#c1c8c2] text-xs font-semibold"
              >
                Edit Listing
              </Link>
              <button
                type="button"
                onClick={handleToggleUnavailable}
                className="px-3.5 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-semibold"
              >
                {property.listing_status === 'unavailable' ? 'Reactivate Listing' : 'Mark Unavailable'}
              </button>
            </div>
          </div>

          <section className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#002517] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#296a46]" />
                <span>Assign Resident Caretaker to This Property</span>
              </h2>
              <p className="text-xs text-[#414844] mt-1">
                Caretakers receive access strictly to this property and only for the permissions checked below.
              </p>
            </div>

            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">
                  Approved Caretaker Email (e.g. brian.caretaker@uninest.ke)
                </label>
                <input
                  type="email"
                  required
                  value={caretakerEmail}
                  onChange={(e) => setCaretakerEmail(e.target.value)}
                  placeholder="caretaker@uninest.ke"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} />
                  <span>Edit permitted details</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={canImages} onChange={(e) => setCanImages(e.target.checked)} />
                  <span>Upload property images</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={canEnq} onChange={(e) => setCanEnq(e.target.checked)} />
                  <span>Respond to enquiries</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={canView} onChange={(e) => setCanView(e.target.checked)} />
                  <span>Manage viewing requests</span>
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-bold"
              >
                Assign Caretaker
              </button>
            </form>

            <div className="pt-4 border-t border-[#c1c8c2]/60 space-y-2">
              <h3 className="text-xs font-bold text-[#414844]">Assignment History</h3>
              {assignments.length === 0 ? (
                <p className="text-xs text-[#414844]">No caretakers assigned to this property.</p>
              ) : (
                assignments.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-[#effdf1]/60 border border-[#c1c8c2]/60 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#002517]">
                        {a.full_name} ({a.email})
                      </p>
                      <p className="text-xs text-[#414844] capitalize">Status: {a.status}</p>
                    </div>
                    {a.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(a.id)}
                        className="text-xs font-semibold text-red-700 hover:underline"
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </WorkspaceShell>
  );
}

export function HostEnquiriesPage() {
  const { notify } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [replyById, setReplyById] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    apiFetch<{ enquiries: Enquiry[] }>('/api/properties/enquiries/mine').then((res) => setEnquiries(res.enquiries));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRespond = async (enquiryId: string, status: 'responded' | 'closed') => {
    try {
      await apiFetch(`/api/properties/enquiries/${enquiryId}/respond`, {
        method: 'PATCH',
        body: JSON.stringify({ reply: replyById[enquiryId] || '', status }),
      });
      notify('Enquiry response saved.', 'success');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to respond.', 'error');
    }
  };

  return (
    <WorkspaceShell title="Property Enquiries" subtitle="Respond to student questions on your authorised listings.">
      {enquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-10 text-center space-y-2">
          <FileText className="w-8 h-8 text-[#296a46] mx-auto opacity-75" />
          <p className="text-base font-bold text-[#002517]">No enquiries yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enquiries.map((enq) => (
            <div key={enq.id} className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-[#002517]">
                    {enq.property_title} — {enq.subject}
                  </h3>
                  <p className="text-xs text-[#414844]">
                    From: {enq.student_name} {enq.student_institution ? `(${enq.student_institution})` : ''} ·{' '}
                    {formatDateShort(enq.created_at)}
                  </p>
                </div>
                <span className="text-xs font-bold capitalize px-3 py-1 rounded-lg bg-[#effdf1] border border-[#c1c8c2]">
                  {enq.status}
                </span>
              </div>
              <p className="text-sm text-[#121e17]">{enq.message}</p>
              {enq.host_reply && (
                <div className="p-3 rounded-xl bg-[#effdf1] text-sm text-[#121e17]">
                  <strong className="text-xs text-[#296a46] block">Previous Reply:</strong>
                  {enq.host_reply}
                </div>
              )}
              {enq.status !== 'closed' && (
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <input
                    type="text"
                    value={replyById[enq.id] || ''}
                    onChange={(e) => setReplyById((prev) => ({ ...prev, [enq.id]: e.target.value }))}
                    placeholder="Write your reply to the student..."
                    className="flex-1 rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRespond(enq.id, 'responded')}
                    className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-bold"
                  >
                    Send Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond(enq.id, 'closed')}
                    className="px-4 py-2 rounded-lg border border-[#c1c8c2] text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

export function HostViewingsPage() {
  const { notify } = useAuth();
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [altDate, setAltDate] = useState('');
  const [altTime, setAltTime] = useState('14:00');

  const load = useCallback(() => {
    apiFetch<{ viewings: ViewingRequest[] }>('/api/properties/viewings/mine').then((res) => setViewings(res.viewings));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: string, extra?: Record<string, string>) => {
    try {
      await apiFetch(`/api/properties/viewings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...extra }),
      });
      notify(`Viewing updated to ${status}.`, 'success');
      setRescheduleId(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update viewing.', 'error');
    }
  };

  return (
    <WorkspaceShell title="Viewing Requests" subtitle="Accept, reschedule, reject, or complete student inspections.">
      {viewings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-10 text-center space-y-2">
          <Calendar className="w-8 h-8 text-[#296a46] mx-auto opacity-75" />
          <p className="text-base font-bold text-[#002517]">No viewing requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {viewings.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-[#002517]">{v.property_title}</h3>
                  <p className="text-xs text-[#414844] tabular-nums">
                    Student: {v.student_name} · {v.requested_date} at {v.requested_time}
                  </p>
                </div>
                <span className="text-xs font-bold capitalize px-3 py-1 rounded-lg bg-[#effdf1] border border-[#c1c8c2]">
                  {v.status}
                </span>
              </div>
              {v.notes && <p className="text-sm text-[#414844]">Notes: {v.notes}</p>}

              <div className="flex flex-wrap gap-2 pt-1">
                {v.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => updateStatus(v.id, 'accepted')}
                      className="px-3.5 py-1.5 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-bold"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setRescheduleId(v.id)}
                      className="px-3.5 py-1.5 rounded-lg border border-[#c1c8c2] text-xs font-semibold"
                    >
                      Propose Alternative Time
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(v.id, 'rejected')}
                      className="px-3.5 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold"
                    >
                      Reject
                    </button>
                  </>
                )}
                {v.status === 'accepted' && (
                  <button
                    type="button"
                    onClick={() => updateStatus(v.id, 'completed')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#296a46] text-white text-xs font-bold"
                  >
                    Mark Completed
                  </button>
                )}
              </div>

              {rescheduleId === v.id && (
                <div className="pt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={altDate}
                    onChange={(e) => setAltDate(e.target.value)}
                    className="rounded-lg border border-[#c1c8c2] px-3 py-1.5 text-xs tabular-nums"
                  />
                  <input
                    type="time"
                    value={altTime}
                    onChange={(e) => setAltTime(e.target.value)}
                    className="rounded-lg border border-[#c1c8c2] px-3 py-1.5 text-xs tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => updateStatus(v.id, 'rescheduled', { proposedDate: altDate, proposedTime: altTime })}
                    className="px-3.5 py-1.5 rounded-lg bg-[#002517] text-[#effdf1] text-xs font-bold"
                  >
                    Send Proposal
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

export function HostProfilePage() {
  const { user, refreshUser, notify } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [businessName, setBusinessName] = useState(user?.hostProfile?.business_or_property_name || '');
  const [operatingTowns, setOperatingTowns] = useState(user?.hostProfile?.operating_towns || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
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
          businessOrPropertyName: businessName,
          operatingTowns,
        }),
      });
      await refreshUser();
      notify('Host profile updated.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceShell title="Host Profile" subtitle="Manage your verified host details and operating towns.">
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
            <label className="block text-xs font-semibold text-[#414844] mb-1">Residence / Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#414844] mb-1">Operating Towns</label>
            <input
              type="text"
              value={operatingTowns}
              onChange={(e) => setOperatingTowns(e.target.value)}
              className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#414844] mb-1">Bio</label>
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
          {saving ? 'Saving...' : 'Save Host Profile'}
        </button>
      </form>
    </WorkspaceShell>
  );
}
