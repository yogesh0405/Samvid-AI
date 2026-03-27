/**
 * Samvid AI - IPC Section Explainer
 * Auto-detects IPC/CrPC sections and explains them in plain language
 */
import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";

interface IPCSectionExplainerProps {
  documentId: string;
  onBack: () => void;
}

// Built-in IPC/CrPC database
const IPC_DATABASE: Record<string, { title: string; plain: string; severity: string; punishment: string }> = {
  "153A": { title: "Promoting enmity between groups", plain: "Making speeches or writing things that create hatred between different religious, racial or language groups.", severity: "high", punishment: "Up to 3 years imprisonment or fine or both" },
  "153-A": { title: "Promoting enmity between groups", plain: "Making speeches or writing things that create hatred between different religious, racial or language groups.", severity: "high", punishment: "Up to 3 years imprisonment or fine or both" },
  "505": { title: "Statements conducing to public mischief", plain: "Making or spreading false statements that cause fear, alarm or incite violence among the public.", severity: "high", punishment: "Up to 3 years imprisonment or fine or both" },
  "506": { title: "Criminal intimidation", plain: "Threatening someone with injury to their person, reputation or property to make them do something against their will.", severity: "medium", punishment: "Up to 2 years imprisonment or fine or both" },
  "420": { title: "Cheating and dishonestly inducing delivery", plain: "Cheating someone and dishonestly convincing them to hand over property or money.", severity: "high", punishment: "Up to 7 years imprisonment and fine" },
  "302": { title: "Murder", plain: "Causing the death of a person with intention or knowledge that it will cause death.", severity: "critical", punishment: "Death penalty or life imprisonment and fine" },
  "304": { title: "Culpable homicide not amounting to murder", plain: "Causing death without intending murder but knowing the act is dangerous.", severity: "critical", punishment: "Up to 10 years imprisonment and fine" },
  "307": { title: "Attempt to murder", plain: "Attempting to kill someone with intention to cause death.", severity: "critical", punishment: "Up to 10 years or life imprisonment and fine" },
  "323": { title: "Voluntarily causing hurt", plain: "Intentionally causing physical pain or injury to another person.", severity: "low", punishment: "Up to 1 year imprisonment or fine up to Rs. 1,000 or both" },
  "354": { title: "Assault or criminal force on woman", plain: "Attacking or using force on a woman with intent to outrage her modesty.", severity: "high", punishment: "Up to 2 years imprisonment or fine or both" },
  "376": { title: "Rape", plain: "Sexual assault on a woman without her consent.", severity: "critical", punishment: "Minimum 7 years up to life imprisonment" },
  "379": { title: "Theft", plain: "Taking someone's property without their consent with intent to steal.", severity: "medium", punishment: "Up to 3 years imprisonment or fine or both" },
  "395": { title: "Dacoity", plain: "Robbery committed by 5 or more persons together.", severity: "critical", punishment: "Up to 10 years imprisonment and fine" },
  "406": { title: "Criminal breach of trust", plain: "Misappropriating property entrusted to you by someone else.", severity: "high", punishment: "Up to 3 years imprisonment or fine or both" },
  "415": { title: "Cheating", plain: "Deceiving someone to gain property or to harm them.", severity: "medium", punishment: "Up to 1 year imprisonment or fine or both" },
  "498A": { title: "Cruelty by husband or relatives", plain: "Husband or his family members subjecting a woman to cruelty — physical, mental or by harassing for dowry.", severity: "high", punishment: "Up to 3 years imprisonment and fine" },
  "376A": { title: "Punishment for causing death or persistent vegetative state", plain: "Sexual assault causing death or permanent vegetative state.", severity: "critical", punishment: "Minimum 20 years up to life imprisonment or death" },
  "41": { title: "CrPC - When police may arrest", plain: "Conditions under which police can arrest a person without a warrant.", severity: "medium", punishment: "N/A - Procedural provision" },
  "107": { title: "CrPC - Security for keeping peace", plain: "Magistrate can ask a person to give security/guarantee for keeping peace.", severity: "low", punishment: "Up to 1 year imprisonment if security not given" },
  "144": { title: "CrPC - Immediate remedy in urgent cases", plain: "Order prohibiting assembly of people in an area during emergency situations.", severity: "medium", punishment: "Up to 1 year imprisonment for violation" },
  "482": { title: "CrPC - Saving of inherent powers of High Court", plain: "High Court has power to prevent abuse of court process or secure justice.", severity: "low", punishment: "N/A - Procedural provision" },
};

const SEVERITY_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5", label: "Critical" },
  high: { bg: "#fff7ed", text: "#ea580c", border: "#fdba74", label: "Serious" },
  medium: { bg: "#fefce8", text: "#ca8a04", border: "#fde68a", label: "Moderate" },
  low: { bg: "#f0fdf4", text: "#16a34a", border: "#86efac", label: "Minor" },
};

function extractSections(text: string): string[] {
  const patterns = [
    /[Ss]ection[s]?\s+(\d+[-A-Za-z]*(?:\s*,\s*\d+[-A-Za-z]*)*(?:\s*and\s*\d+[-A-Za-z]*)*)/g,
    /[Ii][Pp][Cc]\s+(\d+[-A-Za-z]*)/g,
    /[Cc]r[Pp][Cc]\s+(\d+[-A-Za-z]*)/g,
    /[Uu]/s,
    /u\/s\s+(\d+[-A-Za-z]*)/g,
    /(?:under|u\/s|U\/S)\s+(?:[Ss]ection[s]?\s+)?(\d+[-A-Za-z]*(?:\s*,\s*\d+[-A-Za-z]*)*)/g,
  ];

  const found = new Set<string>();
  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern instanceof RegExp ? pattern : new RegExp(pattern));
    for (const match of matches) {
      if (match[1]) {
        match[1].split(/[,\s]+and\s+|,\s*/).forEach(s => {
          const clean = s.trim().replace(/\s+/g, "").toUpperCase();
          if (clean && /^\d/.test(clean)) found.add(clean);
        });
      }
    }
  });
  return Array.from(found);
}

export default function IPCSectionExplainer({ documentId, onBack }: IPCSectionExplainerProps) {
  const [sections, setSections] = useState<string[]>([]);
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`${BASE_URL}/documents/${documentId}/results`)
      .then(res => {
        const preview = res.data.data?.ocr?.extracted_text_preview || "";
        const analysis = res.data.data?.analysis;
        const allText = preview + " " + JSON.stringify(analysis || "");
        setOcrText(allText);
        const found = extractSections(allText);
        setSections(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  const allSections = sections.length > 0
    ? sections.filter(s => IPC_DATABASE[s] || IPC_DATABASE[s.replace("-", "")])
    : [];

  const filtered = search
    ? Object.entries(IPC_DATABASE).filter(([k, v]) =>
        k.includes(search) || v.title.toLowerCase().includes(search.toLowerCase())
      ).map(([k]) => k)
    : allSections;

  const displaySections = filtered.length > 0 ? filtered : (search ? [] : allSections);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ background: "white", borderBottom: "1px solid #f3f4f6", padding: "0 24px", position: "sticky", top: 96, zIndex: 100 }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px", height: "64px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>← Back</button>
          <div style={{ width: "1px", height: "20px", background: "#f3f4f6" }} />
          <div style={{ fontSize: "14px", color: "#9ca3af" }}>IPC / CrPC Reference</div>
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "72px", height: "72px", background: "linear-gradient(135deg, #0369a1, #0ea5e9)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 16px" }}>⚖️</div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1f2937", margin: "0 0 8px" }}>IPC / CrPC Explainer</h1>
          <p style={{ fontSize: "15px", color: "#6b7280", margin: 0 }}>Legal sections from your document explained in plain language</p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search any IPC section e.g. 420, 498A, 302..."
            style={{ width: "100%", fontSize: "15px", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "14px 18px", outline: "none", boxSizing: "border-box", background: "white" }}
          />
        </div>

        {loading && <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>Analyzing document sections...</div>}

        {!loading && displaySections.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "20px", border: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#1f2937", marginBottom: "8px" }}>
              {search ? `No results for "${search}"` : "No IPC sections detected"}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Try searching for a section number like 420 or 302</div>
          </div>
        )}

        {!loading && allSections.length > 0 && !search && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#eff6ff", borderRadius: "10px", fontSize: "13px", color: "#1d4ed8" }}>
            📋 Found <strong>{allSections.length} legal section{allSections.length > 1 ? "s" : ""}</strong> in your document
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {displaySections.map(sectionNum => {
            const key = sectionNum.replace("-", "");
            const info = IPC_DATABASE[sectionNum] || IPC_DATABASE[key];
            if (!info) return null;
            const style = SEVERITY_STYLE[info.severity] || SEVERITY_STYLE.medium;
            const isOpen = expanded === sectionNum;

            return (
              <div key={sectionNum} style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <button onClick={() => setExpanded(isOpen ? null : sectionNum)} style={{ width: "100%", textAlign: "left", padding: "20px 24px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "56px", height: "56px", background: style.bg, border: `1px solid ${style.border}`, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: style.text }}>§{sectionNum}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: "#1f2937" }}>Section {sectionNum} IPC</span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "9999px", fontWeight: 700, background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>{style.label}</span>
                    </div>
                    <div style={{ fontSize: "14px", color: "#6b7280" }}>{info.title}</div>
                  </div>
                  <span style={{ color: "#d1d5db", flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 24px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>What it means</div>
                      <div style={{ fontSize: "15px", color: "#374151", lineHeight: 1.7 }}>{info.plain}</div>
                    </div>
                    <div style={{ background: style.bg, borderRadius: "12px", padding: "16px", border: `1px solid ${style.border}` }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: style.text, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Punishment</div>
                      <div style={{ fontSize: "14px", color: style.text, fontWeight: 600 }}>⚖️ {info.punishment}</div>
                    </div>
                    <a href={`https://devgan.in/ipc/section_${sectionNum.replace("-", "")}.php`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>
                      📖 Read full section text →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
