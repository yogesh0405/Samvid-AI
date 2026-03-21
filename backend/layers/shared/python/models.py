"""
Samvid AI - Shared Pydantic Models
Defines all domain models used across Lambda services.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


# ─────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    OCR_PROCESSING = "ocr_processing"
    OCR_COMPLETE = "ocr_complete"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXTRACTING = "extracting"
    PROCESSING = "processing"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SupportedLanguage(str, Enum):
    HINDI = "hi"
    TAMIL = "ta"
    TELUGU = "te"
    BENGALI = "bn"
    MARATHI = "mr"
    GUJARATI = "gu"
    KANNADA = "kn"
    MALAYALAM = "ml"
    PUNJABI = "pa"
    ODIA = "or"
    ENGLISH = "en"


LANGUAGE_NAMES = {
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "bn": "Bengali",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "or": "Odia",
    "en": "English",
}

# AWS Polly voice IDs per language
POLLY_VOICE_MAP = {
    "hi": "Aditi",
    "ta": "Kajal",    # Neural voice for Tamil
    "te": "Kajal",    # Closest neural voice
    "en": "Joanna",
    # Remaining languages use standard neural voices
    "bn": "Aditi",
    "mr": "Aditi",
    "gu": "Aditi",
    "kn": "Aditi",
    "ml": "Aditi",
    "pa": "Aditi",
    "or": "Aditi",
}

SUPPORTED_MIME_TYPES = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


# ─────────────────────────────────────────
# DynamoDB Record Types
# ─────────────────────────────────────────

class RecordType(str, Enum):
    METADATA = "METADATA"
    OCR = "OCR"
    ANALYSIS = "ANALYSIS"
    TRANSLATION = "TRANSLATION#{language_code}"
    VOICE = "VOICE#{language_code}"


# ─────────────────────────────────────────
# Upload Models
# ─────────────────────────────────────────

class UploadRequest(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    file_size: int = Field(..., gt=0, le=MAX_FILE_SIZE_BYTES)
    mime_type: str = Field(...)
    document_type: Optional[str] = Field(None, description="e.g. 'rental_agreement', 'employment_contract'")

    @validator("mime_type")
    def validate_mime_type(cls, v):
        if v not in SUPPORTED_MIME_TYPES:
            raise ValueError(f"Unsupported file type: {v}. Allowed: PDF, JPG, PNG")
        return v

    @validator("file_name")
    def sanitize_filename(cls, v):
        # Remove dangerous characters
        import re
        sanitized = re.sub(r'[^\w\s\-.]', '', v)
        return sanitized[:255]


class UploadResponse(BaseModel):
    document_id: str
    upload_url: str
    s3_key: str
    expires_in: int = 3600
    message: str = "Upload URL generated. PUT your file to this URL."


class DocumentMetadata(BaseModel):
    document_id: str
    record_type: str = RecordType.METADATA
    file_name: str
    file_size: int
    mime_type: str
    s3_key: str
    document_type: Optional[str] = None
    status: ProcessingStatus = ProcessingStatus.PENDING
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    ttl: Optional[int] = None  # Unix timestamp for DynamoDB TTL (auto-delete after 24h)
    error_message: Optional[str] = None


# ─────────────────────────────────────────
# OCR Models
# ─────────────────────────────────────────

class OcrResult(BaseModel):
    document_id: str
    record_type: str = RecordType.OCR
    extracted_text: str
    page_count: int = 1
    confidence_score: Optional[float] = None
    ocr_engine: str = "AWS_TEXTRACT"
    processed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    character_count: int = 0
    word_count: int = 0


# ─────────────────────────────────────────
# AI Analysis Models
# ─────────────────────────────────────────

class Deadline(BaseModel):
    description: str
    date_or_period: str
    consequence: Optional[str] = None
    priority: RiskLevel = RiskLevel.MEDIUM


class Obligation(BaseModel):
    party: str  # e.g. "Tenant", "Employer", "You (the signer)"
    obligation: str
    frequency: Optional[str] = None  # e.g. "Monthly", "Once", "Ongoing"
    amount: Optional[str] = None


class Penalty(BaseModel):
    trigger: str  # What causes the penalty
    penalty_description: str
    amount_or_severity: Optional[str] = None
    risk_level: RiskLevel = RiskLevel.MEDIUM


class RiskClause(BaseModel):
    clause_text: str
    plain_language_explanation: str
    risk_level: RiskLevel
    recommendation: str


class ActionItem(BaseModel):
    action: str
    priority: RiskLevel = RiskLevel.MEDIUM
    deadline: Optional[str] = None
    note: Optional[str] = None


class KeyPoint(BaseModel):
    heading: str
    detail: str
    important: bool = False


class LegalAnalysis(BaseModel):
    document_id: str
    record_type: str = RecordType.ANALYSIS
    plain_language_summary: str = Field(..., description="Simple, clear explanation for a non-lawyer")
    document_type_detected: str
    language_detected: str = "English"
    key_points: List[KeyPoint] = []
    obligations: List[Obligation] = []
    deadlines: List[Deadline] = []
    penalties: List[Penalty] = []
    risks: List[RiskClause] = []
    actions_to_take: List[ActionItem] = []
    overall_risk_level: RiskLevel = RiskLevel.LOW
    risk_summary: str = ""
    disclaimer: str = (
        "This analysis is generated by AI for informational purposes only. "
        "It is not a substitute for professional legal advice. "
        "Please consult a qualified lawyer for decisions related to this document."
    )
    model_used: str = "gpt-4o"
    analyzed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    prompt_tokens: int = 0
    completion_tokens: int = 0


# ─────────────────────────────────────────
# Translation Models
# ─────────────────────────────────────────

class TranslationRequest(BaseModel):
    target_language: SupportedLanguage
    sections: Optional[List[str]] = None  # If None, translate all sections


class TranslatedContent(BaseModel):
    plain_language_summary: str
    key_points_translated: List[Dict[str, Any]] = []
    obligations_translated: List[Dict[str, Any]] = []
    deadlines_translated: List[Dict[str, Any]] = []
    actions_to_take_translated: List[Dict[str, Any]] = []


class TranslationRecord(BaseModel):
    document_id: str
    record_type: str  # TRANSLATION#{language_code}
    target_language: str
    target_language_name: str
    translated_content: TranslatedContent
    translated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    translation_engine: str = "AWS_TRANSLATE"


# ─────────────────────────────────────────
# Voice Models
# ─────────────────────────────────────────

class VoiceRequest(BaseModel):
    language_code: SupportedLanguage = SupportedLanguage.ENGLISH


class VoiceRecord(BaseModel):
    document_id: str
    record_type: str  # VOICE#{language_code}
    language_code: str
    language_name: str
    audio_s3_key: str
    audio_url: str
    audio_format: str = "mp3"
    voice_id: str
    duration_estimate_seconds: Optional[int] = None
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ─────────────────────────────────────────
# API Response Wrappers
# ─────────────────────────────────────────

class ApiSuccess(BaseModel):
    success: bool = True
    data: Any
    message: Optional[str] = None


class ApiError(BaseModel):
    success: bool = False
    error: str
    error_code: str
    details: Optional[Any] = None
    request_id: Optional[str] = None


class DocumentResultsResponse(BaseModel):
    document_id: str
    status: ProcessingStatus
    metadata: Optional[DocumentMetadata] = None
    ocr: Optional[OcrResult] = None
    analysis: Optional[LegalAnalysis] = None
    translations: Dict[str, TranslationRecord] = {}
    voice: Dict[str, VoiceRecord] = {}

# Aliases for handler compatibility
UploadMetadata = DocumentMetadata
UploadResult = UploadResponse



# ─────────────────────────────────────────
# CamelCase aliases used by upload handler
# ─────────────────────────────────────────
from typing import Optional as _Opt

class UploadMetadata(BaseModel):
    documentId: str
    originalFilename: str = ""
    mimeType: str = ""
    fileSizeBytes: int = 0
    s3Key: str = ""
    status: ProcessingStatus = ProcessingStatus.UPLOADED
    uploadedAt: str = ""
    ttl: _Opt[int] = None
    recordType: str = "METADATA"
    errorMessage: _Opt[str] = None

    def model_dump(self, **kwargs):
        d = super().model_dump(**kwargs)
        # Map to DynamoDB keys expected by get_record / put_record
        return {
            "documentId": d["documentId"],
            "recordType": d["recordType"],
            "originalFilename": d["originalFilename"],
            "mimeType": d["mimeType"],
            "fileSizeBytes": d["fileSizeBytes"],
            "s3Key": d["s3Key"],
            "status": d["status"],
            "uploadedAt": d["uploadedAt"],
            "ttl": d["ttl"],
            "errorMessage": d.get("errorMessage"),
        }


# ── Aliases and additional models used by handlers ────────────────────────

class OcrRecord(BaseModel):
    documentId: str
    recordType: str = "OCR"
    extractedText: str = ""
    pageCount: int = 1
    wordCount: int = 0
    characterCount: int = 0
    confidenceScore: Optional[float] = None
    ocrEngine: str = "AWS_TEXTRACT"
    processedAt: str = ""
    ttl: Optional[int] = None

class LegalClause(BaseModel):
    clauseText: str = ""
    plainLanguageExplanation: str = ""
    riskLevel: str = "low"
    recommendation: str = ""

class AnalysisRecord(BaseModel):
    documentId: str
    recordType: str = "ANALYSIS"
    plainLanguageSummary: str = ""
    documentTypeDetected: str = ""
    languageDetected: str = "English"
    keyPoints: List[Any] = []
    obligations: List[Any] = []
    deadlines: List[Any] = []
    penalties: List[Any] = []
    risks: List[Any] = []
    actionsToTake: List[Any] = []
    overallRiskLevel: str = "low"
    riskSummary: str = ""
    disclaimer: str = "This analysis is AI-generated for informational purposes only. Consult a qualified lawyer."
    modelUsed: str = "gpt-4o"
    analyzedAt: str = ""
    promptTokens: int = 0
    completionTokens: int = 0
    ttl: Optional[int] = None

class TranslateRequest(BaseModel):
    targetLanguage: str = "hi"
    sections: Optional[List[str]] = None

class TranslationRecord(BaseModel):
    documentId: str
    recordType: str = "TRANSLATION"
    targetLanguage: str = ""
    targetLanguageName: str = ""
    translatedContent: Dict[str, Any] = {}
    translatedAt: str = ""
    translationEngine: str = "AWS_TRANSLATE"
    ttl: Optional[int] = None

class VoiceRecord(BaseModel):
    documentId: str
    recordType: str = "VOICE"
    languageCode: str = ""
    languageName: str = ""
    audioS3Key: str = ""
    audioUrl: str = ""
    audioFormat: str = "mp3"
    voiceId: str = ""
    durationEstimateSeconds: Optional[int] = None
    generatedAt: str = ""
    ttl: Optional[int] = None

class VoiceRequest(BaseModel):
    languageCode: str = "en"

class AnalyzeResponse(BaseModel):
    documentId: str = ""
    status: str = ""
    analysis: Optional[Dict[str, Any]] = None

class TranslateResponse(BaseModel):
    documentId: str = ""
    targetLanguage: str = ""
    translatedContent: Optional[Dict[str, Any]] = None

class VoiceResponse(BaseModel):
    documentId: str = ""
    languageCode: str = ""
    audioUrl: str = ""

class DocumentResultsResponse(BaseModel):
    documentId: str = ""
    status: str = ""
    metadata: Optional[Dict[str, Any]] = None
    ocr: Optional[Dict[str, Any]] = None
    analysis: Optional[Dict[str, Any]] = None
    translations: Dict[str, Any] = {}
    voice: Dict[str, Any] = {}
