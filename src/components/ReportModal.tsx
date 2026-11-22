import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function ReportModal({
  open,
  targetType,
  targetId,
  targetLabel,
  onClose,
}: {
  open: boolean;
  targetType: 'property' | 'discover_post' | 'community_post' | 'user';
  targetId: string;
  targetLabel: string;
  onClose: () => void;
}) {
  const { user, notify } = useAuth();
  const [reason, setReason] = useState('Misleading or suspicious listing details');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      notify('Please sign in to submit a report.', 'info');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/social/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, reason, details }),
      });
      notify('Report submitted. Our moderation team will review it.', 'success');
      setDetails('');
      onClose();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to submit report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl border border-[#c1c8c2] max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#002517]">Report Content</h2>
            <p className="text-xs text-[#414844] mt-0.5 truncate">{targetLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-[#414844] hover:text-[#002517]">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#121e17] mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
            >
              <option value="Misleading or suspicious listing details">Misleading or suspicious listing details</option>
              <option value="Requested upfront fee without viewing">Requested upfront fee without viewing</option>
              <option value="Inappropriate or offensive content">Inappropriate or offensive content</option>
              <option value="Spam or commercial solicitation">Spam or commercial solicitation</option>
              <option value="Safety concern">Safety concern</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#121e17] mb-1">Additional context</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Share what looks inaccurate or unsafe..."
              className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#c1c8c2] text-sm font-medium text-[#121e17]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-semibold hover:bg-[#123b2a] disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
