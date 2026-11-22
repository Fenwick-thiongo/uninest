import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, FileText } from 'lucide-react';
import { PublicLayout } from '../components/Layout';
import { apiFetch, formatDateShort } from '../lib/api';
import type { LegalDocsStatus, PolicyDocumentType } from '../types';

export function PolicyDocumentBody({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <div className="space-y-4 text-sm leading-relaxed text-[#121e17]">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        const lines = trimmed.split('\n');
        const firstLine = lines[0];
        const isHeading =
          /^\d+\.\s+[A-Z0-9 &,/-]+$/.test(firstLine) || /^\[.*DRAFT.*\]$/i.test(firstLine);

        if (isHeading && lines.length > 1) {
          return (
            <section key={idx} className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-[#002517] tracking-tight">{firstLine}</h3>
              <p className="whitespace-pre-line text-[#414844]">{lines.slice(1).join('\n')}</p>
            </section>
          );
        }

        if (/^\[.*DRAFT.*\]$/i.test(trimmed)) {
          return (
            <div
              key={idx}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950"
            >
              {trimmed}
            </div>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-line text-[#414844]">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export function PolicyPage({ documentType }: { documentType: PolicyDocumentType }) {
  const [legalDocs, setLegalDocs] = useState<LegalDocsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<LegalDocsStatus>('/api/auth/legal-documents')
      .then((res) => setLegalDocs(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isHostTerms = documentType === 'host_terms';
  const defaultHeading = isHostTerms ? 'Host Terms & Conditions' : 'Community Standards';
  const title = isHostTerms ? legalDocs?.hostTermsTitle : legalDocs?.communityStandardsTitle;
  const version = isHostTerms ? legalDocs?.hostTermsVersion : legalDocs?.communityStandardsVersion;
  const content = isHostTerms ? legalDocs?.hostTermsContent : legalDocs?.communityStandardsContent;
  const publishedAt = isHostTerms ? legalDocs?.hostTermsPublishedAt : legalDocs?.communityStandardsPublishedAt;

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/apply-host"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#296a46] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Host Application</span>
          </Link>
          <Link
            to={isHostTerms ? '/policies/community-standards' : '/policies/host-terms'}
            className="text-xs font-semibold text-[#414844] hover:text-[#002517] underline"
          >
            Read {isHostTerms ? 'Community Standards' : 'Host Terms & Conditions'} →
          </Link>
        </div>

        <article className="bg-white rounded-2xl border border-[#c1c8c2] p-6 sm:p-8 space-y-6">
          <header className="space-y-2 border-b border-[#c1c8c2]/60 pb-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#296a46]">
              <FileText className="w-4 h-4" />
              <span>UniNest Policy Document</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002517] tracking-tight">
              {title || defaultHeading}
            </h1>
            {version && content ? (
              <p className="text-xs text-[#414844]">
                Published version: <strong className="text-[#002517]">v{version}</strong> · Published on{' '}
                {formatDateShort(publishedAt)}
              </p>
            ) : (
              <p className="text-xs text-amber-800 font-semibold">
                Status: Not yet published by platform administrator
              </p>
            )}
          </header>

          {loading ? (
            <div className="py-10 text-sm text-[#414844]">Loading published policy document...</div>
          ) : content && version ? (
            <PolicyDocumentBody content={content} />
          ) : (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 flex items-start gap-3 text-amber-950">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-bold">{defaultHeading} Not Yet Published</p>
                <p className="text-xs leading-relaxed">
                  This policy document is currently unpublished and awaiting administrator review and approval. Property Owner and Resident Caretaker registration remains temporarily unavailable until both required policies are published under <strong>Admin → Platform Settings</strong>.
                </p>
              </div>
            </div>
          )}
        </article>
      </div>
    </PublicLayout>
  );
}
