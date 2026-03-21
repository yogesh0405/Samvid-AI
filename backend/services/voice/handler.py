"""
Samvid AI - Voice Generation Lambda Handler
"""
import logging, os, sys
sys.path.insert(0, "/opt/python")
import boto3
from errors import DocumentNotFoundError, SamvidError
from utils import (
    error, generate_presigned_download_url, get_audio_bucket,
    get_path_param, get_record, now_iso, ok, parse_body, put_object_bytes, put_record, ttl_24h,
)

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

# Languages with native Polly support
POLLY_SUPPORTED = {
    "en": {"voice_id": "Joanna", "engine": "neural"},
    "hi": {"voice_id": "Aditi",  "engine": "standard"},
    "ta": {"voice_id": "Aditi",  "engine": "standard"},
    "te": {"voice_id": "Aditi",  "engine": "standard"},
    "mr": {"voice_id": "Aditi",  "engine": "standard"},
}

LANGUAGE_NAMES = {
    "hi": "Hindi", "ta": "Tamil", "te": "Telugu", "bn": "Bengali",
    "mr": "Marathi", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam",
    "pa": "Punjabi", "or": "Odia", "en": "English",
}


def lambda_handler(event, context):
    document_id = None
    try:
        document_id = get_path_param(event, "documentId")
        body = parse_body(event)

        lang_code = (body.get("language_code") or body.get("languageCode", "en")).lower().strip()
        lang_name = LANGUAGE_NAMES.get(lang_code, lang_code)

        # Determine which voice to use
        if lang_code in POLLY_SUPPORTED:
            polly_config = POLLY_SUPPORTED[lang_code]
            audio_lang = lang_code
            # Get translated content
            translation = get_record(document_id, f"TRANSLATION#{lang_code}")
            analysis = get_record(document_id, "ANALYSIS")
            if translation and translation.get("translatedContent"):
                tc = translation["translatedContent"]
                summary = tc.get("plain_language_summary", "")
                risk_summary = tc.get("risk_summary", "")
                doc_type = tc.get("document_type_detected", "document")
            else:
                summary = analysis.get("plainLanguageSummary", "") if analysis else ""
                risk_summary = analysis.get("riskSummary", "") if analysis else ""
                doc_type = analysis.get("documentTypeDetected", "document") if analysis else "document"
        else:
            # Fallback to English audio for unsupported languages
            polly_config = POLLY_SUPPORTED["en"]
            audio_lang = "en"
            analysis = get_record(document_id, "ANALYSIS")
            if not analysis:
                raise DocumentNotFoundError(document_id)
            summary = analysis.get("plainLanguageSummary", "")
            risk_summary = analysis.get("riskSummary", "")
            doc_type = analysis.get("documentTypeDetected", "document")
            logger.info(f"Language {lang_code} not supported by Polly, falling back to English audio")

        if not analysis and lang_code not in POLLY_SUPPORTED:
            raise DocumentNotFoundError(document_id)

        script = f"{doc_type}. {summary} {risk_summary}"
        script = script[:2900]

        polly = boto3.client("polly", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
        response = polly.synthesize_speech(
            Text=script,
            OutputFormat="mp3",
            VoiceId=polly_config["voice_id"],
            Engine=polly_config["engine"],
        )

        audio_bytes = response["AudioStream"].read()
        audio_key = f"audio/{document_id}/{lang_code}.mp3"
        bucket = get_audio_bucket()

        put_object_bytes(bucket, audio_key, audio_bytes, "audio/mpeg")
        audio_url = generate_presigned_download_url(bucket, audio_key, expires_in=3600)
        duration_estimate = int(len(script.split()) / 2.5)

        voice_record = {
            "documentId": document_id,
            "recordType": f"VOICE#{lang_code}",
            "languageCode": lang_code,
            "languageName": lang_name,
            "audioS3Key": audio_key,
            "audioUrl": audio_url,
            "audioFormat": "mp3",
            "voiceId": polly_config["voice_id"],
            "audioLanguage": audio_lang,
            "nativeVoiceAvailable": lang_code in POLLY_SUPPORTED,
            "durationEstimateSeconds": duration_estimate,
            "generatedAt": now_iso(),
            "ttl": ttl_24h(),
        }
        put_record(voice_record)

        return ok({
            "document_id": document_id,
            "audio_url": audio_url,
            "language_name": lang_name,
            "duration_estimate_seconds": duration_estimate,
            "voice_id": polly_config["voice_id"],
            "native_voice_available": lang_code in POLLY_SUPPORTED,
            "audio_note": None if lang_code in POLLY_SUPPORTED else f"Native {lang_name} voice not available. Audio is in English.",
        })

    except SamvidError as e:
        logger.warning(f"Voice error: {e.message}")
        return error(e.message, e.status_code, e.error_code)
    except Exception as e:
        logger.exception(f"Unexpected error in voice handler for documentId={document_id}")
        return error("Voice generation failed unexpectedly.", 500, "INTERNAL_ERROR")
