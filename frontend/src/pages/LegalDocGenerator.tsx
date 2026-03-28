/**
 * Samvid AI - Legal Document Generator
 * Generates reply letters, bail applications, objection letters based on analysis
 */
import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";

interface LegalDocGeneratorProps {
  documentId: string;
  onBack: () => void;
}

const TEMPLATES = [
  {
    id: "bail_application",
    icon: "🔓",
    title: "Bail Application",
    description: "Generate a bail application for the accused based on warrant details",
    color: "#7c3aed",
    bg: "#faf5ff",
  },
  {
    id: "reply_notice",
    icon: "📝",
    title: "Reply Notice",
    description: "Draft a formal reply to the legal notice or warrant",
    color: "#0369a1",
    bg: "#eff6ff",
  },
  {
    id: "objection_letter",
    icon: "✋",
    title: "Objection Letter",
    description: "Generate an objection letter for unfair clauses in the document",
    color: "#b45309",
    bg: "#fffbeb",
  },
  {
    id: "legal_complaint",
    icon: "📋",
    title: "Legal Complaint Draft",
    description: "Draft a complaint letter to the appropriate authority",
    color: "#dc2626",
    bg: "#fef2f2",
  },
];

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/_{1,2}(.+?)_{1,2}/g, '$1')
    .trim();
}

export default function LegalDocGenerator({ documentId, onBack }: LegalDocGeneratorProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [userName, setUserName] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    axios.get(`${BASE_URL}/documents/${documentId}/results`)
      .then(res => setAnalysis(res.data.data?.analysis))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  const generateDocument = async (templateId: string) => {
    if (!analysis) return;
    setSelectedTemplate(templateId);
    setGenerating(true);
    setGeneratedDoc("");

    const prompt = buildPrompt(templateId, analysis, userName, userAddress);

    try {
      const res = await axios.post(`${BASE_URL}/documents/${documentId}/chat`, {
        question: prompt,
        sessionId: "doc-gen-" + templateId,
        history: [],
      });
      const raw = res.data.data?.answer || "";
      setGeneratedDoc(stripMarkdown(raw));
    } catch {
      setGeneratedDoc("Failed to generate document. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const buildPrompt = (templateId: string, analysis: any, name: string, address: string) => {
    const docType = analysis?.document_type_detected || "legal document";
    const summary = analysis?.plain_language_summary || "";
    const risks = (analysis?.risks || []).map((r: any) => r.clauseText || r.clause_text).join(", ");

    const PLAIN_TEXT_INSTRUCTION = `IMPORTANT: Write in plain text only. Do NOT use asterisks, markdown, bold formatting, hashtags, or any special characters for formatting. Use only plain English with proper line breaks and spacing. Write as if typing a formal letter on a typewriter.\n\n`;

    const templates: Record<string, string> = {
      bail_application: `${PLAIN_TEXT_INSTRUCTION}Generate a formal bail application in India for the following case. Write it as a complete, ready-to-use document in plain English that a lawyer can review.
Document type: ${docType}
Case summary: ${summary}
Applicant name: ${name || "[APPLICANT NAME]"}
Address: ${address || "[ADDRESS]"}
Include: court address, prayer for bail, grounds for bail (first time offender, cooperation with investigation, roots in society, no flight risk), verification statement.`,

      reply_notice: `${PLAIN_TEXT_INSTRUCTION}Generate a formal reply notice/letter in response to this legal document. Write as a complete ready-to-use letter.
Document type: ${docType}
Summary: ${summary}
Sender name: ${name || "[YOUR NAME]"}
Address: ${address || "[YOUR ADDRESS]"}
Include: acknowledgment of receipt, denial of allegations, request for evidence, warning of legal action if harassment continues, professional closing.`,

      objection_letter: `${PLAIN_TEXT_INSTRUCTION}Generate a formal objection letter highlighting unfair clauses in this document. Write as a complete ready-to-use letter.
Document type: ${docType}
Summary: ${summary}
Problematic clauses: ${risks}
Your name: ${name || "[YOUR NAME]"}
Address: ${address || "[YOUR ADDRESS]"}
Include: specific objections to each unfair clause, proposed amendments, deadline for response, legal consequences of non-response.`,

      legal_complaint: `${PLAIN_TEXT_INSTRUCTION}Generate a formal complaint letter to the appropriate authority regarding this legal matter. Write as a complete ready-to-use document.
Document type: ${docType}
Summary: ${summary}
Complainant: ${name || "[YOUR NAME]"}
Address: ${address || "[YOUR ADDRESS]"}
Include: facts of the matter, specific grievances, relief sought, supporting documents list, prayer to authority.`,
    };

    return templates[templateId] || "";
  };

  const downloadDoc = () => {
    const blob = new Blob([generatedDoc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `samvid-ai-${selectedTemplate}.txt`;
    a.click();
  };

  const copyDoc = async () => {
    await navigator.clipboard.writeText(generatedDoc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ background: "white", borderBottom: "1px solid #f3f4f6", padding: "0 24px", position: "sticky", top: 96, zIndex: 100 }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px", height: "64px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>← Back</button>
          <div style={{ width: "1px", height: "20px", background: "#f3f4f6" }} />
          <div style={{ fontSize: "14px", color: "#9ca3af" }}>Legal Document Generator</div>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "72px", height: "72px", background: "linear-gradient(135deg, #dc2626, #ef4444)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 16px" }}>📄</div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1f2937", margin: "0 0 8px" }}>Legal Document Generator</h1>
          <p style={{ fontSize: "15px", color: "#6b7280", margin: 0 }}>Generate court-ready documents based on your case analysis</p>
        </div>

        {/* User details */}
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #f3f4f6", padding: "24px", marginBottom: "28px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#374151", marginBottom: "16px" }}>Your Details (Optional)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Your full name" style={{ fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 14px", outline: "none" }} />
            <input value={userAddress} onChange={e => setUserAddress(e.target.value)} placeholder="Your address" style={{ fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 14px", outline: "none" }} />
          </div>
        </div>

        {/* Template cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => generateDocument(t.id)}
              disabled={generating || loading}
              style={{
                background: selectedTemplate === t.id ? t.bg : "white",
                border: `2px solid ${selectedTemplate === t.id ? t.color : "#f3f4f6"}`,
                borderRadius: "16px",
                padding: "24px 20px",
                textAlign: "left",
                cursor: generating ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: generating && selectedTemplate !== t.id ? 0.5 : 1,
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>{t.icon}</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1f2937", marginBottom: "6px" }}>{t.title}</div>
              <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>{t.description}</div>
              {selectedTemplate === t.id && generating && (
                <div style={{ marginTop: "10px", fontSize: "12px", color: t.color, fontWeight: 600 }}>⏳ Generating...</div>
              )}
            </button>
          ))}
        </div>

        {/* Generated document */}
        {generatedDoc && (
          <div style={{ background: "white", borderRadius: "16px", border: "1px solid #f3f4f6", overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#1f2937" }}>
                {TEMPLATES.find(t => t.id === selectedTemplate)?.icon} Generated Document
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={copyDoc}
                  style={{ background: copied ? "#22c55e" : "#f9fafb", color: copied ? "white" : "#374151", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  {copied ? "✓ Copied" : "📋 Copy"}
                </button>
                <button onClick={downloadDoc} style={{ background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>⬇️ Download</button>
              </div>
            </div>
            <div style={{ padding: "24px", fontFamily: "'Courier New', Courier, monospace", fontSize: "13px", lineHeight: 2, color: "#1f2937", whiteSpace: "pre-wrap", maxHeight: "600px", overflowY: "auto", background: "#fafafa" }}>
              {generatedDoc}
            </div>
            <div style={{ padding: "16px 24px", background: "#fff7ed", borderTop: "1px solid #fed7aa" }}>
              <div style={{ fontSize: "12px", color: "#92400e" }}>
                ⚠️ <strong>Disclaimer:</strong> This is an AI-generated draft for reference only. Always have a qualified lawyer review before submitting to any court or authority.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}