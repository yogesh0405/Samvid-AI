// Samvid AI - Frontend TypeScript Type Definitions

export type ProcessingStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'ocr_processing'
  | 'ocr_complete'
  | 'analyzing'
  | 'completed'
  | 'failed';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type LanguageCode =
  | 'hi' | 'ta' | 'te' | 'bn' | 'mr'
  | 'gu' | 'kn' | 'ml' | 'pa' | 'or' | 'en';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
];

// ─── Upload ───────────────────────────────────────────

export interface UploadRequest {
  file_name: string;
  file_size: number;
  mime_type: string;
  document_type?: string;
}

export interface UploadResponse {
  document_id: string;
  upload_url: string;
  s3_key: string;
  expires_in: number;
}

// ─── Analysis ─────────────────────────────────────────

export interface KeyPoint {
  heading: string;
  detail: string;
  important: boolean;
}

export interface Obligation {
  party: string;
  obligation: string;
  frequency?: string;
  amount?: string;
}

export interface Deadline {
  description: string;
  date_or_period: string;
  consequence?: string;
  priority: RiskLevel;
}

export interface Penalty {
  trigger: string;
  penalty_description: string;
  amount_or_severity?: string;
  risk_level: RiskLevel;
}

export interface RiskClause {
  clause_text: string;
  plain_language_explanation: string;
  risk_level: RiskLevel;
  recommendation: string;
}

export interface ActionItem {
  action: string;
  priority: RiskLevel;
  deadline?: string;
  note?: string;
}

export interface LegalAnalysis {
  plain_language_summary: string;
  document_type_detected: string;
  language_detected: string;
  key_points: KeyPoint[];
  obligations: Obligation[];
  deadlines: Deadline[];
  penalties: Penalty[];
  risks: RiskClause[];
  actions_to_take: ActionItem[];
  overall_risk_level: RiskLevel;
  risk_summary: string;
  disclaimer: string;
  model_used: string;
  analyzed_at: string;
}

// ─── Translation ──────────────────────────────────────

export interface TranslatedContent {
  plain_language_summary: string;
  key_points_translated: KeyPoint[];
  obligations_translated: Obligation[];
  deadlines_translated: Deadline[];
  actions_to_take_translated: ActionItem[];
}

export interface TranslationRecord {
  target_language: string;
  target_language_name: string;
  translated_content: TranslatedContent;
  translated_at: string;
}

// ─── Voice ────────────────────────────────────────────

export interface VoiceRecord {
  language_code: string;
  language_name: string;
  audio_url: string;
  duration_estimate_seconds?: number;
  voice_id: string;
  generated_at: string;
}

// ─── Results ──────────────────────────────────────────

export interface DocumentMetadataResult {
  file_name: string;
  file_size: number;
  mime_type: string;
  document_type?: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
}

export interface OcrResult {
  word_count: number;
  page_count: number;
  confidence_score?: number;
  processed_at: string;
  text_preview?: string;
}

export interface DocumentResults {
  document_id: string;
  status: ProcessingStatus;
  metadata?: DocumentMetadataResult;
  ocr?: OcrResult;
  analysis?: LegalAnalysis;
  translations?: Record<string, TranslationRecord>;
  voice?: Record<string, VoiceRecord>;
}

// ─── API Responses ────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  error_code: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── UI State ─────────────────────────────────────────

export interface UploadState {
  file: File | null;
  documentId: string | null;
  uploadProgress: number;
  status: ProcessingStatus | 'idle';
  error: string | null;
}

export interface AppState {
  upload: UploadState;
  results: DocumentResults | null;
  selectedLanguage: LanguageCode;
  activeTranslation: TranslatedContent | null;
  activeVoice: VoiceRecord | null;
  isLoadingTranslation: boolean;
  isLoadingVoice: boolean;
}
