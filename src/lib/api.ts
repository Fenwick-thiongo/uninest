export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options?.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function formatKes(amount: number): string {
  return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const KENYAN_TOWNS = [
  'Juja',
  'Ruiru',
  'Kahawa',
  'Thika',
  'Kilimani',
  'Westlands',
  'Karen',
  'Nyali',
];

export const PROPERTY_TYPES = [
  'Bedsitter',
  'Single Room',
  'Studio',
  'Shared Room',
  'Hostel',
  '1-Bedroom Apartment',
  '2-Bedroom Apartment',
  'Other',
];
