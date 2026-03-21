/**
 * Samvid AI - Translation Panel
 * Language selector UI and translated content display.
 */
import React from 'react';
import { SUPPORTED_LANGUAGES, LanguageCode, TranslatedContent } from '../../types';

interface TranslationPanelProps {
  documentId: string | null;
  activeLanguage: LanguageCode;
  translatedContent: TranslatedContent | null;
  isLoading: boolean;
  error: string | null;
  onLanguageSelect: (code: LanguageCode) => void;
}

const TranslationPanel: React.FC<TranslationPanelProps> = ({
  documentId,
  activeLanguage,
  translatedContent,
  isLoading,
  error,
  onLanguageSelect,
}) => {
  if (!documentId) return null;

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #f3f4f6',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #f3f4f6',
        background: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontSize: '20px' }}>🌐</span>
        <div>
          <div style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 700,
            fontSize: '16px',
            color: '#1f2937',
          }}>
            Translate Analysis
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            View the summary in your preferred Indian language
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Language grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '8px',
          marginBottom: '20px',
        }}>
          {SUPPORTED_LANGUAGES.map(lang => {
            const isActive = activeLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => onLanguageSelect(lang.code)}
                disabled={isLoading}
                style={{
                  padding: '10px 8px',
                  borderRadius: '10px',
                  border: `2px solid ${isActive ? '#7c3aed' : '#e5e7eb'}`,
                  background: isActive ? '#faf5ff' : 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  textAlign: 'center' as const,
                  transition: 'all 0.15s ease',
                  opacity: isLoading && !isActive ? 0.6 : 1,
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isActive ? '#7c3aed' : '#374151',
                  marginBottom: '2px',
                }}>
                  {lang.nativeName}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: isActive ? '#a855f7' : '#9ca3af',
                }}>
                  {lang.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div style={{
            textAlign: 'center' as const,
            padding: '32px',
            color: '#7c3aed',
          }}>
            <div style={{
              display: 'inline-block',
              width: '32px',
              height: '32px',
              border: '3px solid #ede9fe',
              borderTopColor: '#7c3aed',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '12px',
            }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              Translating your document...
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div style={{
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            color: '#991b1b',
            fontSize: '14px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Translated content */}
        {translatedContent && !isLoading && activeLanguage !== 'en' && (
          <div>
            <div style={{
              padding: '14px 16px',
              background: '#faf5ff',
              borderRadius: '12px',
              border: '1px solid #ddd6fe',
              marginBottom: '16px',
            }}>
              <div style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 700,
                color: '#5b21b6',
                fontSize: '14px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                🌐 {SUPPORTED_LANGUAGES.find(l => l.code === activeLanguage)?.name} Translation
              </div>
              <div style={{
                fontSize: '15px',
                lineHeight: 1.8,
                color: '#374151',
                whiteSpace: 'pre-wrap' as const,
              }}>
                {translatedContent.plain_language_summary}
              </div>
            </div>

            {translatedContent.actions_to_take_translated?.length > 0 && (
              <div>
                <div style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 700,
                  fontSize: '14px',
                  color: '#1f2937',
                  marginBottom: '10px',
                }}>
                  Actions to Take
                </div>
                {translatedContent.actions_to_take_translated.map((action: any, i: number) => (
                  <div key={i} style={{
                    padding: '10px 14px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    fontSize: '14px',
                    color: '#374151',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}>
                    <span style={{
                      background: '#7c3aed',
                      color: 'white',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    {action.action}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TranslationPanel;
