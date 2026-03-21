"""
Samvid AI - Intelligence Lambda Handler
Wraps the extractor module for standalone invocation.
Primarily called inline by ai_processor; exposed here for independent
re-analysis, A/B testing, or pipeline debugging.
"""
import json
import logging
import os
import sys

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))
sys.path.insert(0, "/opt/python")

from errors import DocumentNotFoundError, SamvidBaseError
from utils import error_response, get_path_param, get_record, get_request_id, success_response

from extractor import build_enriched_prompt_context, detect_document_type, quick_risk_scan


def lambda_handler(event: dict, context) -> dict:
    """
    POST /api/v1/documents/{documentId}/intelligence
    Runs heuristic intelligence extraction on OCR text.
    Returns pre-analysis context (doc type, risk signals, financial refs).
    Useful for debugging and prompt tuning.
    """
    request_id = get_request_id(context)

    if event.get("httpMethod") == "OPTIONS":
        from utils import CORS_HEADERS
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        document_id = get_path_param(event, "documentId")
    except ValueError as e:
        return error_response(str(e), "INVALID_REQUEST", 400)

    try:
        ocr_raw = get_record(document_id, "OCR")
        if not ocr_raw:
            metadata = get_record(document_id, "METADATA")
            if not metadata:
                raise DocumentNotFoundError(document_id)
            return error_response("OCR not complete yet.", "OCR_NOT_COMPLETE", 409)

        text = ocr_raw.get("extractedText", "")
        if not text.strip():
            return error_response("No text to analyze.", "INSUFFICIENT_TEXT", 422)

        context_data = build_enriched_prompt_context(text)

        logger.info(
            f"[{request_id}] Intelligence extraction for {document_id}: "
            f"type={context_data['detected_type']}, risk={context_data['preliminary_risk']}"
        )

        return success_response(
            {"document_id": document_id, **context_data},
            message="Heuristic intelligence extraction complete.",
        )

    except SamvidBaseError as e:
        return error_response(e.message, e.error_code, e.status_code, request_id=request_id)
    except Exception as e:
        logger.exception(f"[{request_id}] Unexpected error in intelligence handler")
        return error_response("Intelligence extraction failed.", "INTERNAL_ERROR", 500, request_id=request_id)
