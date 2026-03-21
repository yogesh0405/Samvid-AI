/**
 * Samvid AI - Processing Status Stepper
 * Visual pipeline indicator showing upload → OCR → Analyze → Done steps.
 */
import React from 'react';
import { PROCESSING_STEPS, getCurrentStepIndex } from '../../utils';

interface ProcessingStepperProps {
  status: string;
  statusMessage: string;
}

const ProcessingStepper: React.FC<ProcessingStepperProps> = ({ status, statusMessage }) => {
  if (status === 'idle' || status === 'completed') return null;

  const currentStep = getCurrentStepIndex(status);
  const isFailed = status === 'failed';

  return (
    <div style={{
      background: isFailed ? '#fef2f2' : '#faf5ff',
      border: `1px solid ${isFailed ? '#fca5a5' : '#ddd6fe'}`,
      borderRadius: '14px',
      padding: '20px 24px',
      marginBottom: '24px',
    }}>
      {/* Steps */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0',
        marginBottom: '16px',
      }}>
        {PROCESSING_STEPS.map((step, i) => {
          const isComplete = !isFailed && i < currentStep;
          const isActive = !isFailed && i === currentStep;
          const isPending = isFailed ? true : i > currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step circle */}
              <div style={{ textAlign: 'center' as const, position: 'relative' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  background: isFailed && i === currentStep
                    ? '#fee2e2'
                    : isComplete
                    ? '#7c3aed'
                    : isActive
                    ? '#ede9fe'
                    : '#f3f4f6',
                  color: isFailed && i === currentStep
                    ? '#dc2626'
                    : isComplete
                    ? 'white'
                    : isActive
                    ? '#7c3aed'
                    : '#9ca3af',
                  border: `2px solid ${
                    isFailed && i === currentStep
                      ? '#dc2626'
                      : isComplete
                      ? '#7c3aed'
                      : isActive
                      ? '#7c3aed'
                      : '#e5e7eb'
                  }`,
                  animation: isActive ? 'pulse-ring 1.5s ease-in-out infinite' : 'none',
                }}>
                  {isFailed && i === currentStep
                    ? '✗'
                    : isComplete
                    ? '✓'
                    : isActive
                    ? <SpinIcon />
                    : i + 1}
                </div>
                <div style={{
                  marginTop: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isComplete || isActive ? '#5b21b6' : '#9ca3af',
                  whiteSpace: 'nowrap' as const,
                }}>
                  {step.label}
                </div>
              </div>

              {/* Connector line */}
              {i < PROCESSING_STEPS.length - 1 && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  background: i < currentStep ? '#7c3aed' : '#e5e7eb',
                  margin: '0 4px',
                  marginBottom: '22px',
                  transition: 'background 0.3s ease',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Status message */}
      <div style={{
        textAlign: 'center' as const,
        fontSize: '14px',
        fontWeight: 600,
        color: isFailed ? '#dc2626' : '#5b21b6',
        fontFamily: "'Sora', sans-serif",
      }}>
        {isFailed ? '❌ ' : ''}{statusMessage}
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(124, 58, 237, 0); }
          100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
        }
      `}</style>
    </div>
  );
};

const SpinIcon = () => (
  <div style={{
    width: '14px',
    height: '14px',
    border: '2px solid #ddd6fe',
    borderTopColor: '#7c3aed',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  }}>
    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export default ProcessingStepper;
