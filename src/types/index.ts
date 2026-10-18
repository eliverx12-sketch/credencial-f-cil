export type EventStatus = 'active' | 'finished' | 'draft';
export type ParticipantStatus = 'pending' | 'checked_in';
export type LicenseType = 'trial' | 'unlimited';

export interface LicenseInfo {
  status: LicenseType;
  pin: string;
  activatedAt: string;
  expiresAt: string | null; // null for unlimited
  isExpired: boolean;
  daysRemaining: number;
}

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: string;
}

export interface EventItem {
  id: string;
  orgId: string;
  name: string;
  date: string;
  location: string;
  description?: string;
  status: EventStatus;
  logoUrl?: string;
  badgeSubtitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryGroup {
  id: string;
  eventId: string;
  name: string;
  color: string; // Hex color or Tailwind color
  badgeLabel?: string;
}

export interface Participant {
  id: string;
  eventId: string;
  publicCode: string; // e.g. "EVT-000001"
  name: string;
  document?: string; // CPF or RG (never in QR code)
  phone?: string;
  email?: string;
  categoryId: string;
  categoryName?: string;
  company?: string;
  city?: string;
  status: ParticipantStatus;
  checkedInAt?: string | null;
  checkinDevice?: string | null;
  checkinOperator?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckinLog {
  id: string;
  eventId: string;
  participantId: string;
  publicCode: string;
  participantName: string;
  categoryName: string;
  timestamp: string;
  deviceInfo: string;
  operatorName: string;
  isOfflineSync: boolean;
  syncedAt?: string | null;
}

export interface SyncQueueItem {
  id: string;
  participantId: string;
  publicCode: string;
  eventId: string;
  timestamp: string;
  deviceInfo: string;
  operatorName: string;
}

export type BadgeLayout = 'a4-4' | 'a4-6' | 'a4-8' | 'thermal-tag';

export interface AppSettings {
  operatorName: string;
  deviceName: string;
  defaultBadgeLayout: BadgeLayout;
  printShowCompany: boolean;
  printShowCity: boolean;
  printShowBarcode: boolean;
  soundEnabled: boolean;
  cameraDeviceId?: string;
}

export interface ImportPreviewRow {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  category: string;
  company?: string;
  city?: string;
  publicCode?: string;
  isExisting: boolean;
  status: 'new' | 'update' | 'invalid';
  errorMessage?: string;
}

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  newRows: number;
  updateRows: number;
  invalidRows: number;
  rows: ImportPreviewRow[];
}
