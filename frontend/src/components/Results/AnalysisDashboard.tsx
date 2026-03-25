/**
 * Samvid AI - Analysis Dashboard
 * Renders the full legal analysis with Chat, Checklist, Dictionary, and Report features.
 */
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { DocumentResults, LegalAnalysis, RiskLevel, TranslatedContent } from '../../types';
import { getRiskConfig, formatDate, pluralize } from '../../utils';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

interface AnalysisDashboardProps {
  results: DocumentResults;
  translatedContent: TranslatedContent | null;
}

// ─── Risk Badge ──────────────────────────────────────

const RiskBadge: React.FC<{ level: RiskLevel; size?: 'sm' | 'md' | 'lg' }> = ({ level, size = 'md' }) => {
  const config = getRiskConfig(level);
  const padding = size === 'sm' ? '3px 8px' : size === 'lg' ? '8px 20px' : '5px 12px';
  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '16px' : '13px';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding, background: config.bg, color: config.color, border: `1px solid ${config.border}`, borderRadius: '9999px', fontSize, fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap' as const }}>
      {config.icon} {config.label}
    </span>
  );
};

// ─── Section Card ─────────────────────────────────────

const SectionCard: React.FC<{ title: string; icon: string; count?: number; children: React.ReactNode; accentColor?: string }> = ({ title, icon, count, children, accentColor = '#7c3aed' }) => (
  <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '10px', background: '#fafafa' }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '16px', color: '#1f2937', flex: 1 }}>{title}</span>
      {count !== undefined && <span style={{ background: accentColor, color: 'white', borderRadius: '9999px', padding: '2px 10px', fontSize: '13px', fontWeight: 700 }}>{count}</span>}
    </div>
    <div style={{ padding: '16px 20px' }}>{children}</div>
  </div>
);

// ─── Stat Card ────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: React.ReactNode; icon: string }> = ({ label, value, icon }) => (
  <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #f3f4f6', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{icon}</div>
    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>{value}</div>
  </div>
);

// ─── Chat Panel ───────────────────────────────────────

const ChatPanel: React.FC<{ documentId: string }> = ({ documentId }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggested, setSuggested] = useState(['What is the notice period?', 'Are there any penalties?', 'What are my main obligations?', 'What happens if I miss a payment?']);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);
    setSuggested([]);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await axios.post(`${BASE_URL}/documents/${documentId}/chat`, { question, sessionId, history });
      const data = res.data.data;
      setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, confidence: data.confidence, sources: data.sources }]);
      if (data.suggestedQuestions?.length) setSuggested(data.suggestedQuestions);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not process your question. Please try again.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const, height: '560px' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', background: '#f0f4ff' }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '16px', color: '#1f2937' }}>💬 Ask About This Document</div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Ask anything — I'll answer only from your document</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center' as const, padding: '32px', color: '#9ca3af' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🤔</div>
            <div style={{ fontSize: '14px' }}>Ask any question about your document</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%' }}>
              {msg.role === 'user' ? (
                <div style={{ background: '#7c3aed', color: 'white', padding: '10px 16px', borderRadius: '18px 18px 4px 18px', fontSize: '14px' }}>{msg.content}</div>
              ) : (
                <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', padding: '12px 16px', borderRadius: '18px 18px 18px 4px' }}>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7 }}>{msg.content}</div>
                  {msg.confidence && <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', background: msg.confidence === 'high' ? '#f0fdf4' : '#fff7ed', color: msg.confidence === 'high' ? '#15803d' : '#c2410c' }}>{msg.confidence} confidence</span>}
                  {msg.sources?.map((s: any, si: number) => (
                    <div key={si} style={{ marginTop: '6px', fontSize: '12px', background: '#eff6ff', color: '#1d4ed8', padding: '6px 10px', borderRadius: '6px', borderLeft: '2px solid #3b82f6' }}>
                      <strong>{s.label}:</strong> {s.excerpt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex' }}>
            <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', padding: '12px 16px', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0, 150, 300].map(delay => <div key={delay} style={{ width: '8px', height: '8px', background: '#d1d5db', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: `${delay}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {suggested.length > 0 && !loading && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid #f9fafb', display: 'flex', gap: '6px', overflowX: 'auto' as const }}>
          {suggested.slice(0, 3).map((q, i) => (
            <button key={i} onClick={() => sendMessage(q)} style={{ flexShrink: 0, fontSize: '12px', background: '#f9fafb', border: '1px solid #e5e7eb', color: '#4b5563', padding: '4px 12px', borderRadius: '9999px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>{q}</button>
          ))}
        </div>
      )}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage(input)} placeholder="Ask a question about your document..." disabled={loading}
          style={{ flex: 1, fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px', outline: 'none' }} />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
          style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: loading || !input.trim() ? 0.5 : 1 }}>
          Send
        </button>
      </div>
    </div>
  );
};

// ─── Checklist Panel ──────────────────────────────────

const ChecklistPanel: React.FC<{ documentId: string }> = ({ documentId }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState('');
  const CATEGORIES = ['Immediate', 'Before Signing', 'Future Reminders', 'Questions to Ask'];
  const PRIORITY_COLORS: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

  const fetchChecklist = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/documents/${documentId}/checklist`);
      setItems(res.data.data.items || []);
      setGeneratedAt(res.data.data.generatedAt || '');
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchChecklist(); }, [documentId]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${BASE_URL}/documents/${documentId}/checklist/generate`);
      setItems(res.data.data.items || []);
      setGeneratedAt(res.data.data.generatedAt || '');
    } catch { } finally { setGenerating(false); }
  };

  const toggleItem = async (itemId: string, completed: boolean) => {
    setItems(prev => prev.map(i => i.itemId === itemId ? { ...i, completed } : i));
    try { await axios.patch(`${BASE_URL}/documents/${documentId}/checklist/${itemId}`, { completed }); } catch { }
  };

  const completed = items.filter(i => i.completed).length;

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', background: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '16px', color: '#1f2937' }}>✅ What Should I Do Next?</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Personalized action checklist from your document</div>
        </div>
        <button onClick={generate} disabled={generating} style={{ fontSize: '12px', background: 'white', border: '1px solid #86efac', color: '#15803d', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          {generating ? '⏳ Generating...' : items.length > 0 ? '🔄 Regenerate' : '✨ Generate'}
        </button>
      </div>
      {items.length > 0 && (
        <div style={{ padding: '12px 20px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: 600 }}>{completed} of {items.length} completed</span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>{Math.round((completed / items.length) * 100)}%</span>
          </div>
          <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#22c55e', borderRadius: '9999px', width: `${(completed / items.length) * 100}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}
      {items.length === 0 && !loading && (
        <div style={{ textAlign: 'center' as const, padding: '48px', color: '#9ca3af' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
          <div style={{ fontSize: '14px' }}>Click "Generate" to create your action plan</div>
        </div>
      )}
      <div>
        {CATEGORIES.map(cat => {
          const catItems = items.filter(i => i.category === cat);
          if (!catItems.length) return null;
          return (
            <div key={cat} style={{ padding: '16px 20px', borderBottom: '1px solid #f9fafb' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '10px' }}>{cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                {catItems.map(item => (
                  <div key={item.itemId} style={{ display: 'flex', gap: '12px', padding: '10px 14px', border: '1px solid #f3f4f6', borderRadius: '10px', opacity: item.completed ? 0.5 : 1 }}>
                    <input type="checkbox" checked={item.completed} onChange={e => toggleItem(item.itemId, e.target.checked)} style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#22c55e' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: item.completed ? '#9ca3af' : '#1f2937', textDecoration: item.completed ? 'line-through' : 'none' }}>{item.title}</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600, background: PRIORITY_COLORS[item.priority] + '20', color: PRIORITY_COLORS[item.priority] }}>{item.priority}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{item.description}</div>
                      {item.dueDate && <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', fontWeight: 600 }}>📅 {item.dueDate}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Dictionary Panel ─────────────────────────────────

const DictionaryPanel: React.FC<{ documentId: string }> = ({ documentId }) => {
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`${BASE_URL}/documents/${documentId}/dictionary`)
      .then(res => setTerms(res.data.data?.terms || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  const filtered = terms.filter(t => t.term.toLowerCase().includes(search.toLowerCase()) || t.simpleMeaning.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div style={{ padding: '48px', textAlign: 'center' as const, color: '#9ca3af' }}>Loading legal terms...</div>;

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', background: '#faf5ff' }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '16px', color: '#1f2937' }}>📖 Legal Terms Explained</div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Difficult legal words from your document, explained simply</div>
      </div>
      {terms.length > 0 && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search terms..." style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px 14px', outline: 'none', boxSizing: 'border-box' as const }} />
        </div>
      )}
      {terms.length === 0 && <div style={{ textAlign: 'center' as const, padding: '48px', color: '#9ca3af' }}><div style={{ fontSize: '36px', marginBottom: '8px' }}>📚</div><div>No legal terms detected</div></div>}
      <div style={{ maxHeight: '400px', overflowY: 'auto' as const }}>
        {filtered.map((term, i) => (
          <div key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
            <button onClick={() => setExpanded(expanded === term.term ? null : term.term)} style={{ width: '100%', textAlign: 'left' as const, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{term.term.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1f2937' }}>{term.term}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>{term.simpleMeaning}</div>
              </div>
              <span style={{ color: '#d1d5db' }}>{expanded === term.term ? '▲' : '▼'}</span>
            </button>
            {expanded === term.term && (
              <div style={{ padding: '0 20px 14px 64px', display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                <div style={{ background: '#faf5ff', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', marginBottom: '4px' }}>SIMPLE MEANING</div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>{term.simpleMeaning}</div>
                </div>
                {term.contextualMeaning && (
                  <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', marginBottom: '4px' }}>IN YOUR DOCUMENT</div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>{term.contextualMeaning}</div>
                  </div>
                )}
                {term.example && (
                  <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>EXAMPLE</div>
                    <div style={{ fontSize: '13px', color: '#374151', fontStyle: 'italic' }}>{term.example}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Report Panel ─────────────────────────────────────

const ReportPanel: React.FC<{ documentId: string }> = ({ documentId }) => {
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [reportUrl, setReportUrl] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [shareExpiry, setShareExpiry] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${BASE_URL}/documents/${documentId}/report/generate`);
      setReportUrl(res.data.data.reportUrl);
    } catch { } finally { setGenerating(false); }
  };

  const share = async () => {
    setSharing(true);
    try {
      const res = await axios.post(`${BASE_URL}/documents/${documentId}/report/share`);
      setShareUrl(res.data.data.shareUrl);
      setShareExpiry(res.data.data.expiresAt);
    } catch { } finally { setSharing(false); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', background: '#fff7ed' }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '16px', color: '#1f2937' }}>📄 Save & Share Report</div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Download your full analysis or share it securely</div>
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
        <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>📥 Download Report</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Full HTML report with all analysis, risks, checklist and legal terms</div>
            </div>
            <button onClick={generate} disabled={generating} style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, opacity: generating ? 0.7 : 1 }}>
              {generating ? '⏳ Generating...' : 'Generate'}
            </button>
          </div>
          {reportUrl && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, fontSize: '12px', color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {reportUrl.split('?')[0]}
                </div>
                <button onClick={() => window.open(reportUrl, '_blank')} style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                  Open ↗
                </button>
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>⚠️ Link expires in 24 hours. Use Ctrl+P to save as PDF.</div>
            </div>
          )}
        </div>
        {reportUrl && (
          <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>🔗 Share Report</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Create a secure link valid for 7 days</div>
              </div>
              <button onClick={share} disabled={sharing} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, opacity: sharing ? 0.7 : 1 }}>
                {sharing ? '⏳ Creating...' : shareUrl ? 'New Link' : 'Create Link'}
              </button>
            </div>
            {shareUrl && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: '12px', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, fontFamily: 'monospace' }}>
                    {shareUrl}
                  </div>
                  <button onClick={copy} style={{ background: copied ? '#22c55e' : 'white', color: copied ? 'white' : '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                {shareExpiry && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>🕐 Expires: {new Date(shareExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ results, translatedContent }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'risks' | 'actions' | 'chat' | 'checklist' | 'dictionary' | 'report'>('summary');

  const analysis = results.analysis;
  if (!analysis) return null;

  const documentId = results.document_id;
  const summary = translatedContent?.plain_language_summary || analysis.plain_language_summary;
  const keyPoints = translatedContent?.key_points_translated?.length ? translatedContent.key_points_translated : analysis.key_points;
  const obligations = translatedContent?.obligations_translated?.length ? translatedContent.obligations_translated : analysis.obligations;
  const deadlines = translatedContent?.deadlines_translated?.length ? translatedContent.deadlines_translated : analysis.deadlines;
  const actions = translatedContent?.actions_to_take_translated?.length ? translatedContent.actions_to_take_translated : analysis.actions_to_take;

  const tabs = [
    { id: 'summary', label: '📋 Summary' },
    { id: 'details', label: '📑 Details' },
    { id: 'risks', label: `⚠️ Risks (${analysis.risks.length})` },
    { id: 'actions', label: `✅ Actions (${actions.length})` },

  ] as const;

  return (
    <div>
      {/* Header stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <StatCard label="Document Type" value={analysis.document_type_detected} icon="📄" />
        <StatCard label="Overall Risk" value={<RiskBadge level={analysis.overall_risk_level} size="sm" />} icon="🛡️" />
        <StatCard label="Key Points" value={`${analysis.key_points.length} found`} icon="🔑" />
        <StatCard label="Analysed" value={formatDate(analysis.analyzed_at)} icon="🕐" />
      </div>

      {/* Risk summary banner */}
      {analysis.risk_summary && (
        <div style={{ background: getRiskConfig(analysis.overall_risk_level).bg, border: `1px solid ${getRiskConfig(analysis.overall_risk_level).border}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '20px' }}>🛡️</span>
          <div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, color: getRiskConfig(analysis.overall_risk_level).color, marginBottom: '4px', fontSize: '15px' }}>Risk Assessment</div>
            <div style={{ color: getRiskConfig(analysis.overall_risk_level).color, fontSize: '14px', opacity: 0.9, lineHeight: 1.6 }}>{analysis.risk_summary}</div>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto' as const, paddingBottom: '4px' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{ padding: '8px 16px', borderRadius: '9999px', border: 'none', background: activeTab === tab.id ? '#7c3aed' : '#f3f4f6', color: activeTab === tab.id ? 'white' : '#4b5563', fontSize: '14px', fontWeight: 600, fontFamily: "'Sora', sans-serif", cursor: 'pointer', whiteSpace: 'nowrap' as const, transition: 'all 0.15s ease' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Summary */}
      {activeTab === 'summary' && (
        <div>
          <SectionCard title="Plain Language Summary" icon="📋">
            <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#374151', whiteSpace: 'pre-wrap' as const }}>{summary}</div>
          </SectionCard>
          {keyPoints.length > 0 && (
            <SectionCard title="Key Points" icon="🔑" count={keyPoints.length}>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                {keyPoints.map((kp, i) => (
                  <div key={i} style={{ padding: '12px 16px', background: (kp as any).important ? '#faf5ff' : '#f9fafb', borderRadius: '10px', borderLeft: `3px solid ${(kp as any).important ? '#7c3aed' : '#e5e7eb'}` }}>
                    <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '14px', color: '#1f2937', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {(kp as any).important && <span>⭐</span>}{(kp as any).heading}
                    </div>
                    <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>{(kp as any).detail}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <div>
          {obligations.length > 0 && (
            <SectionCard title="Your Obligations" icon="📌" count={obligations.length} accentColor="#0369a1">
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                {obligations.map((ob, i) => (
                  <div key={i} style={{ padding: '12px 16px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' as const, marginBottom: '6px' }}>
                      <span style={{ background: '#0369a1', color: 'white', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700 }}>{(ob as any).party}</span>
                      {(ob as any).frequency && <span style={{ fontSize: '12px', color: '#0369a1' }}>🔄 {(ob as any).frequency}</span>}
                    </div>
                    <div style={{ fontSize: '14px', color: '#1e40af', lineHeight: 1.6 }}>{(ob as any).obligation}</div>
                    {(ob as any).amount && <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 700, color: '#0369a1' }}>💰 {(ob as any).amount}</div>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {deadlines.length > 0 && (
            <SectionCard title="Important Deadlines" icon="⏰" count={deadlines.length} accentColor="#b45309">
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                {deadlines.map((dl, i) => (
                  <div key={i} style={{ padding: '12px 16px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ background: '#f59e0b', color: 'white', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' as const, textAlign: 'center' as const, minWidth: '90px' }}>{(dl as any).date_or_period}</div>
                    <div>
                      <div style={{ fontSize: '14px', color: '#78350f', fontWeight: 600, marginBottom: '4px' }}>{(dl as any).description}</div>
                      {(dl as any).consequence && <div style={{ fontSize: '13px', color: '#92400e' }}>⚠️ If missed: {(dl as any).consequence}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {analysis.penalties.length > 0 && (
            <SectionCard title="Penalties" icon="💸" count={analysis.penalties.length} accentColor="#be123c">
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                {analysis.penalties.map((pen, i) => (
                  <div key={i} style={{ padding: '12px 16px', background: '#fff1f2', borderRadius: '10px', border: '1px solid #fecdd3' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: '13px', color: '#be123c', fontWeight: 600 }}>Trigger: {pen.trigger}</span>
                      <RiskBadge level={pen.risk_level} size="sm" />
                    </div>
                    <div style={{ fontSize: '14px', color: '#881337', lineHeight: 1.6 }}>{pen.penalty_description}</div>
                    {pen.amount_or_severity && <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 700, color: '#be123c' }}>Amount/Severity: {pen.amount_or_severity}</div>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* Tab: Risks */}
      {activeTab === 'risks' && (
        <div>
          {analysis.risks.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: '48px 24px', color: '#15803d', background: '#f0fdf4', borderRadius: '16px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>No High-Risk Clauses Found</div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>The AI did not identify any significantly risky clauses.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
              {analysis.risks.sort((a, b) => { const o = { critical: 0, high: 1, medium: 2, low: 3 }; return o[a.risk_level] - o[b.risk_level]; }).map((risk, i) => {
                const config = getRiskConfig(risk.risk_level);
                return (
                  <div key={i} style={{ background: config.bg, border: `1px solid ${config.border}`, borderRadius: '12px', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' as const }}><RiskBadge level={risk.risk_level} /></div>
                    <div style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic', marginBottom: '8px', padding: '8px 12px', background: 'rgba(0,0,0,0.04)', borderRadius: '8px', lineHeight: 1.6 }}>"{risk.clause_text}"</div>
                    <div style={{ fontSize: '14px', color: config.color, lineHeight: 1.7, marginBottom: '10px' }}>{risk.plain_language_explanation}</div>
                    <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', fontSize: '13px', color: '#1f2937', lineHeight: 1.6 }}><strong>💡 Recommendation:</strong> {risk.recommendation}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Actions */}
      {activeTab === 'actions' && (
        <div>
          {actions.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: '48px 24px', color: '#6b7280' }}>No specific actions identified.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
              {(actions as any[]).sort((a, b) => { const o = { critical: 0, high: 1, medium: 2, low: 3 }; return o[a.priority as RiskLevel] - o[b.priority as RiskLevel]; }).map((action: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '14px 16px', background: 'white', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: getRiskConfig(action.priority).bg, border: `2px solid ${getRiskConfig(action.priority).border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: getRiskConfig(action.priority).color, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', color: '#1f2937', fontWeight: 600, lineHeight: 1.5, marginBottom: '4px' }}>{action.action}</div>
                    {action.deadline && <div style={{ fontSize: '13px', color: '#b45309' }}>⏰ By: {action.deadline}</div>}
                    {action.note && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>ℹ️ {action.note}</div>}
                  </div>
                  <RiskBadge level={action.priority} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Tabs */}





      {/* Disclaimer */}
      <div style={{ marginTop: '24px', padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
        ⚖️ {analysis.disclaimer}
      </div>
    </div>
  );
};

export default AnalysisDashboard;
