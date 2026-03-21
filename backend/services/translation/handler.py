"""
Samvid AI - Translation Service using Groq (free)
"""
import json, logging, os, sys
sys.path.insert(0, "/opt/python")
from openai import OpenAI
from errors import DocumentNotFoundError, SamvidError
from utils import error, get_openai_api_key, get_path_param, get_record, now_iso, ok, parse_body, put_record, ttl_24h

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

LANGUAGE_NAMES = {
    "hi": "Hindi", "ta": "Tamil", "te": "Telugu", "bn": "Bengali",
    "mr": "Marathi", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam",
    "pa": "Punjabi", "or": "Odia", "en": "English",
}


def translate_with_groq(text, lang_name, api_key):
    if not text or not text.strip():
        return ""
    client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": f"Translate the following text to {lang_name}. Output only the translated text, nothing else."},
            {"role": "user", "content": text[:2000]},
        ],
        temperature=0.1,
        max_tokens=1000,
    )
    return response.choices[0].message.content.strip()


def lambda_handler(event, context):
    document_id = None
    try:
        document_id = get_path_param(event, "documentId")
        body = parse_body(event)
        lang_code = (body.get("target_language") or body.get("targetLanguage", "hi")).lower().strip()

        if lang_code not in LANGUAGE_NAMES:
            return error(f"Unsupported language: {lang_code}", 400, "UNSUPPORTED_LANGUAGE")

        analysis = get_record(document_id, "ANALYSIS")
        if not analysis:
            raise DocumentNotFoundError(document_id)

        lang_name = LANGUAGE_NAMES[lang_code]
        api_key = get_openai_api_key()
        logger.info(f"Translating documentId={document_id} to {lang_name} via Groq")

        translated = {
            "plain_language_summary": translate_with_groq(analysis.get("plainLanguageSummary", ""), lang_name, api_key),
            "risk_summary": translate_with_groq(analysis.get("riskSummary", ""), lang_name, api_key),
            "document_type_detected": translate_with_groq(analysis.get("documentTypeDetected", ""), lang_name, api_key),
        }

        key_points = []
        for kp in analysis.get("keyPoints", []):
            key_points.append({
                "heading": translate_with_groq(kp.get("heading", ""), lang_name, api_key),
                "detail": translate_with_groq(kp.get("detail", ""), lang_name, api_key),
                "important": kp.get("important", False),
            })
        translated["key_points"] = key_points

        actions = []
        for a in analysis.get("actionsToTake", []):
            actions.append({
                "action": translate_with_groq(a.get("action", ""), lang_name, api_key),
                "priority": a.get("priority", ""),
                "deadline": a.get("deadline"),
                "note": translate_with_groq(a.get("note", ""), lang_name, api_key) if a.get("note") else None,
            })
        translated["actions_to_take"] = actions

        translation_record = {
            "documentId": document_id,
            "recordType": f"TRANSLATION#{lang_code}",
            "targetLanguage": lang_code,
            "targetLanguageName": lang_name,
            "translatedContent": translated,
            "translatedAt": now_iso(),
            "translationEngine": "GROQ_LLAMA",
            "ttl": ttl_24h(),
        }
        put_record(translation_record)

        logger.info(f"Translation complete for documentId={document_id} -> {lang_name}")
        return ok({
            "document_id": document_id,
            "target_language": lang_code,
            "target_language_name": lang_name,
            "translated_content": translated,
        })

    except SamvidError as e:
        logger.warning(f"Translation error: {e.message}")
        return error(e.message, e.status_code, e.error_code)
    except Exception as e:
        logger.exception(f"Unexpected error in translation handler for documentId={document_id}")
        return error("Translation failed unexpectedly.", 500, "INTERNAL_ERROR")
