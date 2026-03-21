"""
Samvid AI - Results Service Lambda Handler
"""
import logging, os, sys
sys.path.insert(0, "/opt/python")
from errors import DocumentNotFoundError, SamvidError
from utils import error, get_path_param, query_document_records, ok

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))


def lambda_handler(event: dict, context) -> dict:
    document_id = None
    try:
        document_id = get_path_param(event, "documentId")
        logger.info(f"Fetching results for documentId={document_id}")

        records = query_document_records(document_id)
        if not records:
            raise DocumentNotFoundError(document_id)

        result = {
            "document_id": document_id,
            "status": "unknown",
            "metadata": None,
            "ocr": None,
            "analysis": None,
            "translations": {},
            "voice": {},
        }

        for record in records:
            rt = record.get("recordType", "")

            if rt == "METADATA":
                result["metadata"] = record
                result["status"] = record.get("status", "unknown")

            elif rt == "OCR":
                result["ocr"] = {
                    "word_count": record.get("wordCount", 0),
                    "page_count": record.get("pageCount", 1),
                    "confidence_score": record.get("confidenceScore"),
                    "extracted_text_preview": (record.get("extractedText", "")[:500] + "...") if record.get("extractedText") else "",
                }

            elif rt == "ANALYSIS":
                result["analysis"] = {
                    "plain_language_summary": record.get("plainLanguageSummary", ""),
                    "document_type_detected": record.get("documentTypeDetected", ""),
                    "language_detected": record.get("languageDetected", ""),
                    "overall_risk_level": record.get("overallRiskLevel", ""),
                    "risk_summary": record.get("riskSummary", ""),
                    "key_points": record.get("keyPoints", []),
                    "obligations": record.get("obligations", []),
                    "deadlines": record.get("deadlines", []),
                    "penalties": record.get("penalties", []),
                    "risks": record.get("risks", []),
                    "actions_to_take": record.get("actionsToTake", []),
                    "disclaimer": record.get("disclaimer", ""),
                    "model_used": record.get("modelUsed", ""),
                    "analyzed_at": record.get("analyzedAt", ""),
                }

            elif rt.startswith("TRANSLATION"):
                lang = record.get("targetLanguage", rt)
                result["translations"][lang] = record

            elif rt.startswith("VOICE"):
                lang = record.get("languageCode", rt)
                result["voice"][lang] = record

        return ok(result)

    except SamvidError as e:
        logger.warning(f"Results error: {e.message}")
        return error(e.message, e.status_code, e.error_code)
    except Exception as e:
        logger.exception(f"Unexpected error fetching results for documentId={document_id}")
        return error("Failed to retrieve document results.", 500, "INTERNAL_ERROR")
