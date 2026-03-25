"""Samvid AI - Chat Service"""
import json, logging, os, sys, uuid
sys.path.insert(0, "/opt/python")
from openai import OpenAI
from errors import DocumentNotFoundError, SamvidError
from utils import error, get_openai_api_key, get_path_param, get_record, now_iso, ok, parse_body, put_record, ttl_24h

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

SYSTEM_PROMPT = """You are Samvid AI, a helpful legal document assistant for Indian citizens.
Answer ONLY from the document context provided. Do not invent facts.
If the answer is not in the document, say "This is not clearly mentioned in your document."
Keep answers simple and citizen-friendly. Return ONLY valid JSON.
Format: {"answer": "...", "confidence": "high|medium|low", "sources": [{"label": "...", "excerpt": "..."}], "suggestedQuestions": ["...", "...", "..."]}"""

def lambda_handler(event, context):
    document_id = None
    try:
        document_id = get_path_param(event, "documentId")
        body = parse_body(event)
        question = body.get("question", "").strip()
        session_id = body.get("sessionId") or str(uuid.uuid4())
        history = body.get("history", [])
        if not question:
            return error("Question is required.", 400, "MISSING_PARAMETER")
        ocr_record = get_record(document_id, "OCR")
        analysis_record = get_record(document_id, "ANALYSIS")
        if not ocr_record and not analysis_record:
            raise DocumentNotFoundError(document_id)
        ocr_text = ocr_record.get("extractedText", "") if ocr_record else ""
        summary = analysis_record.get("plainLanguageSummary", "") if analysis_record else ""
        risks = analysis_record.get("risks", []) if analysis_record else []
        deadlines = analysis_record.get("deadlines", []) if analysis_record else []
        obligations = analysis_record.get("obligations", []) if analysis_record else []
        context_text = f"DOCUMENT TEXT:\n{ocr_text[:4000]}\n\nSUMMARY:\n{summary}\n\nRISKS:\n{json.dumps(risks[:5])}\n\nDEADLINES:\n{json.dumps(deadlines[:5])}\n\nOBLIGATIONS:\n{json.dumps(obligations[:5])}"
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"DOCUMENT CONTEXT:\n{context_text}\n\nAnswer questions only from this context."},
            {"role": "assistant", "content": "Understood. I will answer only from the document. Please ask your question."},
        ]
        for h in history[-6:]:
            if h.get("role") in ("user", "assistant"):
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": question})
        api_key = get_openai_api_key()
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        response = client.chat.completions.create(model="llama-3.3-70b-versatile", messages=messages, temperature=0.1, max_tokens=1000)
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        raw = raw.strip()
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"answer": raw, "confidence": "medium", "sources": [], "suggestedQuestions": []}
        put_record({"documentId": document_id, "recordType": f"CHAT#{session_id}", "sessionId": session_id, "question": question, "answer": parsed.get("answer", ""), "askedAt": now_iso(), "ttl": ttl_24h()})
        logger.info(f"Chat answered for documentId={document_id}")
        return ok({"sessionId": session_id, "answer": parsed.get("answer", ""), "confidence": parsed.get("confidence", "medium"), "sources": parsed.get("sources", []), "suggestedQuestions": parsed.get("suggestedQuestions", []), "timestamp": now_iso()})
    except SamvidError as e:
        return error(e.message, e.status_code, e.error_code)
    except Exception as e:
        logger.exception(f"Chat error for documentId={document_id}")
        return error(str(e), 500, "INTERNAL_ERROR")
