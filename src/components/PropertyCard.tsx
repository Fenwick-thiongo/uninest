import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Heart, MapPin } from 'lucide-react';
import { apiFetch, formatKes } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Property } from '../types';

export function PropertyCard({
  property,
  onToggleSave,
}: {
  property: Property;
  onToggleSave?: (propertyId: string, saved: boolean) => void;
}) {
  const { user, notify } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(Boolean(property.is_saved));
  const [imgError, setImgError] = useState(false);
  const [saving, setSaving] = useState(false);

  const primaryImage = property.images?.[0]?.image_url;

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      notify('Please sign in to save favourite properties.', 'info');
      navigate('/login');
      return;
    }

    setSaving(true);
    try {
      if (saved) {
        await apiFetch(`/api/properties/${property.id}/save`, { method: 'DELETE' });
        setSaved(false);
        onToggleSave?.(property.id, false);
        notify('Removed from saved properties.', 'info');
      } else {
        await apiFetch(`/api/properties/${property.id}/save`, { method: 'POST' });
        setSaved(true);
        onToggleSave?.(property.id, true);
        notify('Saved to your favourites.', 'success');
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update saved state.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="group bg-white rounded-2xl border border-[#c1c8c2]/80 overflow-hidden flex flex-col transition-shadow hover:shadow-md">
      <Link to={`/properties/${property.id}`} className="relative aspect-[4/3] bg-[#effdf1] overflow-hidden block">
        {primaryImage && !imgError ? (
          <img
            src={primaryImage}
            alt={property.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#effdf1] to-[#abefc1]/40 text-[#123b2a] p-4 text-center">
            <Building2 className="w-8 h-8 mb-2 opacity-70" />
            <span className="text-xs font-medium">{property.title}</span>
          </div>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={handleSaveClick}
          aria-label={saved ? 'Remove from saved properties' : 'Save property'}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
            saved
              ? 'bg-[#002517] border-[#002517] text-[#c5f176]'
              : 'bg-white/95 border-[#c1c8c2] text-[#121e17] hover:bg-[#effdf1]'
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
        </button>
      </Link>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-1.5">
          {/* Clean unboxed metadata row (zero-pill rule) */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-[#296a46]">
            <span>{property.property_type}</span>
            <span aria-hidden="true">·</span>
            <span>{property.is_demo ? 'Sample Listing' : 'Verified Listing'}</span>
            {property.distance_to_institution && (
              <>
                <span aria-hidden="true">·</span>
                <span>{property.distance_to_institution}</span>
              </>
            )}
          </div>

          <Link to={`/properties/${property.id}`} className="block">
            <h3 className="text-lg font-bold text-[#002517] group-hover:text-[#296a46] transition-colors leading-snug">
              {property.title}
            </h3>
          </Link>

          <p className="text-sm text-[#414844] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#296a46]" />
            <span className="truncate">
              {property.town}, {property.estate}
              {property.nearby_institution ? ` · Near ${property.nearby_institution}` : ''}
            </span>
          </p>

          {property.amenities?.length > 0 && (
            <p className="text-xs text-[#414844] pt-1 truncate">
              {property.amenities
                .slice(0, 3)
                .map((a) => a.name)
                .join(' · ')}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-[#c1c8c2]/50 flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold text-[#002517] tabular-nums">
              {formatKes(property.monthly_rent_kes)}
              <span className="text-xs font-medium text-[#414844]">/month</span>
            </p>
          </div>
          <Link
            to={`/properties/${property.id}`}
            className="px-3.5 py-2 rounded-lg bg-[#effdf1] text-[#002517] border border-[#c1c8c2] text-xs font-semibold hover:bg-[#c5f176] hover:border-[#296a46] transition-colors whitespace-nowrap shrink-0"
          >
            View Space
          </Link>
        </div>
      </div>
    </article>
  );
}
