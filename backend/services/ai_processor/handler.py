"""
Samvid AI - AI Processor using Groq (free tier)
"""
import json, logging, os, sys
sys.path.insert(0, "/opt/python")
from openai import OpenAI
from errors import AnalysisError, DocumentNotFoundError, SamvidError
from models import ProcessingStatus
from utils import (
    error, get_openai_api_key, get_path_param, get_record,
    now_iso, ok, put_record, ttl_24h, update_document_status,
)

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

SYSTEM_PROMPT = """You are Samvid AI, a trusted legal document assistant for ordinary Indian citizens.
Make complex legal documents understandable to people with no legal background.
Output ONLY valid JSON. No preamble, no markdown, no explanation outside JSON."""

def build_user_prompt(text: str) -> str:
    return f"""Analyze the following Indian legal document and return ONLY a valid JSON object.

DOCUMENT TEXT:
---
{text[:8000]}
---

Return ONLY this JSON structure:
{{
  "plain_language_summary": "3-5 sentences explaining what this document means for the signer",
  "document_type_detected": "e.g. Arrest Warrant / Rental Agreement / Employment Contract",
  "language_detected": "English",
  "overall_risk_level": "low|medium|high|critical",
  "risk_summary": "1-2 sentences on overall risk",
  "key_points": [{{"heading": "string", "detail": "string", "important": true}}],
  "obligations": [{{"party": "string", "obligation": "string", "frequency": null, "amount": null}}],
  "deadlines": [{{"description": "string", "date_or_period": "string", "consequence": null, "priority": "high"}}],
  "penalties": [{{"trigger": "string", "penalty_description": "string", "amount_or_severity": null, "risk_level": "medium"}}],
  "risks": [{{"clause_text": "string", "plain_language_explanation": "string", "risk_level": "high", "recommendation": "string"}}],
  "actions_to_take": [{{"action": "string", "priority": "high", "deadline": null, "note": null}}]
}}"""


def lambda_handler(event: dict, context) -> dict:
    document_id = None
    try:
        document_id = get_path_param(event, "documentId")
        logger.info(f"Starting analysis for documentId={document_id}")

        ocr_record = get_record(document_id, "OCR")
        if not ocr_record:
            raise DocumentNotFoundError(document_id)

        extracted_text = ocr_record.get("extractedText") or ocr_record.get("extracted_text", "")
        if not extracted_text:
            raise AnalysisError("No extracted text found. Run OCR first.")

        update_document_status(document_id, ProcessingStatus.ANALYZING)

        api_key = get_openai_api_key()
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(extracted_text)},
            ],
            temperature=0.1,
            max_tokens=3000,
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        analysis = json.loads(raw)

        analysis_record = {
            "documentId": document_id,
            "recordType": "ANALYSIS",
            "plainLanguageSummary": analysis.get("plain_language_summary", ""),
            "documentTypeDetected": analysis.get("document_type_detected", ""),
            "languageDetected": analysis.get("language_detected", "English"),
            "overallRiskLevel": analysis.get("overall_risk_level", "low"),
            "riskSummary": analysis.get("risk_summary", ""),
            "keyPoints": analysis.get("key_points", []),
            "obligations": analysis.get("obligations", []),
            "deadlines": analysis.get("deadlines", []),
            "penalties": analysis.get("penalties", []),
            "risks": analysis.get("risks", []),
            "actionsToTake": analysis.get("actions_to_take", []),
            "disclaimer": "This analysis is AI-generated for informational purposes only. Consult a qualified lawyer.",
            "modelUsed": "llama-3.3-70b-versatile",
            "analyzedAt": now_iso(),
            "promptTokens": response.usage.prompt_tokens,
            "completionTokens": response.usage.completion_tokens,
            "ttl": ttl_24h(),
        }
        put_record(analysis_record)
        update_document_status(document_id, ProcessingStatus.COMPLETED)

        logger.info(f"Analysis complete for documentId={document_id}")
        return ok({
            "document_id": document_id,
            "status": "completed",
            "overall_risk_level": analysis_record["overallRiskLevel"],
            "document_type_detected": analysis_record["documentTypeDetected"],
            "key_points_count": len(analysis_record["keyPoints"]),
            "risks_count": len(analysis_record["risks"]),
            "model_used": "llama-3.3-70b-versatile",
        })

    except SamvidError as e:
        logger.warning(f"Analysis error: {e.message}")
        if document_id:
            update_document_status(document_id, ProcessingStatus.FAILED, error_message=e.message)
        return error(e.message, e.status_code, e.error_code)
    except Exception as e:
        logger.exception(f"Unexpected error in analyze handler for documentId={document_id}")
        if document_id:
            update_document_status(document_id, ProcessingStatus.FAILED, error_message=str(e))
        return error(str(e), 500, "INTERNAL_ERROR")
