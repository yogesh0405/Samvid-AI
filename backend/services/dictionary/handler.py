"""Samvid AI - Legal Dictionary Service"""
import json, logging, os, sys
sys.path.insert(0, "/opt/python")
from openai import OpenAI
from errors import DocumentNotFoundError, SamvidError
from utils import error, get_openai_api_key, get_path_param, get_record, now_iso, ok, put_record, ttl_24h

logger = logging.getLogger(__name__)

BASE_GLOSSARY = {"indemnity": "A promise to cover someone else's loss.", "arbitration": "Settling disputes outside court with a neutral third party.", "jurisdiction": "Which court has legal authority over a dispute.", "breach": "Breaking or failing to follow agreement terms.", "liability": "Legal responsibility, especially for paying compensation.", "force majeure": "Unexpected events beyond anyone's control that excuse obligations.", "termination": "Ending the agreement before or at the agreed end date.", "notice period": "Minimum time required to inform the other party before leaving.", "penalty": "Financial punishment for breaking agreement terms.", "non-bailable": "A serious offence where bail cannot be granted automatically.", "warrant": "A legal document issued by court authorizing arrest or search.", "bail": "Temporary release from custody after paying money as guarantee.", "clause": "A specific section or condition within a legal agreement.", "escalation": "A planned increase in rent or payment over time.", "security deposit": "Money paid upfront and returned at end if no damage occurs."}

def lambda_handler(event, context):
    document_id = None
    try:
        document_id = get_path_param(event, "documentId")
        existing = get_record(document_id, "DICTIONARY")
        if existing:
            return ok(existing)
        ocr_record = get_record(document_id, "OCR")
        analysis_record = get_record(document_id, "ANALYSIS")
        if not ocr_record and not analysis_record:
            raise DocumentNotFoundError(document_id)
        ocr_text = (ocr_record.get("extractedText", "") if ocr_record else "").lower()
        summary = (analysis_record.get("plainLanguageSummary", "") if analysis_record else "").lower()
        combined = ocr_text + " " + summary
        found_terms = [k for k in BASE_GLOSSARY if k in combined] or list(BASE_GLOSSARY.keys())[:8]
        context_text = (ocr_record.get("extractedText", "") if ocr_record else "") + " " + (analysis_record.get("plainLanguageSummary", "") if analysis_record else "")
        terms_list = [t.title() for t in found_terms]
        base_defs = {t: BASE_GLOSSARY[t] for t in found_terms}
        prompt = f"""Explain these legal terms found in a document for an Indian citizen in simple language.
Document context: {context_text[:2000]}
Terms: {', '.join(terms_list)}
Base definitions: {json.dumps(base_defs)}
Return ONLY valid JSON: {{"terms": [{{"term": "Term", "simpleMeaning": "one sentence", "contextualMeaning": "in this document", "example": "example"}}]}}"""
        api_key = get_openai_api_key()
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        response = client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "system", "content": "Legal dictionary for Indian citizens. Output ONLY valid JSON."}, {"role": "user", "content": prompt}], temperature=0.1, max_tokens=2000)
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        parsed = json.loads(raw.strip())
        terms = parsed.get("terms", [])
        dict_record = {"documentId": document_id, "recordType": "DICTIONARY", "terms": terms, "generatedAt": now_iso(), "ttl": ttl_24h()}
        put_record(dict_record)
        return ok({"documentId": document_id, "terms": terms, "generatedAt": dict_record["generatedAt"]})
    except SamvidError as e:
        return error(e.message, e.status_code, e.error_code)
    except Exception as e:
        logger.exception(f"Dictionary error for documentId={document_id}")
        return error(str(e), 500, "INTERNAL_ERROR")
