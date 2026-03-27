/**
 * Samvid AI - Root Application Component
 * Orchestrates the full document analysis workflow.
 */
import React, { useState, useEffect } from 'react';
import UploadArea from './components/Upload/UploadArea';
import AnalysisDashboard from './components/Results/AnalysisDashboard';
import TranslationPanel from './components/Translation/TranslationPanel';
import VoicePanel from './components/Voice/VoicePanel';
import ProcessingStepper from './components/Layout/ProcessingStepper';
import { useDocumentPipeline, useTranslation, useVoice, useDocumentDelete } from './hooks';
import { LanguageCode } from './types';
import FloatingChat from './components/Chat/FloatingChat';
import ToolsPage from './pages/ToolsPage';
import CourtDateTracker from './pages/CourtDateTracker';
import IPCSectionExplainer from './pages/IPCSectionExplainer';
import LegalDocGenerator from './pages/LegalDocGenerator';
import LawyerFinder from './pages/LawyerFinder';
import FeaturesHub from './components/Features/FeaturesHub';
import DocumentComparison from './pages/DocumentComparison';
import SharedReport from './pages/SharedReport';

export default function App() {
  const { state: pipeline, processDocument, reset } = useDocumentPipeline();
  const { translate, translatedContent, activeLanguage, isLoading: isTranslating, error: translateError } =
    useTranslation(pipeline.documentId);
  const { generateAudio, voiceRecord, isLoading: isGeneratingVoice, error: voiceError } =
    useVoice(pipeline.documentId);
  const { deleteDoc, isDeleting } = useDocumentDelete();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [sharedReportToken, setSharedReportToken] = useState<string | null>(null);

  // Check for shared report link on mount
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/shared\/([a-f0-9]+)/);
    if (match && match[1]) {
      setSharedReportToken(match[1]);
    }
  }, []);

  const handleDelete = async () => {
    if (pipeline.documentId) {
      await deleteDoc(pipeline.documentId);
    }
    setShowDeleteConfirm(false);
    reset();
  };

  const isProcessing = ['uploading', 'ocr_processing', 'analyzing', 'uploaded', 'ocr_complete', 'pending'].includes(
    pipeline.status
  );
  const isComplete = pipeline.status === 'completed';
  const isFailed = pipeline.status === 'failed';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f6ff',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* ── Shared Report Page (standalone) ── */}
      {sharedReportToken && <SharedReport shareToken={sharedReportToken} />}

      {/* ── Main App Content ── */}
      {!sharedReportToken && (
        <>
      <header style={{
        background: 'white',
        borderBottom: '1px solid #ede9fe',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(124,58,237,0.07)',
      }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '96px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Samvid AI"
              style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }}
            />
            <div>
              <div style={{
                fontFamily: "'Sora', sans-serif",
              fontWeight: 800,
              fontSize: '38px',
              color: '#3b0764',
              lineHeight: 1,
              }}>
                Samvid AI
              </div>
              <div style={{ fontSize: '15px', color: '#9ca3af', letterSpacing: '0.05em' }}>
                LEGAL DOCUMENT ASSISTANT
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isComplete && (
              <button
                onClick={() => setActivePage('tools')}
                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #ddd6fe', background: '#7c3aed', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                🛠️ Tools
              </button>
            )}
            {isComplete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid #fca5a5',
                  background: 'white',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🗑️ Delete & Reset
              </button>
            )}
            {(isComplete || isFailed) && (
              <button
                onClick={reset}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid #ddd6fe',
                  background: '#faf5ff',
                  color: '#7c3aed',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ↩ New Document
              </button>
            )}
            <div style={{
              padding: '6px 12px',
              background: '#ede9fe',
              color: '#5b21b6',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 700,
            }}>
              🇮🇳 India
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Hero (only on idle) ── */}
        {pipeline.status === 'idle' && (
          <div style={{ textAlign: 'center' as const, marginBottom: '48px' }}>
            <div style={{
              display: 'inline-block',
              padding: '6px 16px',
              background: '#ede9fe',
              color: '#5b21b6',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '16px',
              letterSpacing: '0.05em',
            }}>
              🚀 AI-Powered · Free · Private · 10 Indian Languages
            </div>
            <h1 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 800,
              color: '#1a0533',
              lineHeight: 1.2,
              marginBottom: '16px',
            }}>
              Understand Any Legal Document<br />
              <span style={{ color: '#7c3aed' }}>in Plain Language</span>
            </h1>
            <p style={{
              fontSize: '17px',
              color: '#4b5563',
              lineHeight: 1.7,
              maxWidth: '600px',
              margin: '0 auto 40px',
            }}>
              Upload your rental agreement, loan document, employment contract, or any legal paper.
              Samvid AI will explain what it means for you — simply, clearly, and in your language.
            </p>

            {/* Feature pills */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap' as const,
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '48px',
            }}>
              {[
                '📄 PDF, JPG, PNG',
                '🔍 AI Legal Analysis',
                '⚠️ Risk Detection',
                '🌐 10 Languages',
                '🎧 Voice Explanation',
                '🔒 Auto-deleted in 24h',
              ].map(feat => (
                <span key={feat} style={{
                  padding: '8px 16px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  color: '#374151',
                  fontWeight: 500,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}>
                  {feat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Processing stepper ── */}
        {isProcessing && (
          <ProcessingStepper status={pipeline.status} statusMessage={pipeline.statusMessage} />
        )}

        {/* ── Failed state ── */}
        {isFailed && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '14px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center' as const,
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>❌</div>
            <div style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: '18px',
              color: '#991b1b',
              marginBottom: '8px',
            }}>
              Processing Failed
            </div>
            <div style={{ color: '#b91c1c', fontSize: '14px', marginBottom: '16px' }}>
              {pipeline.error || 'An unexpected error occurred. Please try again.'}
            </div>
            <button
              onClick={reset}
              style={{
                padding: '10px 24px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Upload section ── */}
        {!isComplete && (
          <section style={{
            background: 'white',
            borderRadius: '20px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(124,58,237,0.07)',
            border: '1px solid #ede9fe',
            marginBottom: '32px',
          }}>
            <UploadArea
              onSubmit={processDocument}
              isProcessing={isProcessing}
              uploadProgress={pipeline.uploadProgress}
              statusMessage={pipeline.statusMessage}
              error={pipeline.error}
            />
          </section>
        )}

        {/* ── Tools Page ── */}
        {isComplete && showTools && (
          <ToolsPage
            documentId={pipeline.documentId || ''}
            documentName={pipeline.results?.metadata?.file_name}
            onBack={() => setActivePage(null)}
          />
        )}

        {isComplete && pipeline.documentId && activePage === 'court' && <CourtDateTracker documentId={pipeline.documentId} onBack={() => setActivePage(null)} />}
        {isComplete && pipeline.documentId && activePage === 'ipc' && <IPCSectionExplainer documentId={pipeline.documentId} onBack={() => setActivePage(null)} />}
        {isComplete && pipeline.documentId && activePage === 'docgen' && <LegalDocGenerator documentId={pipeline.documentId} onBack={() => setActivePage(null)} />}
        {isComplete && pipeline.documentId && activePage === 'lawyer' && <LawyerFinder documentId={pipeline.documentId} onBack={() => setActivePage(null)} />}
        {isComplete && pipeline.documentId && activePage === 'compare' && <DocumentComparison documentId={pipeline.documentId} onBack={() => setActivePage(null)} />}
        {isComplete && pipeline.documentId && activePage === 'tools' && <ToolsPage documentId={pipeline.documentId} documentName={pipeline.results?.metadata?.file_name} onBack={() => setActivePage(null)} />}

        {/* ── Results layout ── */}
        {isComplete && pipeline.results && !activePage && (
          <>
          <div>
            {/* Success banner */}
            <div style={{
              background: 'linear-gradient(135deg, #4c1d95, #6d28d9)',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              color: 'white',
              flexWrap: 'wrap' as const,
            }}>
              <div style={{ fontSize: '36px' }}>✅</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 700,
                  fontSize: '18px',
                  marginBottom: '4px',
                }}>
                  Your document has been analyzed!
                </div>
                <div style={{ opacity: 0.8, fontSize: '14px' }}>
                  {pipeline.results.metadata?.file_name} ·{' '}
                  {pipeline.results.analysis?.document_type_detected} ·{' '}
                 
                </div>
              </div>
            </div>

            {/* Two-column layout */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
              gap: '24px',
              alignItems: 'start',
            }}>
              {/* Left: Analysis dashboard */}
              <div>
                <AnalysisDashboard
                  results={pipeline.results}
                  translatedContent={translatedContent}
                />
              </div>

              {/* Right: Translation + Voice */}
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>
                <TranslationPanel
                  documentId={pipeline.documentId}
                  activeLanguage={activeLanguage}
                  translatedContent={translatedContent}
                  isLoading={isTranslating}
                  error={translateError}
                  onLanguageSelect={(code: LanguageCode) => translate(code)}
                />
                <VoicePanel
                  documentId={pipeline.documentId}
                  activeLanguage={activeLanguage}
                  voiceRecord={voiceRecord}
                  isLoading={isGeneratingVoice}
                  error={voiceError}
                  onGenerate={generateAudio}
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => setActivePage('tools')}
            style={{
              position: "fixed",
              bottom: "92px",
              right: "24px",
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(249,115,22,0.4)",
              zIndex: 999,
              transition: "all 0.2s ease",
            }}
            title="Open Tools"
          >
            🛠️
          </button>
          <FeaturesHub
            documentId={pipeline.documentId || ''}
            documentType={pipeline.results?.analysis?.document_type_detected}
            onOpenTools={() => setActivePage('tools')}
            onOpenCourtTracker={() => setActivePage('court')}
            onOpenIPC={() => setActivePage('ipc')}
            onOpenDocGen={() => setActivePage('docgen')}
            onOpenLawyerFinder={() => setActivePage('lawyer')}
            onOpenComparison={() => setActivePage('compare')}
          />
          <FloatingChat documentId={pipeline.documentId || ''} />
          </>
        )}

        {/* ── How it works (idle only) ── */}
        {pipeline.status === 'idle' && (
          <section style={{ marginTop: '64px' }}>
            <h2 style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: '24px',
              color: '#1a0533',
              textAlign: 'center' as const,
              marginBottom: '32px',
            }}>
              How Samvid AI Works
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
            }}>
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i} style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #ede9fe',
                  textAlign: 'center' as const,
                }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>{step.icon}</div>
                  <div style={{
                    fontFamily: "'Sora', sans-serif",
                    fontWeight: 700,
                    fontSize: '15px',
                    color: '#3b0764',
                    marginBottom: '8px',
                  }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                    {step.description}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid #ede9fe',
        padding: '24px',
        textAlign: 'center' as const,
        color: '#9ca3af',
        fontSize: '13px',
        marginTop: '64px',
      }}>
        <div style={{ marginBottom: '8px' }}>
          ⚖️ Samvid AI is an informational tool only. It is not a substitute for professional legal advice.
          Always consult a qualified lawyer for legal decisions.
        </div>
        <div>
          Documents are automatically deleted after 24 hours. Built for 🇮🇳 India.
        </div>
      </footer>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed' as const,
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center' as const,
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
            <div style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: '20px',
              color: '#1f2937',
              marginBottom: '8px',
            }}>
              Delete Document?
            </div>
            <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
              This will permanently delete your document and all associated analysis, translations,
              and audio from our servers.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#dc2626',
                  color: 'white',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { -webkit-font-smoothing: antialiased; }

        @media (max-width: 768px) {
          main > div > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const HOW_IT_WORKS = [
  {
    icon: '⬆️',
    title: 'Upload Your Document',
    description: 'Upload any PDF, JPG, or PNG file up to 50 MB. Your document is securely encrypted.',
  },
  {
    icon: '🔍',
    title: 'AI Reads the Document',
    description: 'AWS Textract extracts all text, even from scanned documents and images.',
  },
  {
    icon: '⚖️',
    title: 'Legal Analysis',
    description: 'GPT-4o simplifies complex legal language and identifies risks, deadlines, and obligations.',
  },
  {
    icon: '🌐',
    title: 'Your Language',
    description: 'Read and listen to the analysis in Hindi, Tamil, Telugu, Bengali, and 7 more Indian languages.',
  },
];
