/**
 * Samvid AI - Upload Component
 * Drag-and-drop file upload with validation, progress tracking, and document type selection.
 */
import React, { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { DOCUMENT_TYPE_OPTIONS, formatFileSize, validateFile } from '../../utils';

interface UploadAreaProps {
  onSubmit: (file: File, documentType: string) => void;
  isProcessing: boolean;
  uploadProgress: number;
  statusMessage: string;
  error: string | null;
}

const UploadArea: React.FC<UploadAreaProps> = ({
  onSubmit,
  isProcessing,
  uploadProgress,
  statusMessage,
  error,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      setSelectedFile(null);
    } else {
      setFileError(null);
      setSelectedFile(file);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleSubmit = () => {
    if (selectedFile && !isProcessing) {
      onSubmit(selectedFile, documentType);
    }
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return '📄';
    if (type.startsWith('image/')) return '🖼️';
    return '📎';
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Drag-and-drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#7c3aed' : selectedFile ? '#6d28d9' : '#c4b5fd'}`,
          borderRadius: '16px',
          padding: '48px 32px',
          textAlign: 'center',
          cursor: isProcessing ? 'default' : 'pointer',
          background: isDragging ? '#f5f3ff' : selectedFile ? '#faf5ff' : 'white',
          transition: 'all 0.2s ease',
          marginBottom: '20px',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={isProcessing}
        />

        {selectedFile ? (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {getFileIcon(selectedFile.type)}
            </div>
            <div style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 600,
              fontSize: '18px',
              color: '#4c1d95',
              marginBottom: '6px',
            }}>
              {selectedFile.name}
            </div>
            <div style={{ color: '#7c3aed', fontSize: '14px', marginBottom: '8px' }}>
              {formatFileSize(selectedFile.size)}
            </div>
            {!isProcessing && (
              <div style={{ color: '#9ca3af', fontSize: '13px' }}>
                Click or drop a different file to change
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>⬆️</div>
            <div style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 600,
              fontSize: '20px',
              color: '#3b0764',
              marginBottom: '8px',
            }}>
              Drop your document here
            </div>
            <div style={{ color: '#6b7280', fontSize: '15px', marginBottom: '16px' }}>
              or click to browse your files
            </div>
            <div style={{
              display: 'inline-flex',
              gap: '8px',
              flexWrap: 'wrap' as const,
              justifyContent: 'center',
            }}>
              {['PDF', 'JPG', 'PNG'].map(fmt => (
                <span key={fmt} style={{
                  padding: '4px 10px',
                  background: '#ede9fe',
                  color: '#5b21b6',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}>
                  {fmt}
                </span>
              ))}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '12px' }}>
              Maximum file size: 50 MB
            </div>
          </div>
        )}
      </div>

      {/* File error */}
      {(fileError || error) && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '10px',
          padding: '12px 16px',
          color: '#991b1b',
          fontSize: '14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
        }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span>{fileError || error}</span>
        </div>
      )}

      {/* Document type */}
      {selectedFile && !isProcessing && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontFamily: "'Sora', sans-serif",
            fontWeight: 600,
            fontSize: '14px',
            color: '#3b0764',
            marginBottom: '8px',
          }}>
            Document Type <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional but recommended)</span>
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1.5px solid #ddd6fe',
              fontSize: '15px',
              color: documentType ? '#3b0764' : '#9ca3af',
              background: 'white',
              outline: 'none',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <option value="">Select document type…</option>
            {DOCUMENT_TYPE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}

      {/* Processing progress */}
      {isProcessing && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}>
            <span style={{
              fontSize: '14px',
              color: '#5b21b6',
              fontWeight: 500,
              fontFamily: "'Sora', sans-serif",
            }}>
              {statusMessage}
            </span>
            {uploadProgress > 0 && (
              <span style={{ fontSize: '13px', color: '#7c3aed' }}>{uploadProgress}%</span>
            )}
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: '#ede9fe',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: uploadProgress > 0 ? `${uploadProgress}%` : '60%',
              height: '100%',
              background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
              borderRadius: '9999px',
              transition: 'width 0.3s ease',
              animation: uploadProgress === 0 ? 'pulse-bar 1.5s ease-in-out infinite' : 'none',
            }} />
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!selectedFile || isProcessing || !!fileError}
        style={{
          width: '100%',
          padding: '14px',
          background: selectedFile && !isProcessing && !fileError
            ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
            : '#e5e7eb',
          color: selectedFile && !isProcessing && !fileError ? 'white' : '#9ca3af',
          border: 'none',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: 700,
          fontFamily: "'Sora', sans-serif",
          cursor: selectedFile && !isProcessing && !fileError ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          letterSpacing: '0.02em',
        }}
      >
        {isProcessing ? '⏳ Processing…' : '🔍 Analyze Document'}
      </button>

      <style>{`
        @keyframes pulse-bar {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default UploadArea;
