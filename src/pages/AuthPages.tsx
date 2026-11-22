import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Building2, CheckCircle2, ExternalLink, FileText, GraduationCap, Shield, UserCheck } from 'lucide-react';
import { PublicLayout, getDashboardPathForRole } from '../components/Layout';
import { apiFetch, formatDateShort, KENYAN_TOWNS } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PolicyDocumentBody } from './PolicyPage';
import type { LegalDocsStatus } from '../types';

export function GetStartedPage() {
  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="text-xs font-semibold text-[#296a46]">Welcome to UniNest</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#002517] tracking-tight">
            Find your space. Start your next chapter.
          </h1>
          <p className="text-sm sm:text-base text-[#414844]">
            Choose how you want to join UniNest. Students and Hosts follow separate verification workflows to keep campus housing safe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-[#effdf1] border border-[#c1c8c2] text-[#002517] flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-[#002517]">I am a University or College Student</h2>
              <p className="text-sm text-[#414844] leading-relaxed">
                Create a student account to save bedsitters and hostels, request viewings, message property hosts, and join campus discussions.
              </p>
            </div>
            <div className="space-y-2.5">
              <Link
                to="/register"
                className="block w-full py-3 rounded-xl bg-[#002517] text-[#effdf1] text-center text-sm font-bold hover:bg-[#123b2a]"
              >
                Register as Student
              </Link>
              <Link
                to="/login"
                className="block w-full py-2.5 rounded-xl border border-[#c1c8c2] text-center text-sm font-semibold text-[#121e17] hover:bg-[#effdf1]"
              >
                Already have an account? Sign In
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-[#002517] text-[#c5f176] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-[#002517]">Property Owner or Resident Caretaker</h2>
              <p className="text-sm text-[#414844] leading-relaxed">
                Submit a host application for administrator verification. If you already have a student account, you can apply using your existing account without creating duplicates.
              </p>
            </div>
            <div className="space-y-2.5">
              <Link
                to="/apply-host"
                className="block w-full py-3 rounded-xl bg-[#c5f176] text-[#002517] text-center text-sm font-bold hover:bg-[#abefc1]"
              >
                Apply as Owner or Caretaker
              </Link>
              <Link
                to="/login"
                className="block w-full py-2.5 rounded-xl border border-[#c1c8c2] text-center text-sm font-semibold text-[#121e17] hover:bg-[#effdf1]"
              >
                Host Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function LoginPage() {
  const { refreshUser, notify } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ role: 'student' | 'owner' | 'caretaker' | 'admin' }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await refreshUser();
      notify('Welcome back to UniNest.', 'success');
      navigate(getDashboardPathForRole(res.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 py-12 space-y-6">
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#002517]">Sign in to UniNest</h1>
            <p className="text-sm text-[#414844] mt-1">Access your student, host, caretaker, or admin workspace.</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.ac.ke"
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#414844]">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-[#296a46] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2.5 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold hover:bg-[#123b2a] disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#c1c8c2]/60 text-xs text-[#414844] flex items-center justify-between">
            <span>New student?</span>
            <Link to="/register" className="font-bold text-[#002517] hover:underline">
              Create student account
            </Link>
          </div>
        </div>

        {/* Seeded QA Role Credentials Helper (populates real login form; authenticates via real API) */}
        <details className="bg-white rounded-2xl border border-[#c1c8c2] p-4 text-xs text-[#414844]">
          <summary className="font-bold text-[#002517] cursor-pointer">
            Development QA Role Accounts (Fill Real Login Form)
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: 'Student (Amina)', email: 'amina.student@uninest.ke', pass: 'UniNest2026!' },
              { label: 'Owner (Kamau)', email: 'kamau.owner@uninest.ke', pass: 'UniNest2026!' },
              { label: 'Caretaker (Brian)', email: 'brian.caretaker@uninest.ke', pass: 'UniNest2026!' },
              { label: 'Admin (UniNest)', email: 'admin@uninest.ke', pass: 'UniNestAdmin2026!' },
            ].map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword(acc.pass);
                }}
                className="text-left p-2.5 rounded-lg border border-[#c1c8c2] hover:bg-[#effdf1] font-medium text-[#121e17]"
              >
                <div className="font-bold text-[#002517]">{acc.label}</div>
                <div className="truncate opacity-80">{acc.email}</div>
              </button>
            ))}
          </div>
        </details>
      </div>
    </PublicLayout>
  );
}

export function StudentRegisterPage() {
  const { refreshUser, notify } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [campus, setCampus] = useState('');
  const [course, setCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('Year 1');
  const [preferredTown, setPreferredTown] = useState('Juja');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch('/api/auth/register-student', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          institution,
          campus,
          course,
          yearOfStudy,
          preferredTown,
        }),
      });
      await refreshUser();
      notify('Welcome to UniNest! Your student account is ready.', 'success');
      navigate('/student');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-semibold text-[#296a46]">Student Registration</p>
            <h1 className="text-2xl font-extrabold text-[#002517] mt-1">Create your UniNest student account</h1>
            <p className="text-sm text-[#414844] mt-1">
              Looking to list properties instead?{' '}
              <Link to="/apply-host" className="font-semibold text-[#296a46] underline">
                Use the Host Application form
              </Link>
              .
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Brian Mwangi"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Kenyan Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 712 345 678"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@students.jkuat.ac.ke"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Password (8+ chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">University or College</label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. JKUAT, KU, UoN, Strathmore"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Campus</label>
                <input
                  type="text"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  placeholder="e.g. Main Campus Juja"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Course</label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. BSc IT"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold hover:bg-[#123b2a] disabled:opacity-50"
            >
              {submitting ? 'Creating Account...' : 'Create Student Account'}
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}

export function HostApplyPage() {
  const { user, refreshUser, notify } = useAuth();
  const [legalDocs, setLegalDocs] = useState<LegalDocsStatus | null>(null);
  const [loadingLegal, setLoadingLegal] = useState(true);

  const [requestedRole, setRequestedRole] = useState<'owner' | 'caretaker'>('owner');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessOrPropertyName, setBusinessOrPropertyName] = useState('');
  const [operatingTowns, setOperatingTowns] = useState('');
  const [nationalIdReference, setNationalIdReference] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  // Mandatory legal acceptances (separate, unchecked by default)
  const [acceptHostTerms, setAcceptHostTerms] = useState(false);
  const [acceptCommunityStandards, setAcceptCommunityStandards] = useState(false);

  // Optional SMS/WhatsApp consent (unchecked by default!)
  const [optInSms, setOptInSms] = useState(false);
  const [optInWhatsapp, setOptInWhatsapp] = useState(false);

  const [viewDoc, setViewDoc] = useState<'terms' | 'standards' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLegalDocs = () => {
    setLoadingLegal(true);
    apiFetch<LegalDocsStatus>('/api/auth/legal-documents')
      .then((res) => setLegalDocs(res))
      .catch(() => {})
      .finally(() => setLoadingLegal(false));
  };

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    loadLegalDocs();
  }, []);

  const hostTermsPublished = Boolean(legalDocs?.hostTermsVersion && legalDocs?.hostTermsContent);
  const commStandardsPublished = Boolean(
    legalDocs?.communityStandardsVersion && legalDocs?.communityStandardsContent
  );

  const hasValidIdentityFields =
    fullName.trim().length >= 2 &&
    phone.trim().length >= 9 &&
    operatingTowns.trim().length >= 2 &&
    nationalIdReference.trim().length >= 4 &&
    (Boolean(user) || (email.trim().includes('@') && password.length >= 8));

  const canSubmit =
    Boolean(legalDocs?.ready) &&
    hostTermsPublished &&
    commStandardsPublished &&
    acceptHostTerms &&
    acceptCommunityStandards &&
    hasValidIdentityFields;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit || !legalDocs?.ready) {
      setError('Complete all required fields and accept both published policies before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/auth/host-applications', {
        method: 'POST',
        body: JSON.stringify({
          requestedRole,
          fullName,
          email: user ? undefined : email,
          phone,
          password: user ? undefined : password,
          businessOrPropertyName,
          operatingTowns,
          nationalIdReference,
          verificationNotes,
          acceptHostTerms,
          acceptCommunityStandards,
          acceptedHostTermsVersion: legalDocs.hostTermsVersion,
          acceptedCommunityStandardsVersion: legalDocs.communityStandardsVersion,
          optInSms,
          optInWhatsapp,
        }),
      });
      await refreshUser();
      notify('Host application submitted for administrator review.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit application.';
      setError(msg);
      if (/newer policy version|does not match the currently published/i.test(msg)) {
        setAcceptHostTerms(false);
        setAcceptCommunityStandards(false);
        loadLegalDocs();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-semibold text-[#296a46]">Host Onboarding & Verification</p>
            <h1 className="text-2xl font-extrabold text-[#002517] mt-1">
              Apply as Property Owner or Resident Caretaker
            </h1>
            <p className="text-sm text-[#414844] mt-1">
              {user
                ? `Applying with your existing account (${user.email}). Your student access remains active while under review.`
                : 'New hosts can apply below. Already have a UniNest student account? Sign in first so your account history is preserved.'}
            </p>
          </div>

          {/* Existing application status screen */}
          {user?.latestHostApplication && (
            <div className="rounded-xl border border-[#c1c8c2] bg-[#effdf1] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#002517] inline-flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#296a46]" />
                  <span>Application Status: {user.latestHostApplication.status.toUpperCase()}</span>
                </span>
                <span className="text-xs text-[#414844] capitalize">
                  Requested: {user.latestHostApplication.requested_role}
                </span>
              </div>
              {user.latestHostApplication.review_notes && (
                <p className="text-xs text-[#414844]">
                  Reviewer notes: {user.latestHostApplication.review_notes}
                </p>
              )}
              {user.latestHostApplication.status === 'approved' && (
                <Link
                  to={getDashboardPathForRole(user.role)}
                  className="inline-block text-xs font-bold text-[#296a46] underline"
                >
                  Open your approved host workspace →
                </Link>
              )}
            </div>
          )}

          {/* Mandatory Policy Compliance Gate */}
          {!loadingLegal && legalDocs && !legalDocs.ready && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2 text-amber-950">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-bold">Host Registration Temporarily Unavailable</p>
                  <p>
                    Property Owner and Resident Caretaker registration is temporarily unavailable because the platform administrator has not yet published the required policy document(s):
                  </p>
                  <ul className="list-disc pl-5 text-xs space-y-0.5">
                    {legalDocs.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <p className="text-xs pt-1">
                    An authorised administrator must review and publish both documents under <strong>Admin → Platform Settings</strong> before host applications can be accepted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-2">Role Applying For</label>
              <div className="grid grid-cols-2 gap-3">
                {(['owner', 'caretaker'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRequestedRole(r)}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      requestedRole === r
                        ? 'bg-[#002517] border-[#002517] text-[#effdf1]'
                        : 'bg-white border-[#c1c8c2] text-[#121e17]'
                    }`}
                  >
                    <div className="text-sm font-bold">
                      {r === 'owner' ? 'Property Owner' : 'Resident Caretaker'}
                    </div>
                    <div className="text-xs opacity-80 mt-0.5">
                      {r === 'owner'
                        ? 'Create listings & assign caretakers'
                        : 'Manage explicitly assigned properties'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Kenyan Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 722 000 000"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
            </div>

            {!user && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#414844] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#414844] mb-1">Password (8+ chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">
                  Property / Residence Name
                </label>
                <input
                  type="text"
                  value={businessOrPropertyName}
                  onChange={(e) => setBusinessOrPropertyName(e.target.value)}
                  placeholder="e.g. Acacia Student Court"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Operating Towns / Estates</label>
                <input
                  type="text"
                  required
                  value={operatingTowns}
                  onChange={(e) => setOperatingTowns(e.target.value)}
                  placeholder="e.g. Juja, Kahawa Sukari"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">
                  National ID / Business Reg Reference
                </label>
                <input
                  type="text"
                  required
                  minLength={4}
                  value={nationalIdReference}
                  onChange={(e) => setNationalIdReference(e.target.value)}
                  placeholder="Last 4 digits or reference"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">
                  Verification Context
                </label>
                <input
                  type="text"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="e.g. Caretaker at Block B since 2024"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Separate Mandatory Legal Acceptance Controls */}
            <div className="pt-3 border-t border-[#c1c8c2]/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#002517]">Mandatory Policies</p>
                {legalDocs?.ready && (
                  <span className="text-[11px] font-medium text-[#296a46]">
                    Read and accept both published policies to submit
                  </span>
                )}
              </div>

              <label className="flex items-start gap-2.5 text-sm text-[#121e17]">
                <input
                  type="checkbox"
                  required
                  disabled={!hostTermsPublished}
                  checked={acceptHostTerms}
                  onChange={(e) => setAcceptHostTerms(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I have read and accept the{' '}
                  {hostTermsPublished ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setViewDoc('terms')}
                        className="font-semibold text-[#296a46] underline hover:text-[#002517]"
                      >
                        Host Terms &amp; Conditions
                      </button>{' '}
                      <span className="text-xs text-[#414844]">
                        (v{legalDocs?.hostTermsVersion} · Published {formatDateShort(legalDocs?.hostTermsPublishedAt)})
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-[#414844]">Host Terms &amp; Conditions</span>{' '}
                      <span className="text-xs text-amber-800">
                        (Not yet published by platform administrator)
                      </span>
                    </>
                  )}
                  .
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-sm text-[#121e17]">
                <input
                  type="checkbox"
                  required
                  disabled={!commStandardsPublished}
                  checked={acceptCommunityStandards}
                  onChange={(e) => setAcceptCommunityStandards(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I have read and accept the{' '}
                  {commStandardsPublished ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setViewDoc('standards')}
                        className="font-semibold text-[#296a46] underline hover:text-[#002517]"
                      >
                        Community Standards
                      </button>{' '}
                      <span className="text-xs text-[#414844]">
                        (v{legalDocs?.communityStandardsVersion} · Published{' '}
                        {formatDateShort(legalDocs?.communityStandardsPublishedAt)})
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-[#414844]">Community Standards</span>{' '}
                      <span className="text-xs text-amber-800">
                        (Not yet published by platform administrator)
                      </span>
                    </>
                  )}
                  .
                </span>
              </label>
            </div>

            {/* Optional SMS / WhatsApp Consent (Unchecked by default, reversible) */}
            <div className="pt-3 border-t border-[#c1c8c2]/60 space-y-2.5">
              <p className="text-xs font-bold text-[#414844]">
                Optional Notification Consent (Unchecked by default · Reversible anytime in Settings)
              </p>
              <label className="flex items-start gap-2.5 text-xs text-[#414844]">
                <input
                  type="checkbox"
                  checked={optInSms}
                  onChange={(e) => setOptInSms(e.target.checked)}
                  className="mt-0.5"
                />
                <span>Optional: Send me SMS alerts for urgent viewing requests once SMS delivery is configured.</span>
              </label>
              <label className="flex items-start gap-2.5 text-xs text-[#414844]">
                <input
                  type="checkbox"
                  checked={optInWhatsapp}
                  onChange={(e) => setOptInWhatsapp(e.target.checked)}
                  className="mt-0.5"
                />
                <span>Optional: Send me WhatsApp alerts for tenant enquiries once WhatsApp integration is configured.</span>
              </label>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="w-full py-3 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold hover:bg-[#123b2a] disabled:opacity-40"
              >
                {!legalDocs?.ready
                  ? 'Registration Temporarily Unavailable — Policies Not Published'
                  : submitting
                  ? 'Submitting Application...'
                  : 'Submit Host Application'}
              </button>
              {legalDocs?.ready && !canSubmit && (
                <p className="text-xs text-center text-[#414844]">
                  Complete all required fields and check both mandatory policy boxes above to submit.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Policy Document Reader Modal */}
      {viewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#c1c8c2] max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#c1c8c2]/60 pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#296a46]">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Published UniNest Policy</span>
                </div>
                <h2 className="text-lg font-extrabold text-[#002517] mt-0.5">
                  {viewDoc === 'terms'
                    ? legalDocs?.hostTermsTitle || 'Host Terms & Conditions'
                    : legalDocs?.communityStandardsTitle || 'Community Standards'}
                </h2>
                <p className="text-xs text-[#414844] mt-0.5">
                  {viewDoc === 'terms'
                    ? legalDocs?.hostTermsVersion
                      ? `Version v${legalDocs.hostTermsVersion} · Published ${formatDateShort(legalDocs.hostTermsPublishedAt)}`
                      : 'Not yet published'
                    : legalDocs?.communityStandardsVersion
                    ? `Version v${legalDocs.communityStandardsVersion} · Published ${formatDateShort(legalDocs.communityStandardsPublishedAt)}`
                    : 'Not yet published'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to={viewDoc === 'terms' ? '/policies/host-terms' : '/policies/community-standards'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#296a46] hover:underline"
                >
                  <span>Full page</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => setViewDoc(null)}
                  className="px-3 py-1.5 rounded-lg border border-[#c1c8c2] text-xs font-semibold text-[#121e17] hover:bg-[#effdf1]"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-[#c1c8c2]/60 p-5 bg-[#effdf1]/40">
              {viewDoc === 'terms' ? (
                legalDocs?.hostTermsContent ? (
                  <PolicyDocumentBody content={legalDocs.hostTermsContent} />
                ) : (
                  <p className="text-sm text-[#414844]">
                    Host Terms &amp; Conditions have not yet been published by the platform administrator.
                  </p>
                )
              ) : legalDocs?.communityStandardsContent ? (
                <PolicyDocumentBody content={legalDocs.communityStandardsContent} />
              ) : (
                <p className="text-sm text-[#414844]">
                  Community Standards have not yet been published by the platform administrator.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {((viewDoc === 'terms' && hostTermsPublished) ||
                (viewDoc === 'standards' && commStandardsPublished)) && (
                <button
                  type="button"
                  onClick={() => {
                    if (viewDoc === 'terms') setAcceptHostTerms(true);
                    else setAcceptCommunityStandards(true);
                    setViewDoc(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#002517] text-[#effdf1] text-xs font-bold hover:bg-[#123b2a]"
                >
                  Mark as Read &amp; Accept
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<{ message: string; emailSent: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string; emailSent: boolean }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-6 sm:p-8 space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold text-[#002517]">Password Recovery</h1>
            <p className="text-sm text-[#414844] mt-1">
              Enter your registered email address to request a password reset token.
            </p>
          </div>

          {result && (
            <div className="rounded-xl border border-[#c1c8c2] bg-[#effdf1] p-4 text-sm text-[#121e17] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#002517]">
                <CheckCircle2 className="w-4 h-4 text-[#296a46]" />
                <span>Recovery Status</span>
              </div>
              <p>{result.message}</p>
              <Link to="/reset-password" className="inline-block text-xs font-bold text-[#296a46] underline">
                Have a reset token? Enter it here →
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold"
            >
              {submitting ? 'Processing...' : 'Request Reset'}
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useAuth();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      notify('Password reset successful. Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-6 sm:p-8 space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold text-[#002517]">Set New Password</h1>
            <p className="text-sm text-[#414844] mt-1">Enter your single-use reset token and a new password.</p>
          </div>
          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#414844] mb-1">Reset Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm font-mono"
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
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold"
            >
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
