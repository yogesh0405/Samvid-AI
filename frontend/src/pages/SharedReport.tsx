/**
 * Samvid AI - Shared Report Viewer
 * Displays reports shared via secure share links
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

interface SharedReportProps {
  shareToken: string;
}

export default function SharedReport({ shareToken }: SharedReportProps) {
  const [reportUrl, setReportUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/reports/shared/${shareToken}`);
        setReportUrl(res.data.data.reportUrl);
        setExpiresAt(res.data.data.expiresAt);
      } catch (err: any) {
        if (err.response?.status === 410) {
          setError('❌ This share link has expired. Please request a new one from the document owner.');
        } else if (err.response?.status === 404) {
          setError('❌ Report not found. The link may be invalid or the report was deleted.');
        } else {
          setError('❌ Failed to load report. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (shareToken) {
      fetchReport();
    }
  }, [shareToken]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f6ff',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937', marginBottom: '8px' }}>
            Loading Report...
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Please wait while we fetch your report.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f6ff',
        padding: '24px',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          border: '1px solid #fca5a5',
          boxShadow: '0 2px 8px rgba(124,58,237,0.07)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#991b1b',
            marginBottom: '12px',
          }}>
            Unable to Load Report
          </div>
          <div style={{
            color: '#6b7280',
            fontSize: '14px',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}>
            {error}
          </div>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!reportUrl) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f6ff',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937', marginBottom: '8px' }}>
            No Report Available
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>The report could not be loaded.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f6ff',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #ede9fe',
        padding: '16px 24px',
        boxShadow: '0 1px 4px rgba(124,58,237,0.07)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#3b0764',
            }}>
              📄 Shared Report
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => window.print()}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #ddd6fe',
                background: '#7c3aed',
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🖨️ Print
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: 'white',
                color: '#6b7280',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ↩ Home
            </button>
          </div>
        </div>
      </header>

      {/* Info banner */}
      {expiresAt && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7, #fef08a)',
          borderBottom: '1px solid #fcd34d',
          padding: '12px 24px',
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            fontSize: '13px',
            color: '#92400e',
            fontWeight: 500,
          }}>
            ⏰ This link expires on {new Date(expiresAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      )}

      {/* Report iframe */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
      }}>
        <iframe
          src={reportUrl}
          style={{
            width: '100%',
            height: '80vh',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(124,58,237,0.07)',
          }}
          title="Shared Report"
        />
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #ede9fe',
        padding: '24px',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '12px',
        marginTop: '40px',
        background: 'white',
      }}>
        <div>
          ⚖️ This report is provided for informational purposes only. Not a substitute for professional legal advice.
        </div>
      </footer>
    </div>
  );
}
