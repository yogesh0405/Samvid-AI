#!/usr/bin/env python3
"""
Samvid AI - Local Integration Test Script
Tests the full pipeline end-to-end against a locally running SAM API.
Run: python tests/test_pipeline.py

Requires:
  - SAM local running: make local
  - A real PDF test file at tests/sample_docs/rental.pdf
  - AWS credentials configured (Textract, Translate, Polly are real calls)
"""
import json
import os
import sys
import time
import requests

BASE_URL = os.environ.get("SAMVID_API_URL", "http://localhost:3001/api/v1")
SAMPLE_DOC = os.path.join(os.path.dirname(__file__), "sample_docs", "rental.pdf")

# ANSI colors for output
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


def log(msg: str, color: str = ""):
    print(f"{color}{msg}{RESET}")


def assert_ok(response: requests.Response, step: str) -> dict:
    if response.status_code not in (200, 201):
        log(f"  ✗ FAILED [{step}]: HTTP {response.status_code}", RED)
        log(f"    {response.text[:400]}", RED)
        sys.exit(1)
    data = response.json()
    if not data.get("success"):
        log(f"  ✗ FAILED [{step}]: {data.get('error', 'Unknown error')}", RED)
        sys.exit(1)
    log(f"  ✓ {step}", GREEN)
    return data


def run_tests():
    log("\n" + "═" * 60, CYAN)
    log("  SAMVID AI — Integration Test Suite", BOLD)
    log("═" * 60, CYAN)
    log(f"  API: {BASE_URL}")
    log(f"  Doc: {SAMPLE_DOC}")
    log("─" * 60, CYAN)

    # ─── Step 1: Create upload session ───────────────────────────

    log("\n[1/7] Creating upload session...", YELLOW)
    sample_exists = os.path.exists(SAMPLE_DOC)
    file_size = os.path.getsize(SAMPLE_DOC) if sample_exists else 50_000

    resp = requests.post(f"{BASE_URL}/documents/upload", json={
        "file_name": "rental_agreement.pdf",
        "file_size": file_size,
        "mime_type": "application/pdf",
        "document_type": "Rental Agreement",
    })
    data = assert_ok(resp, "Upload session created")
    document_id = data["data"]["document_id"]
    upload_url  = data["data"]["upload_url"]
    log(f"    document_id: {document_id}", CYAN)

    # ─── Step 2: Upload file to S3 ────────────────────────────────

    log("\n[2/7] Uploading file to S3 presigned URL...", YELLOW)
    if sample_exists:
        with open(SAMPLE_DOC, "rb") as f:
            put_resp = requests.put(upload_url, data=f, headers={"Content-Type": "application/pdf"})
        if put_resp.status_code in (200, 204):
            log("  ✓ File uploaded to S3", GREEN)
        else:
            log(f"  ✗ S3 upload failed: HTTP {put_resp.status_code}", RED)
            sys.exit(1)
    else:
        log(f"  ⚠ Sample doc not found at {SAMPLE_DOC}. Skipping actual upload.", YELLOW)
        log("    Create tests/sample_docs/rental.pdf to test full pipeline.", YELLOW)

    # ─── Step 3: OCR ─────────────────────────────────────────────

    log("\n[3/7] Running OCR (AWS Textract)...", YELLOW)
    log("    This may take 15–60 seconds for PDFs...", CYAN)
    if sample_exists:
        resp = requests.post(f"{BASE_URL}/documents/{document_id}/ocr", timeout=120)
        data = assert_ok(resp, "OCR complete")
        log(f"    words: {data['data'].get('word_count', '?')}, pages: {data['data'].get('page_count', '?')}", CYAN)
    else:
        log("  ⚠ Skipping OCR (no sample doc)", YELLOW)

    # ─── Step 4: AI Analysis ──────────────────────────────────────

    log("\n[4/7] Running AI analysis (GPT-4o)...", YELLOW)
    log("    This may take 20–60 seconds...", CYAN)
    if sample_exists:
        resp = requests.post(f"{BASE_URL}/documents/{document_id}/analyze", timeout=180)
        data = assert_ok(resp, "AI analysis complete")
        log(f"    risk: {data['data'].get('overall_risk_level', '?')}, "
            f"type: {data['data'].get('document_type_detected', '?')}", CYAN)
    else:
        log("  ⚠ Skipping analysis (no sample doc)", YELLOW)

    # ─── Step 5: Get Results ──────────────────────────────────────

    log("\n[5/7] Fetching results...", YELLOW)
    resp = requests.get(f"{BASE_URL}/documents/{document_id}/results")
    data = assert_ok(resp, "Results fetched")
    status = data["data"].get("status", "?")
    log(f"    status: {status}", CYAN)
    if data["data"].get("analysis"):
        summary = data["data"]["analysis"].get("plain_language_summary", "")
        log(f"    summary preview: {summary[:120]}...", CYAN)

    # ─── Step 6: Translation ──────────────────────────────────────

    log("\n[6/7] Testing translation to Hindi...", YELLOW)
    resp = requests.post(
        f"{BASE_URL}/documents/{document_id}/translate",
        json={"target_language": "hi"},
        timeout=60,
    )
    data = assert_ok(resp, "Translation to Hindi complete")
    translated = data["data"].get("translated_content", {})
    summary_hi = translated.get("plain_language_summary", "")
    log(f"    Hindi preview: {summary_hi[:80]}...", CYAN)

    # ─── Step 7: Voice ────────────────────────────────────────────

    log("\n[7/7] Generating voice explanation (AWS Polly)...", YELLOW)
    resp = requests.post(
        f"{BASE_URL}/documents/{document_id}/voice",
        json={"language_code": "hi"},
        timeout=60,
    )
    data = assert_ok(resp, "Voice generation complete (Hindi)")
    audio_url = data["data"].get("audio_url", "")
    duration  = data["data"].get("duration_estimate_seconds", 0)
    log(f"    duration: ~{duration}s | url: {audio_url[:80]}...", CYAN)

    # ─── Summary ──────────────────────────────────────────────────

    log("\n" + "═" * 60, GREEN)
    log("  ALL TESTS PASSED ✓", BOLD)
    log("═" * 60, GREEN)
    log(f"\n  document_id: {document_id}")
    log(f"  Run cleanup: DELETE {BASE_URL}/documents/{document_id}\n")


if __name__ == "__main__":
    run_tests()
