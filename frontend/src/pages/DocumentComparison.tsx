/**
 * Samvid AI - Document Comparison (Fixed)
 */
import React, { useState } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";

interface DocumentComparisonProps {
  documentId: string;
  onBack: () => void;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
}

function computeDiff(text1: string, text2: string): DiffLine[] {
  const lines1 = text1.split("\n").map(l => l.trim()).filter(l => l.length > 3);
  const lines2 = text2.split("\n").map(l => l.trim()).filter(l => l.length > 3);
  const set1 = new Set(lines1);
  const set2 = new Set(lines2);
  const result: DiffLine[] = [];
  lines1.forEach(line => {
    result.push({ type: set2.has(line) ? "unchanged" : "removed", text: line });
  });
  lines2.forEach(line => {
    if (!set1.has(line)) result.push({ type: "added", text: line });
  });
  return result;
}

export default function DocumentComparison({ documentId, onBack }: DocumentComparisonProps) {
  const [doc1Text, setDoc1Text] = useState("");
  const [doc2Text, setDoc2Text] = useState("");
  const [doc1Name, setDoc1Name] = useState("");
  const [doc2Name, setDoc2Name] = useState("");
  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [compared, setCompared] = useState(false);
  const [error, setError] = useState("");

  const uploadAndOCR = async (file: File, slot: 1 | 2) => {
    const setUploading = slot === 1 ? setUploading1 : setUploading2;
    const setName = slot === 1 ? setDoc1Name : setDoc2Name;
    const setText = slot === 1 ? setDoc1Text : setDoc2Text;

    setUploading(true);
    setName(file.name);
    setError("");

    try {
      const uploadRes = await axios.post(`${BASE_URL}/documents/upload`, {
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || "application/pdf",
      });

      const { document_id, upload_url } = uploadRes.data.data;

      await axios.put(upload_url, file, {
        headers: { "Content-Type": file.type || "application/pdf" },
        timeout: 60000,
      });

      await axios.post(`${BASE_URL}/documents/${document_id}/ocr`);

      const resultsRes = await axios.get(`${BASE_URL}/documents/${document_id}/results`);
      const preview = resultsRes.data.data?.ocr?.extracted_text_preview || "";
      
      if (!preview || preview.length < 20) {
        setError(`Could not extract text from ${file.name}. Make sure it's a readable PDF or image.`);
        setText("");
        setName("");
      } else {
        setText(preview);
      }
    } catch (e: any) {
      setError(`Failed to process ${file.name}: ${e?.response?.data?.error || e.message || "Unknown error"}`);
      setName("");
      setText("");
    } finally {
      setUploading(false);
    }
  };

  const compare = async () => {
    if (!doc1Text || !doc2Text) return;
    setComparing(true);
    setCompared(false);
    setAiSummary("");

    const diffResult = computeDiff(doc1Text, doc2Text);
    setDiff(diffResult);

    try {
      const res = await axios.post(`${BASE_URL}/documents/${documentId}/chat`, {
        question: `I have two versions of a legal document. Compare them and tell me the KEY differences in plain language.

DOCUMENT 1 - "${doc1Name}":
${doc1Text.slice(0, 1500)}

DOCUMENT 2 - "${doc2Name}":
${doc2Text.slice(0, 1500)}

List the top differences. For each difference, say if it is FAVORABLE or UNFAVORABLE for the person signing. Keep it simple and clear.`,
        sessionId: `comparison-${Date.now()}`,
        history: [],
      });
      setAiSummary(res.data.data?.answer || "No differences summary available.");
    } catch {
      setAiSummary("AI summary unavailable. Please review the highlighted differences below.");
    }

    setCompared(true);
    setComparing(false);
  };

  const added = diff.filter(d => d.type === "added").length;
  const removed = diff.filter(d => d.type === "removed").length;
  const unchanged = diff.filter(d => d.type === "unchanged").length;
  const bothReady = !!doc1Text && !!doc2Text;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ background: "white", borderBottom: "1px solid #f3f4f6", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px", height: "64px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>← Back</button>
          <div style={{ width: "1px", height: "20px", background: "#f3f4f6" }} />
          <div style={{ fontSize: "14px", color: "#9ca3af" }}>Document Comparison</div>
        </div>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "72px", height: "72px", background: "linear-gradient(135deg, #7c3aed, #ec4899)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 16px" }}>🔄</div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1f2937", margin: "0 0 8px" }}>Document Comparison</h1>
          <p style={{ fontSize: "15px", color: "#6b7280", margin: 0 }}>Upload two versions of a document to see exactly what changed</p>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px", padding: "14px 20px", marginBottom: "20px", color: "#dc2626", fontSize: "14px" }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          {([1, 2] as const).map(slot => {
            const name = slot === 1 ? doc1Name : doc2Name;
            const text = slot === 1 ? doc1Text : doc2Text;
            const uploading = slot === 1 ? uploading1 : uploading2;
            const color = slot === 1 ? "#7c3aed" : "#ec4899";
            const label = slot === 1 ? "Original Document" : "New / Updated Document";

            return (
              <div key={slot} style={{ background: "white", borderRadius: "16px", border: `2px dashed ${text ? color : "#e5e7eb"}`, padding: "28px", textAlign: "center" }}>
                {uploading ? (
                  <div>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#1f2937", marginBottom: "4px" }}>Processing...</div>
                    <div style={{ fontSize: "13px", color: "#6b7280" }}>Uploading and extracting text</div>
                  </div>
                ) : text ? (
                  <div>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color, marginBottom: "4px" }}>{name}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>{text.split(" ").length} words extracted</div>
                    <label style={{ fontSize: "12px", color, cursor: "pointer", textDecoration: "underline" }}>
                      Replace file
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => e.target.files?.[0] && uploadAndOCR(e.target.files[0], slot)} />
                    </label>
                  </div>
                ) : (
                  <label style={{ cursor: "pointer", display: "block" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>{slot === 1 ? "📄" : "📋"}</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#1f2937", marginBottom: "4px" }}>{label}</div>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>Click to upload PDF, JPG or PNG</div>
                    <div style={{ display: "inline-block", background: color, color: "white", borderRadius: "8px", padding: "10px 24px", fontSize: "14px", fontWeight: 600 }}>
                      Upload
                    </div>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => e.target.files?.[0] && uploadAndOCR(e.target.files[0], slot)} />
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {bothReady && (
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <button
              onClick={compare}
              disabled={comparing}
              style={{ background: comparing ? "#e5e7eb" : "linear-gradient(135deg, #7c3aed, #ec4899)", color: comparing ? "#9ca3af" : "white", border: "none", borderRadius: "14px", padding: "16px 48px", fontSize: "16px", fontWeight: 700, cursor: comparing ? "not-allowed" : "pointer" }}
            >
              {comparing ? "⏳ Comparing documents..." : "🔄 Compare Documents"}
            </button>
          </div>
        )}

        {!bothReady && !uploading1 && !uploading2 && (
          <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af", fontSize: "14px" }}>
            Upload both documents above to enable comparison
          </div>
        )}

        {compared && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Added", count: added, color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
                { label: "Removed", count: removed, color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
                { label: "Unchanged", count: unchanged, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: "14px", padding: "20px", textAlign: "center" }}>
                  <div style={{ fontSize: "32px", fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: s.color, marginTop: "4px" }}>{s.label} lines</div>
                </div>
              ))}
            </div>

            {aiSummary && (
              <div style={{ background: "white", borderRadius: "16px", border: "1px solid #f3f4f6", padding: "24px", marginBottom: "24px" }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#1f2937", marginBottom: "16px" }}>🤖 AI Analysis of Changes</div>
                <div style={{ fontSize: "14px", color: "#374151", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{aiSummary}</div>
              </div>
            )}

            <div style={{ background: "white", borderRadius: "16px", border: "1px solid #f3f4f6", overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", gap: "20px", fontSize: "13px", fontWeight: 700 }}>
                <span style={{ color: "#16a34a" }}>■ Added in Doc 2</span>
                <span style={{ color: "#dc2626" }}>■ Removed from Doc 1</span>
              </div>
              <div style={{ maxHeight: "500px", overflowY: "auto", padding: "16px 24px", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.8 }}>
                {diff.filter(d => d.type !== "unchanged").length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px", color: "#16a34a", fontSize: "15px" }}>
                    ✅ The two documents appear to be identical
                  </div>
                ) : (
                  diff
                    .filter(d => d.type !== "unchanged")
                    .map((line, i) => (
                      <div key={i} style={{ padding: "6px 12px", marginBottom: "4px", borderRadius: "6px", background: line.type === "added" ? "#f0fdf4" : "#fef2f2", color: line.type === "added" ? "#15803d" : "#dc2626", borderLeft: `3px solid ${line.type === "added" ? "#16a34a" : "#dc2626"}` }}>
                        <span style={{ fontWeight: 800, marginRight: "10px" }}>{line.type === "added" ? "+" : "−"}</span>
                        {line.text}
                      </div>
                    ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
