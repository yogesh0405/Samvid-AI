/**
 * Samvid AI - Frontend Utilities
 */
import { RiskLevel } from '../types';

// ─── File validation ─────────────────────────────────

export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Unsupported file type. Please upload a PDF, JPG, or PNG file.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large (${formatFileSize(file.size)}). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

// ─── Formatting ───────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata', day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// ─── Risk utilities ──────────────────────────────────

export const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  low: {
    label: 'Low Risk',
    color: '#15803d',
    bg: '#f0fdf4',
    border: '#86efac',
    icon: '✓',
  },
  medium: {
    label: 'Medium Risk',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fcd34d',
    icon: '⚠',
  },
  high: {
    label: 'High Risk',
    color: '#c2410c',
    bg: '#fff7ed',
    border: '#fb923c',
    icon: '!',
  },
  critical: {
    label: 'Critical Risk',
    color: '#991b1b',
    bg: '#fef2f2',
    border: '#fca5a5',
    icon: '‼',
  },
};

export function getRiskConfig(level: RiskLevel) {
  return RISK_CONFIG[level] ?? RISK_CONFIG.medium;
}

// ─── Document type suggestions ──────────────────────

export const DOCUMENT_TYPE_OPTIONS = [
  'Rental / Lease Agreement',
  'Employment Contract',
  'Loan Agreement',
  'Sale Deed / Property Agreement',
  'Power of Attorney',
  'Partnership Agreement',
  'Non-Disclosure Agreement (NDA)',
  'Service Agreement',
  'Insurance Policy',
  'Court Notice / Summons',
  'Government Order',
  'Other',
];

// ─── Processing status labels ────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  idle: 'Ready',
  pending: 'Pending',
  uploading: 'Uploading…',
  uploaded: 'Uploaded',
  ocr_processing: 'Reading document…',
  ocr_complete: 'Text extracted',
  analyzing: 'AI analyzing…',
  completed: 'Analysis complete',
  failed: 'Failed',
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// ─── Progress steps ──────────────────────────────────

export interface ProcessingStep {
  id: string;
  label: string;
  statuses: string[];
}

export const PROCESSING_STEPS: ProcessingStep[] = [
  { id: 'upload', label: 'Upload', statuses: ['uploading', 'uploaded', 'pending'] },
  { id: 'ocr', label: 'Read', statuses: ['ocr_processing', 'ocr_complete'] },
  { id: 'analyze', label: 'Analyze', statuses: ['analyzing'] },
  { id: 'complete', label: 'Done', statuses: ['completed'] },
];

export function getCurrentStepIndex(status: string): number {
  for (let i = 0; i < PROCESSING_STEPS.length; i++) {
    if (PROCESSING_STEPS[i].statuses.includes(status)) return i;
  }
  if (status === 'completed') return PROCESSING_STEPS.length - 1;
  return 0;
}

// ─── Text helpers ─────────────────────────────────────

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '…';
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? singular + 's')}`;
}
