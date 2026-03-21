"""
Samvid AI - Unit Tests for Shared Utilities and Models
Run: pytest tests/test_units.py -v

Does NOT require AWS credentials or live services.
"""
import json
import sys
import os
import pytest

# Make shared layer importable in test context
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend", "layers", "shared", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend", "services", "intelligence"))

# ─────────────────────────────────────────
# Models Tests
# ─────────────────────────────────────────

class TestUploadRequestValidation:
    def test_valid_pdf_upload(self):
        from models import UploadRequest
        req = UploadRequest(
            file_name="agreement.pdf",
            file_size=1_024_000,
            mime_type="application/pdf",
        )
        assert req.file_name == "agreement.pdf"
        assert req.mime_type == "application/pdf"

    def test_valid_image_upload(self):
        from models import UploadRequest
        req = UploadRequest(file_name="doc.jpg", file_size=500_000, mime_type="image/jpeg")
        assert req.mime_type == "image/jpeg"

    def test_invalid_mime_type_rejected(self):
        from models import UploadRequest
        import pydantic
        with pytest.raises((ValueError, pydantic.ValidationError)):
            UploadRequest(file_name="doc.docx", file_size=100_000, mime_type="application/msword")

    def test_file_too_large_rejected(self):
        from models import UploadRequest, MAX_FILE_SIZE_BYTES
        import pydantic
        with pytest.raises((ValueError, pydantic.ValidationError)):
            UploadRequest(
                file_name="huge.pdf",
                file_size=MAX_FILE_SIZE_BYTES + 1,
                mime_type="application/pdf",
            )

    def test_filename_sanitization(self):
        from models import UploadRequest
        req = UploadRequest(
            file_name="my doc <script>.pdf",
            file_size=10_000,
            mime_type="application/pdf",
        )
        assert "<" not in req.file_name
        assert ">" not in req.file_name

    def test_empty_filename_rejected(self):
        from models import UploadRequest
        import pydantic
        with pytest.raises((ValueError, pydantic.ValidationError)):
            UploadRequest(file_name="", file_size=10_000, mime_type="application/pdf")


class TestRiskLevel:
    def test_risk_levels_exist(self):
        from models import RiskLevel
        assert RiskLevel.LOW == "low"
        assert RiskLevel.MEDIUM == "medium"
        assert RiskLevel.HIGH == "high"
        assert RiskLevel.CRITICAL == "critical"


class TestSupportedLanguages:
    def test_all_languages_present(self):
        from models import SupportedLanguage, LANGUAGE_NAMES
        expected = ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa", "or", "en"]
        for code in expected:
            assert code in LANGUAGE_NAMES, f"Missing language: {code}"

    def test_polly_voice_map_complete(self):
        from models import POLLY_VOICE_MAP, SupportedLanguage
        for lang in SupportedLanguage:
            assert lang.value in POLLY_VOICE_MAP, f"Missing Polly voice for: {lang.value}"


class TestLegalAnalysisModel:
    def test_default_disclaimer(self):
        from models import LegalAnalysis
        a = LegalAnalysis(
            document_id="test-id",
            plain_language_summary="This is a test document.",
            document_type_detected="Rental Agreement",
        )
        assert "not a substitute" in a.disclaimer.lower()

    def test_overall_risk_default(self):
        from models import LegalAnalysis, RiskLevel
        a = LegalAnalysis(
            document_id="test-id",
            plain_language_summary="Summary",
            document_type_detected="Test",
        )
        assert a.overall_risk_level == RiskLevel.LOW


# ─────────────────────────────────────────
# Errors Tests
# ─────────────────────────────────────────

class TestCustomErrors:
    def test_document_not_found(self):
        from errors import DocumentNotFoundError
        e = DocumentNotFoundError("abc-123")
        assert e.error_code == "DOCUMENT_NOT_FOUND"
        assert e.status_code == 404
        assert "abc-123" in e.message

    def test_file_too_large(self):
        from errors import FileTooLargeError
        e = FileTooLargeError(55.3)
        assert e.error_code == "FILE_TOO_LARGE"
        assert e.status_code == 413

    def test_invalid_file_type(self):
        from errors import InvalidFileTypeError
        e = InvalidFileTypeError("application/msword")
        assert e.error_code == "INVALID_FILE_TYPE"
        assert e.status_code == 400

    def test_rate_limit_error(self):
        from errors import RateLimitError
        e = RateLimitError("OpenAI")
        assert e.status_code == 429
        assert "OpenAI" in e.message


# ─────────────────────────────────────────
# Utilities Tests
# ─────────────────────────────────────────

class TestTextUtilities:
    def test_truncate_text_within_limit(self):
        from utils import truncate_text
        text = "Hello world " * 100
        result = truncate_text(text, max_chars=500)
        assert len(result) <= 500 + 100  # allow for truncation message

    def test_truncate_text_short_unchanged(self):
        from utils import truncate_text
        text = "Short document."
        result = truncate_text(text, max_chars=10_000)
        assert result == text

    def test_chunk_text_basic(self):
        from utils import chunk_text
        text = " ".join(["word"] * 2000)
        chunks = chunk_text(text, chunk_size=500)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk) <= 600  # allow some slack

    def test_chunk_text_short_is_single_chunk(self):
        from utils import chunk_text
        text = "This is a short text."
        chunks = chunk_text(text, chunk_size=1000)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_calculate_ttl_is_future(self):
        from utils import calculate_ttl
        import time
        ttl = calculate_ttl(hours=24)
        assert ttl > int(time.time())

    def test_decimal_encoder(self):
        from utils import DecimalEncoder
        from decimal import Decimal
        data = {"value": Decimal("18000.50")}
        result = json.loads(json.dumps(data, cls=DecimalEncoder))
        assert result["value"] == 18000.5

    def test_success_response_structure(self):
        from utils import success_response
        resp = success_response({"key": "value"}, status_code=200, message="Done")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["success"] is True
        assert body["data"] == {"key": "value"}
        assert body["message"] == "Done"

    def test_error_response_structure(self):
        from utils import error_response
        resp = error_response("Something failed", "TEST_ERROR", 400)
        assert resp["statusCode"] == 400
        body = json.loads(resp["body"])
        assert body["success"] is False
        assert body["error_code"] == "TEST_ERROR"


# ─────────────────────────────────────────
# Intelligence Extractor Tests
# ─────────────────────────────────────────

class TestIntelligenceExtractor:
    def test_risk_scan_detects_high_risk(self):
        from extractor import quick_risk_scan
        text = "You hereby waive all rights to any refund. Non-refundable deposit required."
        result = quick_risk_scan(text)
        assert result["preliminary_risk_level"] in ("high", "critical")
        assert result["high_risk_keyword_count"] > 0

    def test_risk_scan_low_risk_text(self):
        from extractor import quick_risk_scan
        text = "This is a simple service agreement for website maintenance."
        result = quick_risk_scan(text)
        assert result["preliminary_risk_level"] in ("low", "medium")

    def test_detect_rental_agreement(self):
        from extractor import detect_document_type
        text = "The tenant agrees to pay rent to the landlord. Security deposit of Rs. 50,000."
        doc_type = detect_document_type(text)
        assert "Rental" in doc_type or "Lease" in doc_type

    def test_detect_employment_contract(self):
        from extractor import detect_document_type
        text = "The employee shall report to the employer. Probation period of 3 months. Monthly salary."
        doc_type = detect_document_type(text)
        assert "Employment" in doc_type

    def test_financial_pattern_extraction(self):
        from extractor import quick_risk_scan
        text = "Pay Rs. 18,000 monthly. Late fee of ₹500 per day. Interest at 18% per annum."
        result = quick_risk_scan(text)
        assert len(result["financial_references"]) > 0

    def test_build_enriched_context(self):
        from extractor import build_enriched_prompt_context
        text = "Tenant agrees to pay landlord Rs. 15,000 rent monthly by 5th. Security deposit Rs. 45,000."
        ctx = build_enriched_prompt_context(text)
        assert "detected_type" in ctx
        assert "preliminary_risk" in ctx
        assert "word_count" in ctx
        assert ctx["word_count"] > 0


# ─────────────────────────────────────────
# API Response Parsing Tests
# ─────────────────────────────────────────

class TestApiResponseParsing:
    def test_parse_empty_body(self):
        from utils import parse_request_body
        result = parse_request_body({"body": None})
        assert result == {}

    def test_parse_json_string_body(self):
        from utils import parse_request_body
        result = parse_request_body({"body": '{"key": "value"}'})
        assert result == {"key": "value"}

    def test_parse_dict_body(self):
        from utils import parse_request_body
        result = parse_request_body({"body": {"key": "value"}})
        assert result == {"key": "value"}

    def test_parse_invalid_json_raises(self):
        from utils import parse_request_body
        with pytest.raises(ValueError):
            parse_request_body({"body": "not json {"})

    def test_get_path_param_present(self):
        from utils import get_path_param
        event = {"pathParameters": {"documentId": "abc-123"}}
        assert get_path_param(event, "documentId") == "abc-123"

    def test_get_path_param_missing_raises(self):
        from utils import get_path_param
        with pytest.raises(ValueError):
            get_path_param({"pathParameters": {}}, "documentId")

    def test_get_path_param_no_params_raises(self):
        from utils import get_path_param
        with pytest.raises(ValueError):
            get_path_param({}, "documentId")
