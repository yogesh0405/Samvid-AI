/**
 * Samvid AI - Tools Page
 * Checklist, Dictionary, and Report in one dedicated page.
 */
import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";

interface ToolsPageProps {
  documentId: string;
  documentName?: string;
  onBack: () => void;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: "#fef2f2", text: "#ef4444" },
  medium: { bg: "#fffbeb", text: "#f59e0b" },
  low: { bg: "#f0fdf4", text: "#22c55e" },
};

const CATEGORIES = ["Immediate", "Before Signing", "Future Reminders", "Questions to Ask"];

// ── Checklist ──────────────────────────────────────────────────────────────
const ChecklistSection: React.FC<{ documentId: string }> = ({ documentId }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("");

  const fetchChecklist = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/documents/${documentId}/checklist`);
      setItems(res.data.data?.items || []);
      setGeneratedAt(res.data.data?.generatedAt || "");
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchChecklist(); }, [documentId]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${BASE_URL}/documents/${documentId}/checklist/generate`);
      setItems(res.data.data?.items || []);
      setGeneratedAt(res.data.data?.generatedAt || "");
    } catch {} finally { setGenerating(false); }
  };

  const toggle = async (itemId: string, completed: boolean) => {
    setItems(prev => prev.map(i => i.itemId === itemId ? { ...i, completed } : i));
    try { await axios.patch(`${BASE_URL}/documents/${documentId}/checklist/${itemId}`, { completed }); } catch {}
  };

  const done = items.filter(i => i.completed).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#1f2937" }}>✅ Action Checklist</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>Personalized steps based on your document</p>
        </div>
        <button onClick={generate} disabled={generating} style={{ background: "#22c55e", color: "white", border: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer", opacity: generating ? 0.7 : 1 }}>
          {generating ? "⏳ Generating..." : items.length > 0 ? "🔄 Regenerate" : "✨ Generate Checklist"}
        </button>
      </div>
      {items.length > 0 && (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #f3f4f6", padding: "16px 20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", color: "#4b5563", fontWeight: 600 }}>{done} of {items.length} completed</span>
            <span style={{ fontSize: "13px", color: "#9ca3af" }}>{Math.round((done / items.length) * 100)}%</span>
          </div>
          <div style={{ height: "8px", background: "#f3f4f6", borderRadius: "9999px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#22c55e", borderRadius: "9999px", width: `${(done / items.length) * 100}%`, transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}
      {items.length === 0 && !loading && (
        <div style={{ textAlign: "center" as const, padding: "60px", color: "#9ca3af", background: "white", borderRadius: "16px", border: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#4b5563", marginBottom: "6px" }}>No checklist yet</div>
          <div style={{ fontSize: "14px" }}>Click Generate Checklist to create your action plan</div>
        </div>
      )}
      {CATEGORIES.map(cat => {
        const catItems = items.filter(i => i.category === cat);
        if (!catItems.length) return null;
        return (
          <div key={cat} style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "10px" }}>{cat}</div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
              {catItems.map(item => {
                const pc = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;
                return (
                  <div key={item.itemId} style={{ display: "flex", gap: "14px", padding: "14px 18px", background: "white", border: "1px solid #f3f4f6", borderRadius: "12px", opacity: item.completed ? 0.55 : 1 }}>
                    <input type="checkbox" checked={item.completed} onChange={e => toggle(item.itemId, e.target.checked)} style={{ marginTop: "2px", width: "18px", height: "18px", cursor: "pointer", accentColor: "#22c55e", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" as const, marginBottom: "4px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 600, color: item.completed ? "#9ca3af" : "#1f2937", textDecoration: item.completed ? "line-through" : "none" }}>{item.title}</span>
                        <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "9999px", fontWeight: 600, background: pc.bg, color: pc.text }}>{item.priority}</span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6 }}>{item.description}</div>
                      {item.dueDate && <div style={{ fontSize: "12px", color: "#d97706", marginTop: "4px", fontWeight: 600 }}>📅 Due: {item.dueDate}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Dictionary ─────────────────────────────────────────────────────────────
const DictionarySection: React.FC<{ documentId: string }> = ({ documentId }) => {
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`${BASE_URL}/documents/${documentId}/dictionary`)
      .then(res => setTerms(res.data.data?.terms || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  const filtered = terms.filter(t => t.term.toLowerCase().includes(search.toLowerCase()) || t.simpleMeaning.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 700, color: "#1f2937" }}>📖 Legal Dictionary</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Difficult legal terms from your document, explained simply</p>
      </div>
      {terms.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search legal terms..." style={{ width: "100%", fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px", outline: "none", boxSizing: "border-box" as const, background: "white" }} />
        </div>
      )}
      {loading && <div style={{ textAlign: "center" as const, padding: "60px", color: "#9ca3af" }}>Loading legal terms...</div>}
      {!loading && terms.length === 0 && (
        <div style={{ textAlign: "center" as const, padding: "60px", color: "#9ca3af", background: "white", borderRadius: "16px", border: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📚</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#4b5563" }}>No legal terms detected</div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
        {filtered.map((term, i) => (
          <div key={i} style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: "14px", overflow: "hidden" }}>
            <button onClick={() => setExpanded(expanded === term.term ? null : term.term)} style={{ width: "100%", textAlign: "left" as const, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "40px", height: "40px", background: "#f3e8ff", color: "#7c3aed", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, flexShrink: 0 }}>{term.term.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "15px", color: "#1f2937" }}>{term.term}</div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>{term.simpleMeaning}</div>
              </div>
              <span style={{ color: "#d1d5db", flexShrink: 0 }}>{expanded === term.term ? "▲" : "▼"}</span>
            </button>
            {expanded === term.term && (
              <div style={{ padding: "0 20px 16px 74px", display: "flex", flexDirection: "column" as const, gap: "10px" }}>
                <div style={{ background: "#faf5ff", borderRadius: "10px", padding: "12px 16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", marginBottom: "6px", textTransform: "uppercase" as const }}>Simple Meaning</div>
                  <div style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>{term.simpleMeaning}</div>
                </div>
                {term.contextualMeaning && (
                  <div style={{ background: "#eff6ff", borderRadius: "10px", padding: "12px 16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#1d4ed8", marginBottom: "6px", textTransform: "uppercase" as const }}>In Your Document</div>
                    <div style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>{term.contextualMeaning}</div>
                  </div>
                )}
                {term.example && (
                  <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "12px 16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px", textTransform: "uppercase" as const }}>Example</div>
                    <div style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6, fontStyle: "italic" }}>{term.example}</div>
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

// ── Report ─────────────────────────────────────────────────────────────────
const ReportSection: React.FC<{ documentId: string }> = ({ documentId }) => {
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [reportUrl, setReportUrl] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareExpiry, setShareExpiry] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${BASE_URL}/documents/${documentId}/report/generate`);
      setReportUrl(res.data.data.reportUrl);
    } catch {} finally { setGenerating(false); }
  };

  const share = async () => {
    setSharing(true);
    try {
      const res = await axios.post(`${BASE_URL}/documents/${documentId}/report/share`);
      setShareUrl(res.data.data.shareUrl);
      setShareExpiry(res.data.data.expiresAt);
    } catch {} finally { setSharing(false); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 700, color: "#1f2937" }}>📄 Save & Share Report</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Download your full analysis or share it securely</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        <div style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: "16px", padding: "24px" }}>
          <div style={{ width: "48px", height: "48px", background: "#fff7ed", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "16px" }}>📥</div>
          <div style={{ fontWeight: 700, fontSize: "17px", color: "#1f2937", marginBottom: "6px" }}>Download Report</div>
          <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6, marginBottom: "20px" }}>Full HTML report with all analysis, risks, legal terms and checklist. Open in browser and save as PDF.</div>
          <button onClick={generate} disabled={generating} style={{ width: "100%", background: "#f97316", color: "white", border: "none", borderRadius: "10px", padding: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer", opacity: generating ? 0.7 : 1 }}>
            {generating ? "⏳ Generating..." : reportUrl ? "🔄 Regenerate" : "✨ Generate Report"}
          </button>
          {reportUrl && (
            <div style={{ marginTop: "16px", padding: "14px", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ flex: 1, fontSize: "12px", color: "#15803d" }}>✅ Report ready</span>
                <button onClick={() => window.open(reportUrl, "_blank")} style={{ background: "#22c55e", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Open ↗</button>
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>💡 Press Ctrl+P or ⌘P to save as PDF</div>
            </div>
          )}
        </div>
        <div style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: "16px", padding: "24px" }}>
          <div style={{ width: "48px", height: "48px", background: "#eff6ff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "16px" }}>🔗</div>
          <div style={{ fontWeight: 700, fontSize: "17px", color: "#1f2937", marginBottom: "6px" }}>Share Report</div>
          <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6, marginBottom: "20px" }}>Create a secure link to share with a lawyer or family member. Expires in 7 days.</div>
          <button onClick={share} disabled={sharing || !reportUrl} style={{ width: "100%", background: !reportUrl ? "#e5e7eb" : "#3b82f6", color: !reportUrl ? "#9ca3af" : "white", border: "none", borderRadius: "10px", padding: "12px", fontSize: "14px", fontWeight: 600, cursor: !reportUrl ? "not-allowed" : "pointer", opacity: sharing ? 0.7 : 1 }}>
            {sharing ? "⏳ Creating..." : !reportUrl ? "Generate report first" : shareUrl ? "🔄 New Link" : "🔗 Create Share Link"}
          </button>
          {shareUrl && (
            <div style={{ marginTop: "16px", padding: "14px", background: "#eff6ff", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ flex: 1, fontSize: "12px", color: "#1d4ed8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, fontFamily: "monospace", background: "white", padding: "6px 10px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>{shareUrl}</div>
                <button onClick={copy} style={{ background: copied ? "#22c55e" : "white", color: copied ? "white" : "#374151", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{copied ? "✓" : "Copy"}</button>
              </div>
              {shareExpiry && <div style={{ fontSize: "11px", color: "#6b7280" }}>🕐 Expires: {new Date(shareExpiry).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Tools Page ─────────────────────────────────────────────────────────────
const ToolsPage: React.FC<ToolsPageProps> = ({ documentId, documentName, onBack }) => {
  const [activeSection, setActiveSection] = useState<"checklist" | "dictionary" | "report">("checklist");
  const sections = [
    { id: "checklist" as const, label: "✅ Checklist" },
    { id: "dictionary" as const, label: "📖 Dictionary" },
    { id: "report" as const, label: "📄 Report" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ background: "white", borderBottom: "1px solid #f3f4f6", padding: "0 24px", position: "sticky" as const, top: 96, zIndex: 100 }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px", height: "72px" }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "14px", fontWeight: 600, padding: "6px 10px", borderRadius: "8px" }}>← Back to Analysis</button>
          <div style={{ width: "1px", height: "20px", background: "#f3f4f6" }} />
          <div style={{ fontSize: "14px", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{documentName || "Document Tools"}</div>
        </div>
      </div>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: "28px", fontWeight: 800, color: "#1f2937" }}>Document Tools</h1>
          <p style={{ margin: 0, fontSize: "15px", color: "#6b7280" }}>Checklist, legal dictionary, and report for your document</p>
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "32px", background: "white", padding: "6px", borderRadius: "14px", border: "1px solid #f3f4f6", width: "fit-content" }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: activeSection === s.id ? "#7c3aed" : "transparent", color: activeSection === s.id ? "white" : "#6b7280", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>{s.label}</button>
          ))}
        </div>
        {activeSection === "checklist" && <ChecklistSection documentId={documentId} />}
        {activeSection === "dictionary" && <DictionarySection documentId={documentId} />}
        {activeSection === "report" && <ReportSection documentId={documentId} />}
      </div>
    </div>
  );
};

export default ToolsPage;
