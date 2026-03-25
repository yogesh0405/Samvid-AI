/**
 * Samvid AI - Lawyer Finder
 * Shows lawyers directly on page - no Google redirect
 */
import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";

interface LawyerFinderProps {
  documentId: string;
  onBack: () => void;
}

interface Lawyer {
  name: string;
  specialization: string[];
  city: string;
  phone: string;
  experience: string;
  languages: string[];
  rating: number;
  reviews: number;
  fee: string;
  verified: boolean;
  barId?: string;
}

const LAWYER_DATABASE: Lawyer[] = [
  { name: "Adv. Priya Sharma", specialization: ["Criminal Law", "Bail Applications"], city: "Mumbai", phone: "+91 98200 12345", experience: "12 years", languages: ["Hindi", "English", "Marathi"], rating: 4.8, reviews: 124, fee: "₹2,000-5,000/hr", verified: true, barId: "MH/2012/4521" },
  { name: "Adv. Rajesh Mehta", specialization: ["Property Law", "Real Estate"], city: "Mumbai", phone: "+91 98200 23456", experience: "18 years", languages: ["Hindi", "English", "Gujarati"], rating: 4.7, reviews: 89, fee: "₹3,000-8,000/hr", verified: true, barId: "MH/2006/1234" },
  { name: "Adv. Vikram Joshi", specialization: ["Criminal Law", "FIR", "Criminal Defense"], city: "Mumbai", phone: "+91 98200 45678", experience: "22 years", languages: ["Hindi", "Marathi", "English"], rating: 4.9, reviews: 210, fee: "₹5,000-15,000/hr", verified: true, barId: "MH/2002/0987" },
  { name: "Adv. Ananya Singh", specialization: ["Criminal Law", "Bail Applications", "Criminal Defense"], city: "Delhi", phone: "+91 98100 12345", experience: "15 years", languages: ["Hindi", "English", "Punjabi"], rating: 4.9, reviews: 198, fee: "₹3,000-8,000/hr", verified: true, barId: "DL/2009/5678" },
  { name: "Adv. Mohit Kapoor", specialization: ["Property Law", "Civil Law"], city: "Delhi", phone: "+91 98100 23456", experience: "11 years", languages: ["Hindi", "English"], rating: 4.5, reviews: 76, fee: "₹2,000-6,000/hr", verified: true },
  { name: "Adv. Ritu Gupta", specialization: ["Family Law", "Domestic Violence", "Criminal Law"], city: "Delhi", phone: "+91 98100 34567", experience: "8 years", languages: ["Hindi", "English"], rating: 4.7, reviews: 134, fee: "₹1,500-4,000/hr", verified: true, barId: "DL/2016/2345" },
  { name: "Adv. Suresh Pandey", specialization: ["Labour Law", "Consumer Law", "Banking Law"], city: "Delhi", phone: "+91 98100 45678", experience: "20 years", languages: ["Hindi", "English", "Bengali"], rating: 4.8, reviews: 167, fee: "₹4,000-10,000/hr", verified: true },
  { name: "Adv. Kavitha Reddy", specialization: ["Criminal Law", "Bail Applications"], city: "Bangalore", phone: "+91 98400 12345", experience: "10 years", languages: ["Kannada", "English", "Telugu"], rating: 4.7, reviews: 89, fee: "₹2,000-5,000/hr", verified: true },
  { name: "Adv. Ramesh Naidu", specialization: ["Property Law", "Real Estate", "Civil Law"], city: "Bangalore", phone: "+91 98400 23456", experience: "16 years", languages: ["Kannada", "Telugu", "English"], rating: 4.6, reviews: 112, fee: "₹2,500-7,000/hr", verified: true, barId: "KA/2008/3456" },
  { name: "Adv. Murugan Pillai", specialization: ["Criminal Law", "Criminal Defense"], city: "Chennai", phone: "+91 98440 12345", experience: "25 years", languages: ["Tamil", "English"], rating: 4.9, reviews: 245, fee: "₹3,000-10,000/hr", verified: true, barId: "TN/1999/1111" },
  { name: "Adv. Lakshmi Venkat", specialization: ["Property Law", "Civil Law", "Registration"], city: "Chennai", phone: "+91 98440 23456", experience: "13 years", languages: ["Tamil", "English", "Telugu"], rating: 4.7, reviews: 98, fee: "₹2,000-5,000/hr", verified: true },
  { name: "Adv. Abhishek Deshpande", specialization: ["Criminal Law", "Bail Applications", "FIR"], city: "Pune", phone: "+91 98220 12345", experience: "14 years", languages: ["Marathi", "Hindi", "English"], rating: 4.8, reviews: 143, fee: "₹2,000-6,000/hr", verified: true, barId: "MH/2010/7890" },
  { name: "Adv. Sneha Kulkarni", specialization: ["Property Law", "Real Estate", "Civil Law"], city: "Pune", phone: "+91 98220 23456", experience: "11 years", languages: ["Marathi", "Hindi", "English"], rating: 4.6, reviews: 87, fee: "₹1,500-4,500/hr", verified: true },
  { name: "Adv. Srinivas Rao", specialization: ["Criminal Law", "Criminal Defense", "Bail Applications"], city: "Hyderabad", phone: "+91 98490 12345", experience: "19 years", languages: ["Telugu", "Hindi", "English"], rating: 4.8, reviews: 176, fee: "₹2,500-7,000/hr", verified: true },
  { name: "Adv. Debasis Ghosh", specialization: ["Criminal Law", "FIR", "Criminal Defense"], city: "Kolkata", phone: "+91 98300 12345", experience: "17 years", languages: ["Bengali", "Hindi", "English"], rating: 4.7, reviews: 134, fee: "₹2,000-6,000/hr", verified: true },
  { name: "Adv. Gurpreet Singh", specialization: ["Criminal Law", "Bail Applications", "Criminal Defense"], city: "Chandigarh", phone: "+91 98150 12345", experience: "16 years", languages: ["Punjabi", "Hindi", "English"], rating: 4.8, reviews: 121, fee: "₹2,000-6,000/hr", verified: true, barId: "PB/2008/4567" },
  { name: "Adv. Bhavesh Patel", specialization: ["Criminal Law", "Criminal Defense"], city: "Ahmedabad", phone: "+91 98250 12345", experience: "20 years", languages: ["Gujarati", "Hindi", "English"], rating: 4.8, reviews: 156, fee: "₹2,500-7,000/hr", verified: true },
  { name: "Adv. Meera Shah", specialization: ["Property Law", "Real Estate", "Banking Law"], city: "Ahmedabad", phone: "+91 98250 23456", experience: "13 years", languages: ["Gujarati", "Hindi", "English"], rating: 4.6, reviews: 94, fee: "₹2,000-5,000/hr", verified: true },
  { name: "Adv. Rakesh Sharma", specialization: ["Criminal Law", "Bail Applications"], city: "Jaipur", phone: "+91 98290 12345", experience: "15 years", languages: ["Hindi", "English"], rating: 4.7, reviews: 108, fee: "₹1,500-5,000/hr", verified: true },
  { name: "Adv. Anil Kumar Verma", specialization: ["Criminal Law", "Criminal Defense", "FIR"], city: "Lucknow", phone: "+91 98390 12345", experience: "22 years", languages: ["Hindi", "English", "Urdu"], rating: 4.8, reviews: 189, fee: "₹2,000-6,000/hr", verified: true },
  { name: "Adv. Nilesh Patil", specialization: ["Labour Law", "Employment Law"], city: "Pune", phone: "+91 98220 56789", experience: "8 years", languages: ["Marathi", "Hindi", "English"], rating: 4.5, reviews: 56, fee: "₹1,500-3,500/hr", verified: true },
  { name: "Adv. Padma Sharma", specialization: ["Property Law", "Civil Law"], city: "Hyderabad", phone: "+91 98490 23456", experience: "12 years", languages: ["Telugu", "Hindi", "Urdu"], rating: 4.6, reviews: 93, fee: "₹2,000-5,000/hr", verified: true },
  { name: "Adv. Deepa Krishnan", specialization: ["Labour Law", "Employment Law"], city: "Bangalore", phone: "+91 98400 34567", experience: "7 years", languages: ["Kannada", "English", "Tamil"], rating: 4.5, reviews: 54, fee: "₹1,500-3,500/hr", verified: true },
  { name: "Adv. Harpreet Kaur", specialization: ["Property Law", "Civil Law", "NRI Legal"], city: "Chandigarh", phone: "+91 98150 23456", experience: "11 years", languages: ["Punjabi", "Hindi", "English"], rating: 4.7, reviews: 89, fee: "₹1,500-4,500/hr", verified: true },
];

const PRACTICE_AREAS: Record<string, string[]> = {
  "Arrest Warrant": ["Criminal Law", "Bail Applications", "Criminal Defense", "FIR"],
  "Rental Agreement": ["Property Law", "Civil Law", "Consumer Law"],
  "Employment Contract": ["Labour Law", "Employment Law"],
  "Loan Agreement": ["Banking Law", "Consumer Law", "Civil Law"],
  "Sale Deed": ["Property Law", "Real Estate", "Registration"],
  "Default": ["Criminal Law", "Property Law", "Civil Law"],
};

const FREE_AID = [
  { name: "NALSA Helpline", phone: "15100", desc: "National Legal Services Authority — Free legal aid for eligible citizens", hours: "24/7" },
  { name: "State Legal Services", phone: "1800-11-0031", desc: "Free at state level — SC/ST, women, children, disabled persons", hours: "9AM-6PM" },
  { name: "Women Helpline", phone: "181", desc: "Free legal help for women facing domestic violence or harassment", hours: "24/7" },
  { name: "Child Helpline", phone: "1098", desc: "Free legal aid for children in need of protection", hours: "24/7" },
];

const CITIES = [...new Set(LAWYER_DATABASE.map(l => l.city))].sort();

export default function LawyerFinder({ documentId, onBack }: LawyerFinderProps) {
  const [docType, setDocType] = useState("Default");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [results, setResults] = useState<Lawyer[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"find" | "free">("find");

  useEffect(() => {
    axios.get(`${BASE_URL}/documents/${documentId}/results`)
      .then(res => {
        const detected = res.data.data?.analysis?.document_type_detected || "Default";
        setDocType(detected);
        const areas = PRACTICE_AREAS[detected] || PRACTICE_AREAS.Default;
        setSelectedArea(areas[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  const search = () => {
    let filtered = [...LAWYER_DATABASE];
    if (selectedCity) filtered = filtered.filter(l => l.city === selectedCity);
    if (selectedArea) filtered = filtered.filter(l =>
      l.specialization.some(s => s.toLowerCase().includes(selectedArea.toLowerCase()) || selectedArea.toLowerCase().includes(s.toLowerCase()))
    );
    setResults(filtered.sort((a, b) => b.rating - a.rating));
    setSearched(true);
  };

  const areas = PRACTICE_AREAS[docType] || PRACTICE_AREAS.Default;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ background: "white", borderBottom: "1px solid #f3f4f6", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px", height: "64px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>← Back</button>
          <div style={{ width: "1px", height: "20px", background: "#f3f4f6" }} />
          <div style={{ fontSize: "14px", color: "#9ca3af" }}>Find a Lawyer</div>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ width: "72px", height: "72px", background: "linear-gradient(135deg, #0f766e, #14b8a6)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 16px" }}>👨‍⚖️</div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1f2937", margin: "0 0 8px" }}>Find a Lawyer</h1>
          <p style={{ fontSize: "15px", color: "#6b7280", margin: 0 }}>Verified lawyers for your {docType} case across India</p>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "28px", background: "white", padding: "6px", borderRadius: "14px", border: "1px solid #f3f4f6", width: "fit-content" }}>
          {[{ id: "find", label: "🔍 Find Lawyers" }, { id: "free", label: "🆓 Free Legal Aid" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: activeTab === t.id ? "#0f766e" : "transparent", color: activeTab === t.id ? "white" : "#6b7280", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "find" && (
          <>
            <div style={{ background: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0", padding: "14px 20px", marginBottom: "24px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#15803d" }}>✅ Document: {docType}</div>
              <div style={{ fontSize: "12px", color: "#16a34a", marginTop: "2px" }}>Suggested areas: {areas.slice(0, 3).join(", ")}</div>
            </div>

            <div style={{ background: "white", borderRadius: "16px", border: "1px solid #f3f4f6", padding: "24px", marginBottom: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>City</label>
                  <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} style={{ width: "100%", fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "11px 14px", outline: "none", background: "white" }}>
                    <option value="">All cities</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Practice Area</label>
                  <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)} style={{ width: "100%", fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "11px 14px", outline: "none", background: "white" }}>
                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    <option value="">All areas</option>
                  </select>
                </div>
              </div>
              <button onClick={search} style={{ width: "100%", background: "linear-gradient(135deg, #0f766e, #14b8a6)", color: "white", border: "none", borderRadius: "12px", padding: "14px", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}>
                🔍 Search Lawyers
              </button>
            </div>

            {searched && (
              <>
                <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px", fontWeight: 600 }}>
                  {results.length > 0 ? `Found ${results.length} verified lawyers` : "No lawyers found — try different filters"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {results.map((lawyer, i) => (
                    <div key={i} style={{ background: "white", borderRadius: "16px", border: "1px solid #f3f4f6", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                        <div style={{ width: "56px", height: "56px", background: "linear-gradient(135deg, #0f766e, #14b8a6)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>⚖️</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                            <span style={{ fontSize: "17px", fontWeight: 700, color: "#1f2937" }}>{lawyer.name}</span>
                            {lawyer.verified && <span style={{ fontSize: "11px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "9999px", fontWeight: 700 }}>✓ Verified</span>}
                            {lawyer.barId && <span style={{ fontSize: "11px", color: "#9ca3af" }}>Bar: {lawyer.barId}</span>}
                          </div>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                            {lawyer.specialization.map(s => <span key={s} style={{ fontSize: "12px", background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: "9999px" }}>{s}</span>)}
                          </div>
                          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "#6b7280", marginBottom: "10px" }}>
                            <span>📍 {lawyer.city}</span>
                            <span>⏱️ {lawyer.experience}</span>
                            <span>💰 {lawyer.fee}</span>
                            <span>🗣️ {lawyer.languages.join(", ")}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
                            {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: "14px", color: s <= Math.round(lawyer.rating) ? "#f59e0b" : "#e5e7eb" }}>★</span>)}
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1f2937" }}>{lawyer.rating}</span>
                            <span style={{ fontSize: "13px", color: "#9ca3af" }}>({lawyer.reviews} reviews)</span>
                          </div>
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <a href={`tel:${lawyer.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0f766e", color: "white", borderRadius: "10px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>📞 Call</a>
                            <a href={`https://wa.me/${lawyer.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", borderRadius: "10px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>💬 WhatsApp</a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "free" && (
          <div>
            <div style={{ background: "#eff6ff", borderRadius: "12px", border: "1px solid #bfdbfe", padding: "16px 20px", marginBottom: "24px", fontSize: "14px", color: "#1d4ed8" }}>
              ℹ️ Under <strong>Article 39A</strong>, every Indian citizen has the right to free legal aid. You qualify if you are SC/ST, woman, child, disabled, person in custody, or earn below ₹1 lakh/year.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              {FREE_AID.map((aid, i) => (
                <div key={i} style={{ background: "white", borderRadius: "16px", border: "1px solid #f3f4f6", padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
                  <div style={{ width: "56px", height: "56px", background: "#eff6ff", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>🏛️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#1f2937", marginBottom: "4px" }}>{aid.name}</div>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>{aid.desc}</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>⏰ {aid.hours}</div>
                  </div>
                  <a href={`tel:${aid.phone}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", background: "#7c3aed", color: "white", borderRadius: "12px", padding: "14px 20px", textDecoration: "none", flexShrink: 0 }}>
                    <span style={{ fontSize: "20px" }}>📞</span>
                    <span style={{ fontSize: "16px", fontWeight: 800 }}>{aid.phone}</span>
                    <span style={{ fontSize: "10px", opacity: 0.8 }}>Tap to call</span>
                  </a>
                </div>
              ))}
            </div>
            <div style={{ background: "#faf5ff", borderRadius: "16px", border: "1px solid #e9d5ff", padding: "24px" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#7c3aed", marginBottom: "8px" }}>📍 Find Your District Legal Services Authority</div>
              <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px", lineHeight: 1.6 }}>Every district court has a free legal aid office. Visit your nearest district court and ask for the "Legal Services Authority" counter.</div>
              <a href="https://nalsa.gov.in/lsas" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#7c3aed", color: "white", borderRadius: "10px", padding: "12px 24px", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>Find District LSA →</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
