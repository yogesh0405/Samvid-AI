/**
 * Samvid AI - Voice Explanation Panel
 * Generates and plays audio explanations via AWS Polly.
 */
import React, { useRef, useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, LanguageCode, VoiceRecord } from '../../types';
import { formatDuration } from '../../utils';

interface VoicePanelProps {
  documentId: string | null;
  activeLanguage: LanguageCode;
  voiceRecord: VoiceRecord | null;
  isLoading: boolean;
  error: string | null;
  onGenerate: (languageCode: LanguageCode) => void;
}

const VoicePanel: React.FC<VoicePanelProps> = ({
  documentId,
  activeLanguage,
  voiceRecord,
  isLoading,
  error,
  onGenerate,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(activeLanguage);

  useEffect(() => {
    setSelectedLang(activeLanguage);
  }, [activeLanguage]);

  // Reset player when voice record changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [voiceRecord]);

  const handlePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!documentId) return null;

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #f3f4f6',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #f3f4f6',
        background: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontSize: '20px' }}>🎧</span>
        <div>
          <div style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 700,
            fontSize: '16px',
            color: '#1f2937',
          }}>
            Voice Explanation
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Listen to an audio summary of your document
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Language + generate */}
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap' as const,
        }}>
          <select
            value={selectedLang}
            onChange={e => setSelectedLang(e.target.value as LanguageCode)}
            disabled={isLoading}
            style={{
              flex: 1,
              minWidth: '160px',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1.5px solid #e5e7eb',
              fontSize: '14px',
              color: '#374151',
              background: 'white',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
           {SUPPORTED_LANGUAGES
  .filter(l => ['en', 'hi', 'mr'].includes(l.code))
  .map(l => (
    <option key={l.code} value={l.code}>
      {l.nativeName} ({l.name})
    </option>
  ))
}
          </select>

          <button
            onClick={() => onGenerate(selectedLang)}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              background: isLoading ? '#e5e7eb' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: isLoading ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: "'Sora', sans-serif",
              cursor: isLoading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap' as const,
              transition: 'all 0.15s ease',
            }}
          >
            {isLoading ? '⏳ Generating...' : '🎙️ Generate Audio'}
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{
            textAlign: 'center' as const,
            padding: '24px',
            color: '#7c3aed',
          }}>
            <div style={{
              display: 'inline-block',
              width: '32px',
              height: '32px',
              border: '3px solid #ede9fe',
              borderTopColor: '#7c3aed',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '12px',
            }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              Generating audio...
            </div>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
              This may take up to 30 seconds
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div style={{
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            color: '#991b1b',
            fontSize: '14px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Audio player */}
        {voiceRecord && !isLoading && (
          <div>
            <audio
              ref={audioRef}
              src={voiceRecord.audio_url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              style={{ display: 'none' }}
            />

            {/* Player UI */}
            <div style={{
              background: 'linear-gradient(135deg, #4c1d95, #6d28d9)',
              borderRadius: '14px',
              padding: '20px',
              color: 'white',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '16px',
              }}>
                {/* Play/Pause button */}
                <button
                  onClick={handlePlay}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Sora', sans-serif",
                    fontWeight: 700,
                    fontSize: '15px',
                    marginBottom: '2px',
                  }}>
                    {voiceRecord.language_name} Explanation
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.75 }}>
                    Voice: {voiceRecord.voice_id}
                    {voiceRecord.duration_estimate_seconds && (
                      <span> · ~{formatDuration(voiceRecord.duration_estimate_seconds)}</span>
                    )}
                  </div>
                </div>

                {/* Download */}
                <a
                  href={voiceRecord.audio_url}
                  download="samvid-explanation.mp3"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    fontSize: '16px',
                    transition: 'background 0.15s ease',
                    flexShrink: 0,
                  }}
                  title="Download audio"
                >
                  ⬇
                </a>
              </div>

              {/* Progress bar */}
              <div style={{ position: 'relative' }}>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  style={{
                    width: '100%',
                    height: '4px',
                    appearance: 'none' as any,
                    background: `linear-gradient(to right, rgba(255,255,255,0.8) ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
                    borderRadius: '9999px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  opacity: 0.7,
                  marginTop: '6px',
                }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '12px',
              fontSize: '12px',
              color: '#9ca3af',
              textAlign: 'center' as const,
            }}>
              Link expires in 1 hour
            </div>
          </div>
        )}

        {/* Empty state */}
        {!voiceRecord && !isLoading && !error && (
          <div style={{
            textAlign: 'center' as const,
            padding: '32px',
            color: '#9ca3af',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎧</div>
            <div style={{ fontSize: '14px' }}>
              Select a language and click "Generate Audio" to hear your document explained
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default VoicePanel;
