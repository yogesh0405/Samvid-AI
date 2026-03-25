/**
 * Samvid AI - Floating Chat Widget
 */
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";

interface FloatingChatProps {
  documentId: string;
}

const SUGGESTED = [
  "What is the notice period?",
  "Are there any penalties?",
  "What are my obligations?",
  "Is anything risky here?",
];

const FloatingChat: React.FC<FloatingChatProps> = ({ documentId }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggested, setSuggested] = useState(SUGGESTED);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100); } }, [open]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    setSuggested([]);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await axios.post(`${BASE_URL}/documents/${documentId}/chat`, { question, sessionId, history });
      const data = res.data.data;
      setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: "assistant", content: data.answer, confidence: data.confidence, sources: data.sources }]);
      if (data.suggestedQuestions?.length) setSuggested(data.suggestedQuestions.slice(0, 3));
      if (!open) setUnread(prev => prev + 1);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, could not process your question. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <>
      {open && (
        <div style={{ position: "fixed", bottom: "90px", right: "24px", width: "380px", height: "520px", background: "white", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column" as const, zIndex: 1000, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>⚖️</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "15px" }}>Samvid AI</div>
                <div style={{ fontSize: "11px", opacity: 0.8 }}>Ask about your document</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", fontSize: "14px" }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" as const, padding: "16px", display: "flex", flexDirection: "column" as const, gap: "10px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center" as const, padding: "24px", color: "#9ca3af" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>💬</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#4b5563" }}>Ask me anything</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>I will answer only from your document</div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%" }}>
                  {msg.role === "user" ? (
                    <div style={{ background: "#7c3aed", color: "white", padding: "10px 14px", borderRadius: "16px 16px 4px 16px", fontSize: "13px", lineHeight: 1.5 }}>{msg.content}</div>
                  ) : (
                    <div style={{ background: "#f9fafb", border: "1px solid #f3f4f6", padding: "10px 14px", borderRadius: "16px 16px 16px 4px" }}>
                      <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>{msg.content}</div>
                      {msg.confidence && <span style={{ display: "inline-block", marginTop: "4px", fontSize: "10px", padding: "1px 6px", borderRadius: "9999px", background: msg.confidence === "high" ? "#f0fdf4" : "#fff7ed", color: msg.confidence === "high" ? "#15803d" : "#c2410c" }}>{msg.confidence} confidence</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex" }}>
                <div style={{ background: "#f9fafb", border: "1px solid #f3f4f6", padding: "10px 14px", borderRadius: "16px 16px 16px 4px", display: "flex", gap: "4px", alignItems: "center" }}>
                  {[0,150,300].map(d => <div key={d} style={{ width: "6px", height: "6px", background: "#d1d5db", borderRadius: "50%", animation: `bounce 1s ${d}ms infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {suggested.length > 0 && !loading && messages.length < 2 && (
            <div style={{ padding: "8px 12px", borderTop: "1px solid #f9fafb", display: "flex", flexDirection: "column" as const, gap: "4px" }}>
              {suggested.map((q, i) => (
                <button key={i} onClick={() => send(q)} style={{ textAlign: "left" as const, fontSize: "12px", background: "#f9fafb", border: "1px solid #f3f4f6", color: "#4b5563", padding: "6px 12px", borderRadius: "8px", cursor: "pointer" }}>{q}</button>
              ))}
            </div>
          )}
          <div style={{ padding: "12px 14px", borderTop: "1px solid #f3f4f6", display: "flex", gap: "8px" }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)} placeholder="Ask a question..." disabled={loading} style={{ flex: 1, fontSize: "13px", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "9px 12px", outline: "none" }} />
            <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{ background: "#7c3aed", color: "white", border: "none", borderRadius: "10px", padding: "9px 14px", fontSize: "16px", cursor: "pointer", opacity: loading || !input.trim() ? 0.5 : 1 }}>↑</button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(prev => !prev)} style={{ position: "fixed", bottom: "24px", right: "24px", width: "56px", height: "56px", borderRadius: "50%", background: open ? "#4b5563" : "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white", border: "none", cursor: "pointer", fontSize: "22px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(124,58,237,0.4)", zIndex: 1001, transition: "all 0.2s" }}>
        {open ? "✕" : "💬"}
        {!open && unread > 0 && <div style={{ position: "absolute", top: "-4px", right: "-4px", width: "18px", height: "18px", background: "#ef4444", borderRadius: "50%", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>{unread}</div>}
      </button>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
    </>
  );
};

export default FloatingChat;
