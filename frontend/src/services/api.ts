/**
 * Samvid AI - API Service Layer
 * Centralized axios-based API client for all backend communication.
 */
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ApiResponse,
  DocumentResults,
  TranslatedContent,
  UploadRequest,
  UploadResponse,
  VoiceRecord,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,  // Reduced from 30s for faster feedback
});

// Response interceptor for consistent error handling
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API] ✓ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const url = error.config?.url || 'unknown';
    const status = error.response?.status || 'timeout';
    console.error(`[API] ✗ ${status} ${url}`, error.message);
    if (error.response?.data) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject({
      success: false,
      error: error.message || 'Network error. Please check your connection.',
      error_code: 'NETWORK_ERROR',
    });
  }
);

// ─────────────────────────────────────────
// Upload
// ─────────────────────────────────────────

/**
 * Step 1: Create document record and get presigned upload URL
 */
export async function createUploadSession(
  payload: UploadRequest
): Promise<ApiResponse<UploadResponse>> {
  const response = await apiClient.post('/documents/upload', payload);
  return response.data;
}

/**
 * Step 2: Upload file directly to S3 using presigned URL
 */
export async function uploadFileToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (percentage: number) => void
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentage);
      }
    },
    // Don't use the API client interceptors for S3 direct upload
    timeout: 120_000,
  });
}

// ─────────────────────────────────────────
// OCR
// ─────────────────────────────────────────

export async function runOcr(documentId: string): Promise<ApiResponse<{
  document_id: string;
  word_count: number;
  page_count: number;
  confidence_score: number;
  status: string;
}>> {
  const response = await apiClient.post(`/documents/${documentId}/ocr`);
  return response.data;
}

// ─────────────────────────────────────────
// Analysis
// ─────────────────────────────────────────

export async function analyzeDocument(documentId: string): Promise<ApiResponse<{
  document_id: string;
  status: string;
  overall_risk_level: string;
  document_type_detected: string;
  key_points_count: number;
  risks_count: number;
  model_used: string;
}>> {
  const response = await apiClient.post(`/documents/${documentId}/analyze`, {}, {
    timeout: 120_000, // AI analysis can take longer
  });
  return response.data;
}

// ─────────────────────────────────────────
// Results
// ─────────────────────────────────────────

export async function getDocumentResults(
  documentId: string
): Promise<ApiResponse<DocumentResults>> {
  const response = await apiClient.get(`/documents/${documentId}/results`);
  return response.data;
}

// ─────────────────────────────────────────
// Translation
// ─────────────────────────────────────────

export async function translateDocument(
  documentId: string,
  targetLanguage: string
): Promise<ApiResponse<{
  document_id: string;
  language: string;
  language_name: string;
  translated_content: TranslatedContent;
  cached: boolean;
}>> {
  const response = await apiClient.post(
    `/documents/${documentId}/translate`,
    { target_language: targetLanguage },
    { timeout: 60_000 }
  );
  return response.data;
}

// ─────────────────────────────────────────
// Voice
// ─────────────────────────────────────────

export async function generateVoice(
  documentId: string,
  languageCode: string
): Promise<ApiResponse<VoiceRecord & { document_id: string; cached: boolean }>> {
  const response = await apiClient.post(
    `/documents/${documentId}/voice`,
    { language_code: languageCode },
    { timeout: 60_000 }
  );
  return response.data;
}

// ─────────────────────────────────────────
// Deletion
// ─────────────────────────────────────────

export async function deleteDocument(
  documentId: string
): Promise<ApiResponse<{ document_id: string; deleted: boolean }>> {
  const response = await apiClient.delete(`/documents/${documentId}`);
  return response.data;
}

// ─────────────────────────────────────────
// Full Pipeline Helper
// ─────────────────────────────────────────

export interface PipelineCallbacks {
  onUploadProgress?: (pct: number) => void;
  onStatusChange?: (status: string) => void;
  onError?: (msg: string) => void;
}

/**
 * Runs the full document processing pipeline:
 * Upload → OCR → Analyze → Fetch Results
 */
export async function runFullPipeline(
  file: File,
  documentType: string,
  callbacks: PipelineCallbacks = {}
): Promise<DocumentResults> {
  const { onUploadProgress, onStatusChange, onError } = callbacks;

  // Step 1: Create upload session
  onStatusChange?.('Preparing upload...');
  const uploadSession = await createUploadSession({
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    document_type: documentType || undefined,
  });

  if (!uploadSession.success) {
    throw new Error(uploadSession.error);
  }

  const { document_id, upload_url } = uploadSession.data;

  // Step 2: Upload to S3
  onStatusChange?.('Uploading document...');
  await uploadFileToS3(upload_url, file, onUploadProgress);

  // Step 3: OCR
  onStatusChange?.('Extracting text from document...');
  const ocrResult = await runOcr(document_id);
  if (!ocrResult.success) {
    throw new Error(ocrResult.error);
  }

  // Step 4: AI Analysis
  onStatusChange?.('Analyzing document with AI...');
  const analysisResult = await analyzeDocument(document_id);
  if (!analysisResult.success) {
    throw new Error(analysisResult.error);
  }

  // Step 5: Fetch full results
  onStatusChange?.('Fetching results...');
  const resultsResponse = await getDocumentResults(document_id);
  if (!resultsResponse.success) {
    throw new Error(resultsResponse.error);
  }

  return resultsResponse.data;
}
