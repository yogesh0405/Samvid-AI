"""Samvid AI - Checklist Service"""
import json, logging, os, sys, uuid
sys.path.insert(0, "/opt/python")
from openai import OpenAI
from errors import DocumentNotFoundError, SamvidError
from utils import error, get_openai_api_key, get_path_param, get_record, now_iso, ok, parse_body, put_record, ttl_24h

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

def lambda_handler(event, context):
    document_id = None
    try:
        document_id = get_path_param(event, "documentId")
        http_method = event.get("httpMethod", "POST")
        path = event.get("path", "")

        if http_method == "GET":
            checklist = get_record(document_id, "CHECKLIST")
            if not checklist:
                return error("Checklist not generated yet.", 404, "NOT_FOUND")
            return ok(checklist)

        if http_method == "PATCH":
            item_id = (event.get("pathParameters") or {}).get("itemId", "")
            body = parse_body(event)
            completed = body.get("completed", False)
            checklist = get_record(document_id, "CHECKLIST")
            if not checklist:
                raise DocumentNotFoundError(document_id)
            items = checklist.get("items", [])
            for item in items:
                if item.get("itemId") == item_id:
                    item["completed"] = completed
                    break
            checklist["items"] = items
            checklist["updatedAt"] = now_iso()
            put_record(checklist)
            return ok({"itemId": item_id, "completed": completed})

        analysis = get_record(document_id, "ANALYSIS")
        if not analysis:
            raise DocumentNotFoundError(document_id)

        risks_text = "\n".join([f"- {r.get('clauseText','')}: {r.get('plainLanguageExplanation','')}" for r in analysis.get("risks", [])])
        deadlines_text = "\n".join([f"- {d.get('description','')}: {d.get('date_or_period','')}" for d in analysis.get("deadlines", [])])
        obligations_text = "\n".join([f"- {o.get('party','')}: {o.get('obligation','')}" for o in analysis.get("obligations", [])])

        prompt = f"""Generate a practical action checklist for an Indian citizen based on this document analysis.
Doc type: {analysis.get('documentTypeDetected','')}
Summary: {analysis.get('plainLanguageSummary','')[:800]}
Risks: {risks_text[:400] or 'None'}
Deadlines: {deadlines_text[:400] or 'None'}
Obligations: {obligations_text[:400] or 'None'}

Return ONLY valid JSON with this structure:
{{"items": [{{"itemId": "unique-id", "title": "short title", "description": "why this matters", "priority": "high|medium|low", "category": "Immediate|Before Signing|Future Reminders|Questions to Ask", "dueDate": null, "completed": false}}]}}
Generate 8-12 realistic actionable items."""

        api_key = get_openai_api_key()
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        response = client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "system", "content": "You generate action checklists. Output ONLY valid JSON."}, {"role": "user", "content": prompt}], temperature=0.2, max_tokens=2000)
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        parsed = json.loads(raw.strip())
        items = parsed.get("items", [])
        for item in items:
            if not item.get("itemId"):
                item["itemId"] = str(uuid.uuid4())[:8]

        checklist_record = {"documentId": document_id, "recordType": "CHECKLIST", "items": items, "generatedAt": now_iso(), "ttl": ttl_24h()}
        put_record(checklist_record)
        logger.info(f"Checklist generated for documentId={document_id}")
        return ok({"documentId": document_id, "items": items, "generatedAt": checklist_record["generatedAt"]})

    except SamvidError as e:
        return error(e.message, e.status_code, e.error_code)
    except Exception as e:
        logger.exception(f"Checklist error for documentId={document_id}")
        return error(str(e), 500, "INTERNAL_ERROR")
