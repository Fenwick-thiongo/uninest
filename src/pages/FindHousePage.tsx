import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { PublicLayout } from '../components/Layout';
import { PropertyCard } from '../components/PropertyCard';
import { apiFetch, KENYAN_TOWNS, PROPERTY_TYPES } from '../lib/api';
import type { Amenity, Property } from '../types';

export default function FindHousePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [town, setTown] = useState(searchParams.get('town') || 'all');
  const [estate, setEstate] = useState(searchParams.get('estate') || '');
  const [minBudget, setMinBudget] = useState(searchParams.get('minBudget') || '');
  const [maxBudget, setMaxBudget] = useState(searchParams.get('maxBudget') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('propertyType') || 'all');
  const [availability, setAvailability] = useState(searchParams.get('availability') || 'all');
  const [amenity, setAmenity] = useState(searchParams.get('amenity') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ amenities: Amenity[] }>('/api/properties/amenities')
      .then((res) => setAmenities(res.amenities))
      .catch(() => {});
  }, []);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (town !== 'all') params.set('town', town);
      if (estate.trim()) params.set('estate', estate.trim());
      if (minBudget) params.set('minBudget', minBudget);
      if (maxBudget) params.set('maxBudget', maxBudget);
      if (propertyType !== 'all') params.set('propertyType', propertyType);
      if (availability !== 'all') params.set('availability', availability);
      if (amenity !== 'all') params.set('amenity', amenity);
      if (sort) params.set('sort', sort);
      params.set('page', String(page));
      params.set('limit', '9');

      const data = await apiFetch<{
        properties: Property[];
        pagination: { total: number; page: number; totalPages: number };
      }>(`/api/properties?${params.toString()}`);

      setProperties(data.properties);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties.');
    } finally {
      setLoading(false);
    }
  }, [q, town, estate, minBudget, maxBudget, propertyType, availability, amenity, sort, page]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (town !== 'all') params.set('town', town);
    if (estate.trim()) params.set('estate', estate.trim());
    if (minBudget) params.set('minBudget', minBudget);
    if (maxBudget) params.set('maxBudget', maxBudget);
    if (propertyType !== 'all') params.set('propertyType', propertyType);
    if (availability !== 'all') params.set('availability', availability);
    if (amenity !== 'all') params.set('amenity', amenity);
    setSearchParams(params);
  };

  const handleReset = () => {
    setQ('');
    setTown('all');
    setEstate('');
    setMinBudget('');
    setMaxBudget('');
    setPropertyType('all');
    setAvailability('all');
    setAmenity('all');
    setSort('newest');
    setPage(1);
    setSearchParams({});
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#296a46]">Accommodation Directory</p>
            <h1 className="text-3xl font-extrabold text-[#002517] tracking-tight mt-1">
              Find a House
            </h1>
            <p className="text-sm text-[#414844] mt-1">
              Filter by town, estate, monthly KSh rent, accommodation type, and amenities.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="sort-select" className="text-xs font-semibold text-[#414844]">
              Sort by
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-[#c1c8c2] bg-white px-3 py-2 text-sm font-medium text-[#121e17]"
            >
              <option value="newest">Newest Listings</option>
              <option value="price_asc">Lowest Rent (KSh)</option>
              <option value="price_desc">Highest Rent (KSh)</option>
              <option value="units">Most Units Available</option>
            </select>
          </div>
        </div>

        {/* Filter Panel */}
        <form onSubmit={handleApplyFilters} className="bg-white rounded-2xl border border-[#c1c8c2] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#c1c8c2]/50">
            <div className="flex items-center gap-2 text-sm font-bold text-[#002517]">
              <SlidersHorizontal className="w-4 h-4 text-[#296a46]" />
              <span>Search & Filters</span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-[#296a46] hover:text-[#002517] inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-1">Keyword or University</label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#414844] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="e.g. JKUAT, bedsitter, studio"
                  className="w-full rounded-lg border border-[#c1c8c2] pl-9 pr-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-1">Town / Area</label>
              <select
                value={town}
                onChange={(e) => {
                  setTown(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
              >
                <option value="all">All Towns</option>
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
                value={estate}
                onChange={(e) => setEstate(e.target.value)}
                placeholder="e.g. High Point, Kahawa Sukari"
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-1">Property Type</label>
              <select
                value={propertyType}
                onChange={(e) => {
                  setPropertyType(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
              >
                <option value="all">All Types</option>
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-1">Min Budget (KSh)</label>
              <input
                type="number"
                min={0}
                step={500}
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-1">Max Budget (KSh)</label>
              <input
                type="number"
                min={0}
                step={500}
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="e.g. 20000"
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-1">Amenity</label>
              <select
                value={amenity}
                onChange={(e) => {
                  setAmenity(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
              >
                <option value="all">Any Amenity</option>
                {amenities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-[#414844] mb-1">Availability</label>
                <select
                  value={availability}
                  onChange={(e) => {
                    setAvailability(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
                >
                  <option value="all">Any</option>
                  <option value="available">Available Now</option>
                  <option value="limited">Limited Units</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-semibold hover:bg-[#123b2a] whitespace-nowrap"
              >
                Apply
              </button>
            </div>
          </div>
        </form>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-[#414844]">
          <span className="tabular-nums font-medium">
            {loading ? 'Searching properties...' : `${total} ${total === 1 ? 'property' : 'properties'} found`}
          </span>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">{error}</div>
        )}

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-[#c1c8c2]/60 h-80 animate-pulse" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-12 text-center space-y-3">
            <h2 className="text-lg font-bold text-[#002517]">No matching properties found</h2>
            <p className="text-sm text-[#414844] max-w-md mx-auto">
              Try widening your monthly budget or clearing one of your estate or amenity filters.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-semibold"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3.5 py-2 rounded-lg border border-[#c1c8c2] bg-white text-sm font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-[#414844] px-3 tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3.5 py-2 rounded-lg border border-[#c1c8c2] bg-white text-sm font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
