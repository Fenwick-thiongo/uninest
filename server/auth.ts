import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db, newId } from './db.ts';

export type UserRole = 'student' | 'owner' | 'caretaker' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export const SESSION_COOKIE_NAME = 'uninest_session';

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function createSession(userId: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').run(
    newId(),
    userId,
    tokenHash,
    expiresAt
  );
  return rawToken;
}

export function deleteSession(rawToken: string): void {
  const tokenHash = hashToken(rawToken);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function getUserFromRequest(req: Request): AuthUser | undefined {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (!rawToken || typeof rawToken !== 'string') return undefined;
  const tokenHash = hashToken(rawToken);
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, p.full_name, p.phone, p.avatar_url
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN profiles p ON p.user_id = u.id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now')`
    )
    .get(tokenHash) as AuthUser | undefined;

  if (!row || row.status !== 'active') return undefined;
  return row;
}

export function attachAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  req.user = getUserFromRequest(req);
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to access this resource' });
      return;
    }
    next();
  };
}

export interface PropertyAccessCheck {
  allowed: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  canEditDetails: boolean;
  canUploadImages: boolean;
  canManageEnquiries: boolean;
  canManageViewings: boolean;
}

/**
 * Enforces explicit property ownership or active caretaker assignment.
 * Caretakers NEVER automatically get access to an owner's other properties.
 */
export function checkPropertyManageAccess(user: AuthUser, propertyId: string): PropertyAccessCheck {
  if (user.role === 'admin') {
    return {
      allowed: true,
      isOwner: false,
      isAdmin: true,
      canEditDetails: true,
      canUploadImages: true,
      canManageEnquiries: true,
      canManageViewings: true,
    };
  }

  const prop = db.prepare('SELECT owner_id FROM properties WHERE id = ?').get(propertyId) as
    | { owner_id: string }
    | undefined;
  if (!prop) {
    return {
      allowed: false,
      isOwner: false,
      isAdmin: false,
      canEditDetails: false,
      canUploadImages: false,
      canManageEnquiries: false,
      canManageViewings: false,
    };
  }

  if (user.role === 'owner' && prop.owner_id === user.id) {
    return {
      allowed: true,
      isOwner: true,
      isAdmin: false,
      canEditDetails: true,
      canUploadImages: true,
      canManageEnquiries: true,
      canManageViewings: true,
    };
  }

  if (user.role === 'caretaker') {
    const assignment = db
      .prepare(
        `SELECT can_edit_details, can_upload_images, can_manage_enquiries, can_manage_viewings
         FROM property_caretakers
         WHERE property_id = ? AND caretaker_id = ? AND status = 'active'`
      )
      .get(propertyId, user.id) as
      | {
          can_edit_details: number;
          can_upload_images: number;
          can_manage_enquiries: number;
          can_manage_viewings: number;
        }
      | undefined;

    if (assignment) {
      return {
        allowed: true,
        isOwner: false,
        isAdmin: false,
        canEditDetails: Boolean(assignment.can_edit_details),
        canUploadImages: Boolean(assignment.can_upload_images),
        canManageEnquiries: Boolean(assignment.can_manage_enquiries),
        canManageViewings: Boolean(assignment.can_manage_viewings),
      };
    }
  }

  return {
    allowed: false,
    isOwner: false,
    isAdmin: false,
    canEditDetails: false,
    canUploadImages: false,
    canManageEnquiries: false,
    canManageViewings: false,
  };
}

export function writeAuditLog(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>
): void {
  db.prepare(
    'INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(newId(), actorId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null);
}

// Real-time SSE clients keyed by userId
const sseClients = new Map<string, Set<Response>>();

export function registerSseClient(userId: string, res: Response): void {
  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId)!.add(res);
}

export function unregisterSseClient(userId: string, res: Response): void {
  const set = sseClients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    sseClients.delete(userId);
  }
}

export function pushRealtimeEvent(userId: string, eventName: string, payload: unknown): void {
  const set = sseClients.get(userId);
  if (!set) return;
  const serialized = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try {
      res.write(serialized);
    } catch {
      // Ignore closed stream
    }
  }
}

export function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string
): void {
  const id = newId();
  db.prepare(
    'INSERT INTO notifications (id, user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, userId, type, title, body, link ?? null);

  pushRealtimeEvent(userId, 'notification', { id, type, title, body, link: link ?? null, is_read: 0 });
}
