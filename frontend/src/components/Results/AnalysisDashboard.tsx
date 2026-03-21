/**
 * Samvid AI - Analysis Dashboard
 * Renders the full legal analysis: summary, key points, obligations,
 * deadlines, penalties, risks, and actions.
 */
import React, { useState } from 'react';
import { DocumentResults, LegalAnalysis, RiskLevel, TranslatedContent } from '../../types';
import { getRiskConfig, formatDate, pluralize } from '../../utils';

interface AnalysisDashboardProps {
  results: DocumentResults;
  translatedContent: TranslatedContent | null;
}

// ─── Risk Badge ──────────────────────────────────────

const RiskBadge: React.FC<{ level: RiskLevel; size?: 'sm' | 'md' | 'lg' }> = ({
  level,
  size = 'md',
}) => {
  const config = getRiskConfig(level);
  const padding = size === 'sm' ? '3px 8px' : size === 'lg' ? '8px 20px' : '5px 12px';
  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '16px' : '13px';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding,
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.border}`,
      borderRadius: '9999px',
      fontSize,
      fontWeight: 700,
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap' as const,
    }}>
      {config.icon} {config.label}
    </span>
  );
};

// ─── Section Card ─────────────────────────────────────

const SectionCard: React.FC<{
  title: string;
  icon: string;
  count?: number;
  children: React.ReactNode;
  accentColor?: string;
}> = ({ title, icon, count, children, accentColor = '#7c3aed' }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #f3f4f6',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: '20px',
  }}>
    <div style={{
      padding: '16px 20px',
      borderBottom: '1px solid #f3f4f6',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: '#fafafa',
    }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{
        fontFamily: "'Sora', sans-serif",
        fontWeight: 700,
        fontSize: '16px',
        color: '#1f2937',
        flex: 1,
      }}>
        {title}
      </span>
      {count !== undefined && (
        <span style={{
          background: accentColor,
          color: 'white',
          borderRadius: '9999px',
          padding: '2px 10px',
          fontSize: '13px',
          fontWeight: 700,
        }}>
          {count}
        </span>
      )}
    </div>
    <div style={{ padding: '16px 20px' }}>{children}</div>
  </div>
);

// ─── Main Component ───────────────────────────────────

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ results, translatedContent }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'risks' | 'actions'>('summary');

  const analysis = results.analysis;
  if (!analysis) return null;

  const summary = translatedContent?.plain_language_summary || analysis.plain_language_summary;
  const keyPoints = translatedContent?.key_points_translated?.length
    ? translatedContent.key_points_translated
    : analysis.key_points;
  const obligations = translatedContent?.obligations_translated?.length
    ? translatedContent.obligations_translated
    : analysis.obligations;
  const deadlines = translatedContent?.deadlines_translated?.length
    ? translatedContent.deadlines_translated
    : analysis.deadlines;
  const actions = translatedContent?.actions_to_take_translated?.length
    ? translatedContent.actions_to_take_translated
    : analysis.actions_to_take;

  const tabs = [
    { id: 'summary', label: '📋 Summary', },
    { id: 'details', label: '📑 Details', },
    { id: 'risks', label: `⚠️ Risks (${analysis.risks.length})`, },
    { id: 'actions', label: `✅ Actions (${actions.length})`, },
  ] as const;

  return (
    <div>
      {/* Header stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '14px',
        marginBottom: '24px',
      }}>
        <StatCard
          label="Document Type"
          value={analysis.document_type_detected}
          icon="📄"
        />
        <StatCard
          label="Overall Risk"
          value={<RiskBadge level={analysis.overall_risk_level} size="sm" />}
          icon="🛡️"
        />
        <StatCard
          label="Key Points"
          value={`${analysis.key_points.length} found`}
          icon="🔑"
        />
        <StatCard
          label="Analysed"
          value={formatDate(analysis.analyzed_at)}
          icon="🕐"
        />
      </div>

      {/* Risk summary banner */}
      {analysis.risk_summary && (
        <div style={{
          background: getRiskConfig(analysis.overall_risk_level).bg,
          border: `1px solid ${getRiskConfig(analysis.overall_risk_level).border}`,
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '20px' }}>🛡️</span>
          <div>
            <div style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              color: getRiskConfig(analysis.overall_risk_level).color,
              marginBottom: '4px',
              fontSize: '15px',
            }}>
              Risk Assessment
            </div>
            <div style={{
              color: getRiskConfig(analysis.overall_risk_level).color,
              fontSize: '14px',
              opacity: 0.9,
              lineHeight: 1.6,
            }}>
              {analysis.risk_summary}
            </div>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '20px',
        overflowX: 'auto' as const,
        paddingBottom: '4px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === tab.id ? '#7c3aed' : '#f3f4f6',
              color: activeTab === tab.id ? 'white' : '#4b5563',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: "'Sora', sans-serif",
              cursor: 'pointer',
              whiteSpace: 'nowrap' as const,
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Summary */}
      {activeTab === 'summary' && (
        <div>
          <SectionCard title="Plain Language Summary" icon="📋">
            <div style={{
              fontSize: '15px',
              lineHeight: 1.8,
              color: '#374151',
              whiteSpace: 'pre-wrap' as const,
            }}>
              {summary}
            </div>
          </SectionCard>

          {keyPoints.length > 0 && (
            <SectionCard title="Key Points" icon="🔑" count={keyPoints.length}>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                {keyPoints.map((kp, i) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    background: (kp as any).important ? '#faf5ff' : '#f9fafb',
                    borderRadius: '10px',
                    borderLeft: `3px solid ${(kp as any).important ? '#7c3aed' : '#e5e7eb'}`,
                  }}>
                    <div style={{
                      fontFamily: "'Sora', sans-serif",
                      fontWeight: 700,
                      fontSize: '14px',
                      color: '#1f2937',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      {(kp as any).important && <span>⭐</span>}
                      {(kp as any).heading}
                    </div>
                    <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
                      {(kp as any).detail}
                    </div>
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
                  <div key={i} style={{
                    padding: '12px 16px',
                    background: '#f0f9ff',
                    borderRadius: '10px',
                    border: '1px solid #bae6fd',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      flexWrap: 'wrap' as const,
                      marginBottom: '6px',
                    }}>
                      <span style={{
                        background: '#0369a1',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}>
                        {(ob as any).party}
                      </span>
                      {(ob as any).frequency && (
                        <span style={{ fontSize: '12px', color: '#0369a1' }}>
                          🔄 {(ob as any).frequency}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', color: '#1e40af', lineHeight: 1.6 }}>
                      {(ob as any).obligation}
                    </div>
                    {(ob as any).amount && (
                      <div style={{
                        marginTop: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0369a1',
                      }}>
                        💰 {(ob as any).amount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {deadlines.length > 0 && (
            <SectionCard title="Important Deadlines" icon="⏰" count={deadlines.length} accentColor="#b45309">
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                {deadlines.map((dl, i) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    background: '#fffbeb',
                    borderRadius: '10px',
                    border: '1px solid #fde68a',
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                  }}>
                    <div style={{
                      background: '#f59e0b',
                      color: 'white',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap' as const,
                      textAlign: 'center' as const,
                      minWidth: '90px',
                    }}>
                      {(dl as any).date_or_period}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', color: '#78350f', fontWeight: 600, marginBottom: '4px' }}>
                        {(dl as any).description}
                      </div>
                      {(dl as any).consequence && (
                        <div style={{ fontSize: '13px', color: '#92400e' }}>
                          ⚠️ If missed: {(dl as any).consequence}
                        </div>
                      )}
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
                  <div key={i} style={{
                    padding: '12px 16px',
                    background: '#fff1f2',
                    borderRadius: '10px',
                    border: '1px solid #fecdd3',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '8px',
                      marginBottom: '6px',
                      flexWrap: 'wrap' as const,
                    }}>
                      <span style={{ fontSize: '13px', color: '#be123c', fontWeight: 600 }}>
                        Trigger: {pen.trigger}
                      </span>
                      <RiskBadge level={pen.risk_level} size="sm" />
                    </div>
                    <div style={{ fontSize: '14px', color: '#881337', lineHeight: 1.6 }}>
                      {pen.penalty_description}
                    </div>
                    {pen.amount_or_severity && (
                      <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 700, color: '#be123c' }}>
                        Amount/Severity: {pen.amount_or_severity}
                      </div>
                    )}
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
            <div style={{
              textAlign: 'center' as const,
              padding: '48px 24px',
              color: '#15803d',
              background: '#f0fdf4',
              borderRadius: '16px',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>
                No High-Risk Clauses Found
              </div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>
                The AI did not identify any significantly risky clauses in this document.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
              {analysis.risks
                .sort((a, b) => {
                  const order = { critical: 0, high: 1, medium: 2, low: 3 };
                  return order[a.risk_level] - order[b.risk_level];
                })
                .map((risk, i) => {
                  const config = getRiskConfig(risk.risk_level);
                  return (
                    <div key={i} style={{
                      background: config.bg,
                      border: `1px solid ${config.border}`,
                      borderRadius: '12px',
                      padding: '16px 20px',
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        marginBottom: '10px',
                        flexWrap: 'wrap' as const,
                      }}>
                        <RiskBadge level={risk.risk_level} />
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        fontStyle: 'italic',
                        marginBottom: '8px',
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.04)',
                        borderRadius: '8px',
                        lineHeight: 1.6,
                      }}>
                        "{risk.clause_text}"
                      </div>
                      <div style={{ fontSize: '14px', color: config.color, lineHeight: 1.7, marginBottom: '10px' }}>
                        {risk.plain_language_explanation}
                      </div>
                      <div style={{
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.6)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#1f2937',
                        lineHeight: 1.6,
                      }}>
                        <strong>💡 Recommendation:</strong> {risk.recommendation}
                      </div>
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
            <div style={{ textAlign: 'center' as const, padding: '48px 24px', color: '#6b7280' }}>
              No specific actions identified.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
              {actions
                .sort((a: any, b: any) => {
                  const order = { critical: 0, high: 1, medium: 2, low: 3 };
                  return order[a.priority as RiskLevel] - order[b.priority as RiskLevel];
                })
                .map((action: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                    padding: '14px 16px',
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid #f3f4f6',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: getRiskConfig(action.priority).bg,
                      border: `2px solid ${getRiskConfig(action.priority).border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: getRiskConfig(action.priority).color,
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '15px',
                        color: '#1f2937',
                        fontWeight: 600,
                        lineHeight: 1.5,
                        marginBottom: '4px',
                      }}>
                        {action.action}
                      </div>
                      {action.deadline && (
                        <div style={{ fontSize: '13px', color: '#b45309' }}>
                          ⏰ By: {action.deadline}
                        </div>
                      )}
                      {action.note && (
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          ℹ️ {action.note}
                        </div>
                      )}
                    </div>
                    <RiskBadge level={action.priority} size="sm" />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        marginTop: '24px',
        padding: '14px 16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '12px',
        color: '#64748b',
        lineHeight: 1.6,
      }}>
        ⚖️ {analysis.disclaimer}
      </div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: React.ReactNode; icon: string }> = ({
  label,
  value,
  icon,
}) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #f3f4f6',
    padding: '14px 16px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  }}>
    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{icon}</div>
    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
      {label}
    </div>
    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>
      {value}
    </div>
  </div>
);

export default AnalysisDashboard;
