/**
 * Samvid AI - Custom Hooks
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  runFullPipeline,
  translateDocument,
  generateVoice,
  deleteDocument,
  getDocumentResults,
} from '../services/api';
import {
  DocumentResults,
  LanguageCode,
  ProcessingStatus,
  TranslatedContent,
  VoiceRecord,
} from '../types';

// ─────────────────────────────────────────
// useDocumentPipeline
// ─────────────────────────────────────────

export interface PipelineState {
  status: ProcessingStatus | 'idle';
  statusMessage: string;
  uploadProgress: number;
  documentId: string | null;
  results: DocumentResults | null;
  error: string | null;
}

export function useDocumentPipeline() {
  const [state, setState] = useState<PipelineState>({
    status: 'idle',
    statusMessage: '',
    uploadProgress: 0,
    documentId: null,
    results: null,
    error: null,
  });

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      statusMessage: '',
      uploadProgress: 0,
      documentId: null,
      results: null,
      error: null,
    });
  }, []);

  const processDocument = useCallback(async (file: File, documentType: string) => {
    setState(prev => ({
      ...prev,
      status: 'uploading',
      statusMessage: 'Starting...',
      error: null,
      results: null,
      uploadProgress: 0,
    }));

    try {
      const results = await runFullPipeline(file, documentType, {
        onUploadProgress: (pct) =>
          setState(prev => ({ ...prev, uploadProgress: pct })),
        onStatusChange: (msg) => {
          const status = deriveStatus(msg);
          setState(prev => ({
            ...prev,
            statusMessage: msg,
            status,
          }));
        },
        onError: (err) =>
          setState(prev => ({ ...prev, error: err, status: 'failed' })),
      });

      setState(prev => ({
        ...prev,
        status: 'completed',
        statusMessage: 'Analysis complete!',
        documentId: results.document_id,
        results,
        uploadProgress: 100,
      }));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : (err as { error?: string })?.error || 'An unexpected error occurred.';
      setState(prev => ({
        ...prev,
        status: 'failed',
        statusMessage: 'Processing failed',
        error: errorMessage,
      }));
    }
  }, []);

  return { state, processDocument, reset };
}

function deriveStatus(message: string): ProcessingStatus {
  if (message.toLowerCase().includes('upload')) return 'uploading';
  if (message.toLowerCase().includes('extract')) return 'ocr_processing';
  if (message.toLowerCase().includes('analyz')) return 'analyzing';
  if (message.toLowerCase().includes('result')) return 'analyzing';
  return 'uploading';
}

// ─────────────────────────────────────────
// useTranslation
// ─────────────────────────────────────────

export function useTranslation(documentId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatedContent, setTranslatedContent] = useState<TranslatedContent | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('en');
  const cache = useRef<Record<string, TranslatedContent>>({});

  const translate = useCallback(
    async (languageCode: LanguageCode) => {
      if (!documentId) return;
      setActiveLanguage(languageCode);

      if (languageCode === 'en') {
        setTranslatedContent(null);
        return;
      }

      // Check in-memory cache
      if (cache.current[languageCode]) {
        setTranslatedContent(cache.current[languageCode]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await translateDocument(documentId, languageCode);
        if (response.success) {
          cache.current[languageCode] = response.data.translated_content;
          setTranslatedContent(response.data.translated_content);
        } else {
          setError(response.error);
        }
      } catch (err: unknown) {
        setError('Translation failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [documentId]
  );

  return { translate, translatedContent, activeLanguage, isLoading, error };
}

// ─────────────────────────────────────────
// useVoice
// ─────────────────────────────────────────

export function useVoice(documentId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceRecord, setVoiceRecord] = useState<VoiceRecord | null>(null);
  const cache = useRef<Record<string, VoiceRecord>>({});
  useEffect(() => {
    setVoiceRecord(null);
    setError(null);
    cache.current = {};
  }, [documentId]);

  const generateAudio = useCallback(
    async (languageCode: LanguageCode) => {
      if (!documentId) return;

      if (cache.current[languageCode]) {
        setVoiceRecord(cache.current[languageCode]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await generateVoice(documentId, languageCode);
        if (response.success) {
          const record: VoiceRecord = {
            language_code: response.data.language_code,
            language_name: response.data.language_name,
            audio_url: response.data.audio_url,
            duration_estimate_seconds: response.data.duration_estimate_seconds,
            voice_id: response.data.voice_id,
            generated_at: response.data.generated_at,
          };
          cache.current[languageCode] = record;
          setVoiceRecord(record);
        } else {
          setError(response.error);
        }
      } catch (err: unknown) {
        setError('Voice generation failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [documentId]
  );

  const clearVoice = useCallback(() => setVoiceRecord(null), []);

  return { generateAudio, voiceRecord, isLoading, error, clearVoice };
}

// ─────────────────────────────────────────
// useDocumentDelete
// ─────────────────────────────────────────

export function useDocumentDelete() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteDoc = useCallback(async (documentId: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      const response = await deleteDocument(documentId);
      return response.success;
    } catch {
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteDoc, isDeleting };
}
