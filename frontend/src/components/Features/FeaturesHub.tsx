/**
 * Samvid AI - Features Hub
 * Beautiful cards showing all available features after analysis
 */
import React from "react";

interface FeaturesHubProps {
  documentId: string;
  documentType?: string;
  onOpenTools: () => void;
  onOpenCourtTracker: () => void;
  onOpenIPC: () => void;
  onOpenDocGen: () => void;
  onOpenLawyerFinder: () => void;
  onOpenComparison: () => void;
}

const FEATURES = [
  {
    id: "tools",
    icon: "🛠️",
    title: "Document Tools",
    description: "Checklist, legal dictionary and downloadable report",
    gradient: "linear-gradient(135deg, #7c3aed, #a855f7)",
    action: "onOpenTools",
    badge: null,
  },
  {
    id: "court",
    icon: "📅",
    title: "Court Date Tracker",
    description: "Export all deadlines to Google Calendar with one click",
    gradient: "linear-gradient(135deg, #0369a1, #0ea5e9)",
    action: "onOpenCourtTracker",
    badge: "New",
  },
  {
    id: "ipc",
    icon: "⚖️",
    title: "IPC / CrPC Explainer",
    description: "Understand every legal section in plain language",
    gradient: "linear-gradient(135deg, #b45309, #f59e0b)",
    action: "onOpenIPC",
    badge: "New",
  },
  {
    id: "docgen",
    icon: "📝",
    title: "Legal Doc Generator",
    description: "Generate bail applications, reply notices and objection letters",
    gradient: "linear-gradient(135deg, #dc2626, #f87171)",
    action: "onOpenDocGen",
    badge: "New",
  },
  {
    id: "lawyer",
    icon: "👨‍⚖️",
    title: "Lawyer Finder",
    description: "Find verified lawyers and free legal aid near you",
    gradient: "linear-gradient(135deg, #0f766e, #14b8a6)",
    action: "onOpenLawyerFinder",
    badge: "New",
  },
  {
    id: "compare",
    icon: "🔄",
    title: "Document Comparison",
    description: "Upload two versions and see exactly what changed",
    gradient: "linear-gradient(135deg, #7c3aed, #ec4899)",
    action: "onOpenComparison",
    badge: "New",
  },
];

export default function FeaturesHub({
  documentId,
  documentType,
  onOpenTools,
  onOpenCourtTracker,
  onOpenIPC,
  onOpenDocGen,
  onOpenLawyerFinder,
  onOpenComparison,
}: FeaturesHubProps) {
  const handlers: Record<string, () => void> = {
    onOpenTools,
    onOpenCourtTracker,
    onOpenIPC,
    onOpenDocGen,
    onOpenLawyerFinder,
    onOpenComparison,
  };

  return (
    <div style={{ marginTop: "40px" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #e5e7eb)" }} />
        <div style={{ padding: "8px 20px", background: "white", border: "1px solid #f3f4f6", borderRadius: "9999px", fontSize: "13px", fontWeight: 700, color: "#6b7280", whiteSpace: "nowrap" }}>
          ✨ Explore More Features
        </div>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #e5e7eb)" }} />
      </div>

      {/* Feature cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
        {FEATURES.map(feature => (
          <button
            key={feature.id}
            onClick={handlers[feature.action]}
            style={{
              background: "white",
              border: "1px solid #f3f4f6",
              borderRadius: "20px",
              padding: "24px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.2s ease",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
              (e.currentTarget as HTMLElement).style.borderColor = "#e0d7ff";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
              (e.currentTarget as HTMLElement).style.borderColor = "#f3f4f6";
            }}
          >
            {/* New badge */}
            {feature.badge && (
              <div style={{ position: "absolute", top: "16px", right: "16px", background: "#7c3aed", color: "white", fontSize: "10px", fontWeight: 800, padding: "3px 8px", borderRadius: "9999px", letterSpacing: "0.05em" }}>
                {feature.badge}
              </div>
            )}

            {/* Icon */}
            <div style={{ width: "52px", height: "52px", background: feature.gradient, borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "16px" }}>
              {feature.icon}
            </div>

            {/* Content */}
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1f2937", marginBottom: "6px" }}>{feature.title}</div>
            <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6 }}>{feature.description}</div>

            {/* Arrow */}
            <div style={{ marginTop: "16px", fontSize: "13px", fontWeight: 600, color: "#7c3aed", display: "flex", alignItems: "center", gap: "4px" }}>
              Open <span>→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
