/**
 * Samvid AI - Court Date Tracker
 * Extracts deadlines and exports to Google Calendar
 */
import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";

interface CourtDateTrackerProps {
  documentId: string;
  onBack: () => void;
}

interface Deadline {
  description: string;
  date_or_period: string;
  consequence: string | null;
  priority: string;
}

function generateGoogleCalendarUrl(title: string, date: string, description: string): string {
  const cleanDate = date.replace(/[^0-9]/g, "");
  let formattedDate = "";
  if (cleanDate.length === 8) {
    formattedDate = cleanDate;
  } else {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toISOString().replace(/[-:]/g, "").split("T")[0];
    }
  }
  if (!formattedDate) return "";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `[Samvid AI] ${title}`,
    dates: `${formattedDate}/${formattedDate}`,
    details: description || "Legal deadline from Samvid AI analysis",
    location: "Court",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const PRIORITY_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5", dot: "#dc2626" },
  high: { bg: "#fff7ed", text: "#ea580c", border: "#fdba74", dot: "#ea580c" },
  medium: { bg: "#fefce8", text: "#ca8a04", border: "#fde68a", dot: "#ca8a04" },
  low: { bg: "#f0fdf4", text: "#16a34a", border: "#86efac", dot: "#16a34a" },
};

export default function CourtDateTracker({ documentId, onBack }: CourtDateTrackerProps) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [docType, setDocType] = useState("");
  const [loading, setLoading] = useState(true);
  const [exported, setExported] = useState<string[]>([]);

  useEffect(() => {
    axios.get(`${BASE_URL}/documents/${documentId}/results`)
      .then(res => {
        const analysis = res.data.data?.analysis;
        setDeadlines(analysis?.deadlines || []);
        setDocType(analysis?.document_type_detected || "Document");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  const exportToCalendar = (dl: Deadline) => {
    const url = generateGoogleCalendarUrl(dl.description, dl.date_or_period, dl.consequence || "");
    if (url) {
      window.open(url, "_blank");
      setExported(prev => [...prev, dl.description]);
    } else {
      alert("Could not parse date format. Please add manually to your calendar.");
    }
  };

  const exportAll = () => {
    deadlines.forEach(dl => exportToCalendar(dl));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #f3f4f6", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px", height: "64px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
            ← Back
          </button>
          <div style={{ width: "1px", height: "20px", background: "#f3f4f6" }} />
          <div style={{ fontSize: "14px", color: "#9ca3af" }}>{docType}</div>
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "72px", height: "72px", background: "linear-gradient(135deg, #7c3aed, #a855f7)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 16px" }}>📅</div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1f2937", margin: "0 0 8px" }}>Court Date Tracker</h1>
          <p style={{ fontSize: "15px", color: "#6b7280", margin: 0 }}>All important dates from your document, with one-click calendar export</p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
            Loading deadlines...
          </div>
        )}

        {!loading && deadlines.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "20px", border: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#1f2937", marginBottom: "8px" }}>No deadlines found</div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Run document analysis first to extract dates</div>
          </div>
        )}

        {!loading && deadlines.length > 0 && (
          <>
            {/* Export all button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
              <button onClick={exportAll} style={{ background: "#7c3aed", color: "white", border: "none", borderRadius: "12px", padding: "12px 24px", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                📅 Export All to Google Calendar
              </button>
            </div>

            {/* Deadlines list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {deadlines.map((dl, i) => {
                const style = PRIORITY_STYLE[dl.priority] || PRIORITY_STYLE.medium;
                const isExported = exported.includes(dl.description);
                return (
                  <div key={i} style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: "16px", padding: "20px 24px", display: "flex", alignItems: "center", gap: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    {/* Date badge */}
                    <div style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: "12px", padding: "12px 16px", textAlign: "center", minWidth: "100px", flexShrink: 0 }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: style.text, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{dl.priority}</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: style.text }}>{dl.date_or_period}</div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>{dl.description}</div>
                      {dl.consequence && (
                        <div style={{ fontSize: "13px", color: "#ef4444" }}>⚠️ {dl.consequence}</div>
                      )}
                    </div>

                    {/* Export button */}
                    <button
                      onClick={() => exportToCalendar(dl)}
                      style={{ background: isExported ? "#f0fdf4" : "#f9fafb", color: isExported ? "#16a34a" : "#374151", border: `1px solid ${isExported ? "#86efac" : "#e5e7eb"}`, borderRadius: "10px", padding: "10px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}
                    >
                      {isExported ? "✅ Added" : "📅 Add to Calendar"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Tip */}
            <div style={{ marginTop: "24px", padding: "16px 20px", background: "#eff6ff", borderRadius: "12px", border: "1px solid #bfdbfe", fontSize: "13px", color: "#1d4ed8" }}>
              💡 <strong>Tip:</strong> Click "Add to Calendar" to open Google Calendar with the date pre-filled. Set a reminder 2-3 days before each deadline.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
