import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, Compass, MapPin, MessageSquare, ShieldCheck, UserCheck } from 'lucide-react';
import { PublicLayout } from '../components/Layout';
import { PropertyCard } from '../components/PropertyCard';
import { apiFetch, formatDateShort, KENYAN_TOWNS, PROPERTY_TYPES } from '../lib/api';
import type { CommunityPost, DiscoverPost, Property } from '../types';

export default function HomePage() {
  const navigate = useNavigate();
  const [town, setTown] = useState('all');
  const [maxBudget, setMaxBudget] = useState('');
  const [propertyType, setPropertyType] = useState('all');

  const [featured, setFeatured] = useState<Property[]>([]);
  const [discoverPreview, setDiscoverPreview] = useState<DiscoverPost[]>([]);
  const [communityPreview, setCommunityPreview] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<{ properties: Property[] }>('/api/properties?limit=4'),
      apiFetch<{ posts: DiscoverPost[] }>('/api/social/discover'),
      apiFetch<{ posts: CommunityPost[] }>('/api/social/community/posts'),
    ])
      .then(([propData, discData, commData]) => {
        if (!active) return;
        setFeatured(propData.properties.slice(0, 4));
        setDiscoverPreview(discData.posts.slice(0, 3));
        setCommunityPreview(commData.posts.slice(0, 3));
      })
      .catch(() => {
        // Handled cleanly with empty states
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (town !== 'all') params.set('town', town);
    if (maxBudget) params.set('maxBudget', maxBudget);
    if (propertyType !== 'all') params.set('propertyType', propertyType);
    navigate(`/find-a-house?${params.toString()}`);
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-14 lg:pt-12 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-[#296a46] tracking-wide">
                Student Accommodation in Kenya
              </p>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[#002517] tracking-tight leading-[1.1] text-balance">
                Your next chapter starts with the right place.
              </h1>
              <p className="text-base sm:text-lg text-[#414844] leading-relaxed max-w-xl">
                Find your space. Start your next chapter. Explore student bedsitters, studios, hostels, and shared apartments near Kenyan campuses—connected directly with reviewed property owners and assigned resident caretakers.
              </p>
            </div>

            {/* Search Panel */}
            <form
              onSubmit={handleHeroSearch}
              className="bg-white rounded-2xl border border-[#c1c8c2] p-4 sm:p-5 shadow-sm space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="hero-town" className="block text-xs font-semibold text-[#414844] mb-1">
                    Location
                  </label>
                  <select
                    id="hero-town"
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    className="w-full rounded-lg border border-[#c1c8c2] bg-[#effdf1]/50 px-3 py-2.5 text-sm font-medium text-[#121e17]"
                  >
                    <option value="all">All Kenyan Towns</option>
                    {KENYAN_TOWNS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="hero-budget" className="block text-xs font-semibold text-[#414844] mb-1">
                    Max Monthly Budget
                  </label>
                  <select
                    id="hero-budget"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    className="w-full rounded-lg border border-[#c1c8c2] bg-[#effdf1]/50 px-3 py-2.5 text-sm font-medium text-[#121e17]"
                  >
                    <option value="">Any Budget (KSh)</option>
                    <option value="8000">Up to KSh 8,000</option>
                    <option value="12000">Up to KSh 12,000</option>
                    <option value="18000">Up to KSh 18,000</option>
                    <option value="25000">Up to KSh 25,000</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="hero-type" className="block text-xs font-semibold text-[#414844] mb-1">
                    Property Type
                  </label>
                  <select
                    id="hero-type"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full rounded-lg border border-[#c1c8c2] bg-[#effdf1]/50 px-3 py-2.5 text-sm font-medium text-[#121e17]"
                  >
                    <option value="all">Any Type</option>
                    {PROPERTY_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <p className="text-xs text-[#414844]">
                  Juja · Ruiru · Kahawa · Kilimani · Westlands · Nyali
                </p>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold hover:bg-[#123b2a] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>Find a House</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-2xl overflow-hidden border border-[#c1c8c2] bg-[#123b2a]">
              <img
                src="/src/assets/images/hero_kenya_student_living_1794829251274.jpg"
                alt="Modern sunlit Kenyan university student accommodation courtyard"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#002517]/85 via-[#002517]/40 to-transparent p-6 text-[#effdf1]">
                <p className="text-xs font-semibold text-[#c5f176]">Designed for Kenyan Campus Living</p>
                <p className="text-sm sm:text-base font-medium mt-1">
                  Compare bedsitters, studios, and hostels with transparent monthly KSh pricing and verified viewing requests.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Verification Cards */}
      <section className="bg-white border-y border-[#c1c8c2]/70 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002517] tracking-tight">
              Built around transparent verification and student safety
            </h2>
            <p className="text-sm sm:text-base text-[#414844] mt-2">
              Every host application, caretaker assignment, and property listing follows an explicit approval workflow before going live.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[#c1c8c2] bg-[#effdf1]/50 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#002517] text-[#c5f176] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#002517]">Administrator Listing Review</h3>
              <p className="text-sm text-[#414844] leading-relaxed">
                New listings enter a pending review queue so administrators inspect room details, pricing, and property records before publication.
              </p>
            </div>

            <div className="rounded-2xl border border-[#c1c8c2] bg-[#effdf1]/50 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#002517] text-[#c5f176] flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#002517]">Explicit Caretaker Assignments</h3>
              <p className="text-sm text-[#414844] leading-relaxed">
                Resident caretakers only access properties explicitly assigned to them by verified owners—never blanket portfolio access.
              </p>
            </div>

            <div className="rounded-2xl border border-[#c1c8c2] bg-[#effdf1]/50 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#002517] text-[#c5f176] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#002517]">Protected Viewing & Messaging</h3>
              <p className="text-sm text-[#414844] leading-relaxed">
                Schedule in-person viewings and message hosts inside UniNest without exposing your personal phone number prematurely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Accommodation Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-[#296a46]">Demonstration & Active Database Listings</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002517] tracking-tight mt-1">
              Featured Student Accommodation
            </h2>
          </div>
          <Link
            to="/find-a-house"
            className="text-sm font-bold text-[#002517] hover:text-[#296a46] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Explore all houses</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-[#c1c8c2]/60 h-80 animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-8 text-center text-sm text-[#414844]">
            No approved properties are currently available.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        )}
      </section>

      {/* Discover Preview & Popular Locations */}
      <section className="bg-white border-y border-[#c1c8c2]/70 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          {/* Discover Preview */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold text-[#296a46]">Visual Room Tours</p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002517] tracking-tight mt-1">
                  Explore via Discover
                </h2>
              </div>
              <Link
                to="/discover"
                className="text-sm font-bold text-[#002517] hover:text-[#296a46] inline-flex items-center gap-1.5"
              >
                <Compass className="w-4 h-4" />
                <span>Open Discover Feed</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {discoverPreview.map((post) => (
                <Link
                  key={post.id}
                  to="/discover"
                  className="group relative aspect-[3/4] max-h-96 w-full rounded-2xl overflow-hidden border border-[#c1c8c2] bg-[#123b2a] block"
                >
                  <img
                    src={post.media_url}
                    alt={post.caption}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 text-white space-y-1.5">
                    <p className="text-xs font-semibold text-[#c5f176]">
                      {post.location_tag || 'Kenya'} {post.is_demo ? '· Sample Post' : ''}
                    </p>
                    <p className="text-sm font-medium line-clamp-2">{post.caption}</p>
                    <p className="text-xs text-white/80">By {post.author_name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Popular Kenyan Locations */}
          <div>
            <h2 className="text-2xl font-extrabold text-[#002517] tracking-tight mb-6">
              Popular Student Locations
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { town: 'Juja', desc: 'JKUAT · High Point & Gate C' },
                { town: 'Ruiru', desc: 'KU Ruiru & Zetech Corridor' },
                { town: 'Kahawa', desc: 'Kahawa Sukari & Wendani' },
                { town: 'Thika', desc: 'MKU & Thika Town Estates' },
                { town: 'Kilimani', desc: 'Daystar, Strathmore & UoN' },
                { town: 'Westlands', desc: 'Chiromo & Parklands Access' },
                { town: 'Karen', desc: 'CUEA & Cooperative Area' },
                { town: 'Nyali', desc: 'Mombasa Coastal Campuses' },
              ].map((loc) => (
                <Link
                  key={loc.town}
                  to={`/find-a-house?town=${encodeURIComponent(loc.town)}`}
                  className="rounded-xl border border-[#c1c8c2] bg-[#effdf1]/50 p-4 hover:bg-[#c5f176]/30 hover:border-[#296a46] transition-colors"
                >
                  <div className="flex items-center gap-2 font-bold text-[#002517]">
                    <MapPin className="w-4 h-4 text-[#296a46]" />
                    <span>{loc.town}</span>
                  </div>
                  <p className="text-xs text-[#414844] mt-1">{loc.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Host CTA + Community Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
        <div className="rounded-2xl bg-[#002517] text-[#effdf1] p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-3">
            <p className="text-xs font-semibold text-[#c5f176]">For Property Owners & Resident Caretakers</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Manage student enquiries, viewings, and caretaker assignments in one place.
            </h2>
            <p className="text-sm sm:text-base text-[#abefc1]/90 max-w-2xl">
              Apply as a Property Owner or Resident Caretaker. Existing student accounts retain full student access while applications undergo verification.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
            <Link
              to="/apply-host"
              className="px-6 py-3 rounded-xl bg-[#c5f176] text-[#002517] text-sm font-bold hover:bg-[#abefc1] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Building2 className="w-4 h-4" />
              <span>Apply to List Property</span>
            </Link>
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold text-[#296a46]">Student Conversations</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002517] tracking-tight mt-1">
                From the Community
              </h2>
            </div>
            <Link
              to="/community"
              className="text-sm font-bold text-[#002517] hover:text-[#296a46] inline-flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Join discussions</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {communityPreview.map((post) => (
              <Link
                key={post.id}
                to="/community"
                className="bg-white rounded-2xl border border-[#c1c8c2] p-5 hover:shadow-sm transition-shadow flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#296a46]">
                    {post.category_name} · {formatDateShort(post.created_at)}
                  </div>
                  <h3 className="font-bold text-[#002517] leading-snug">{post.title}</h3>
                  <p className="text-sm text-[#414844] line-clamp-3">{post.body}</p>
                </div>
                <div className="text-xs text-[#414844] pt-3 border-t border-[#c1c8c2]/50 flex items-center justify-between">
                  <span>{post.author_name}</span>
                  <span className="tabular-nums">{post.comments_count} replies</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
