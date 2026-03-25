"""
Samvid AI - Report Generation Lambda Handler
"""
import logging, os, sys, hashlib
sys.path.insert(0, "/opt/python")
from errors import DocumentNotFoundError, SamvidError
from utils import (
    error, generate_presigned_download_url, get_documents_bucket,
    get_path_param, get_record, now_iso, ok,
    put_object_bytes, put_record, query_document_records, ttl_24h,
)
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

RISK_COLORS = {"low": "#22c55e", "medium": "#f59e0b", "high": "#ef4444", "critical": "#7c3aed"}

def safe_color(level):
    return RISK_COLORS.get(level, "#6b7280")

def build_html(document_id, metadata, analysis, checklist, dictionary):
    file_name = (metadata or {}).get('originalFilename', 'Document')
    upload_date = ((metadata or {}).get('uploadedAt', now_iso()))[:10]
    doc_type = (analysis or {}).get('documentTypeDetected', 'Legal Document')
    summary = (analysis or {}).get('plainLanguageSummary', '')
    risk_level = (analysis or {}).get('overallRiskLevel', 'unknown')
    risk_summary = (analysis or {}).get('riskSummary', '')
    risk_color = safe_color(risk_level)

    sections = ''

    # Key points
    kp_html = ''
    for kp in (analysis or {}).get('keyPoints', []):
        kp_html += '<div style="padding:12px;border-left:3px solid #3b82f6;margin-bottom:8px;background:#f8fafc">'
        kp_html += '<strong>' + kp.get('heading', '') + '</strong>'
        kp_html += '<p style="margin:4px 0 0;color:#475569;font-size:14px">' + kp.get('detail', '') + '</p></div>'
    if kp_html:
        sections += '<div class="section"><h2>Key Points</h2>' + kp_html + '</div>'

    # Risks
    risks_html = ''
    for r in (analysis or {}).get('risks', []):
        rl = r.get('risk_level', 'medium')
        rc = safe_color(rl)
        risks_html += '<div style="padding:12px;border-left:3px solid ' + rc + ';margin-bottom:8px;background:#fef2f2">'
        risks_html += '<span style="background:' + rc + ';color:white;padding:2px 8px;border-radius:4px;font-size:11px">' + rl.upper() + '</span>'
        risks_html += '<p style="margin:8px 0 4px"><strong>' + r.get('clauseText', '') + '</strong></p>'
        risks_html += '<p style="margin:0;color:#475569;font-size:13px">' + r.get('plainLanguageExplanation', '') + '</p>'
        risks_html += '<p style="margin:4px 0 0;color:#0369a1;font-size:13px">' + r.get('recommendation', '') + '</p></div>'
    if risks_html:
        sections += '<div class="section"><h2>Identified Risks</h2>' + risks_html + '</div>'

    # Deadlines
    dl_html = ''
    for d in (analysis or {}).get('deadlines', []):
        dl_html += '<div style="padding:12px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;margin-bottom:8px">'
        dl_html += '<strong style="color:#92400e">' + d.get('description', '') + '</strong>'
        dl_html += '<span style="float:right;color:#b45309;font-weight:600">' + d.get('date_or_period', '') + '</span>'
        if d.get('consequence'):
            dl_html += '<p style="margin:4px 0 0;font-size:13px;clear:both">' + d.get('consequence', '') + '</p>'
        dl_html += '</div>'
    if dl_html:
        sections += '<div class="section"><h2>Important Deadlines</h2>' + dl_html + '</div>'

    # Obligations
    ob_html = ''
    for o in (analysis or {}).get('obligations', []):
        ob_html += '<tr>'
        ob_html += '<td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">' + o.get('party', '') + '</td>'
        ob_html += '<td style="padding:8px;border-bottom:1px solid #e2e8f0">' + o.get('obligation', '') + '</td>'
        ob_html += '<td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">' + (o.get('frequency') or '-') + '</td>'
        ob_html += '<td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">' + (o.get('amount') or '-') + '</td>'
        ob_html += '</tr>'
    if ob_html:
        sections += '<div class="section"><h2>Obligations</h2><table><tr><th>Party</th><th>Obligation</th><th>Frequency</th><th>Amount</th></tr>' + ob_html + '</table></div>'

    # Actions
    ac_html = ''
    for a in (analysis or {}).get('actionsToTake', []):
        p = a.get('priority', 'medium')
        rc = safe_color(p)
        ac_html += '<div style="padding:10px;border-left:3px solid ' + rc + ';margin-bottom:8px;background:#f8fafc">'
        ac_html += '<span style="background:' + rc + ';color:white;padding:2px 8px;border-radius:4px;font-size:11px">' + p.upper() + '</span>'
        ac_html += '<p style="margin:6px 0 0">' + a.get('action', '') + '</p>'
        if a.get('deadline'):
            ac_html += '<p style="margin:4px 0 0;color:#64748b;font-size:13px">' + a.get('deadline', '') + '</p>'
        ac_html += '</div>'
    if ac_html:
        sections += '<div class="section"><h2>Recommended Actions</h2>' + ac_html + '</div>'

    # Checklist
    if checklist:
        cl_html = ''
        for item in checklist.get('items', []):
            status = '&#9989;' if item.get('completed') else '&#9744;'
            p = item.get('priority', 'medium')
            rc = safe_color(p)
            cl_html += '<div style="padding:10px;margin-bottom:6px;border:1px solid #e2e8f0;border-radius:6px">'
            cl_html += status + ' <span style="background:' + rc + ';color:white;padding:2px 6px;border-radius:4px;font-size:11px">' + p.upper() + '</span>'
            cl_html += ' <span style="color:#64748b;font-size:11px">' + item.get('category', '') + '</span>'
            cl_html += '<p style="margin:6px 0 0;font-weight:600">' + item.get('title', '') + '</p>'
            cl_html += '<p style="margin:4px 0 0;color:#475569;font-size:13px">' + item.get('description', '') + '</p></div>'
        if cl_html:
            sections += '<div class="section"><h2>Action Checklist</h2>' + cl_html + '</div>'

    # Dictionary
    if dictionary:
        di_html = ''
        for term in dictionary.get('terms', []):
            di_html += '<div style="padding:12px;margin-bottom:8px;border:1px solid #e2e8f0;border-radius:6px">'
            di_html += '<strong style="font-size:15px">' + term.get('term', '') + '</strong>'
            di_html += '<p style="margin:6px 0 0;color:#475569;font-size:13px">' + term.get('simpleMeaning', '') + '</p>'
            if term.get('contextualMeaning'):
                di_html += '<p style="margin:4px 0 0;color:#0369a1;font-size:13px;font-style:italic">In this document: ' + term.get('contextualMeaning', '') + '</p>'
            di_html += '</div>'
        if di_html:
            sections += '<div class="section"><h2>Legal Terms Explained</h2>' + di_html + '</div>'

    html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Samvid AI Report</title>'
    html += '<style>body{font-family:Segoe UI,Arial,sans-serif;margin:0;padding:0;color:#1e293b}'
    html += '.header{background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:32px 40px}'
    html += '.header h1{margin:0;font-size:28px}.badge{display:inline-block;padding:6px 16px;border-radius:20px;font-weight:700;font-size:13px;color:white;background:' + risk_color + '}'
    html += '.section{padding:24px 40px;border-bottom:1px solid #f1f5f9}'
    html += '.section h2{color:#1e3a5f;font-size:18px;margin:0 0 16px;border-left:4px solid #2563eb;padding-left:12px}'
    html += 'table{width:100%;border-collapse:collapse;font-size:14px}th{background:#f8fafc;padding:10px 8px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase}'
    html += '.footer{padding:24px 40px;background:#f8fafc;color:#94a3b8;font-size:12px}</style></head><body>'
    html += '<div class="header"><div style="font-size:12px;opacity:0.7;margin-bottom:8px">SAMVID AI - LEGAL DOCUMENT ANALYSIS REPORT</div>'
    html += '<h1>' + file_name + '</h1>'
    html += '<p>' + doc_type + ' | Uploaded: ' + upload_date + ' | Generated: ' + now_iso()[:10] + '</p>'
    html += '<div style="margin-top:16px">Overall Risk: <span class="badge">' + risk_level.upper() + '</span></div></div>'
    html += '<div class="section"><h2>Plain Language Summary</h2>'
    html += '<p style="line-height:1.7;color:#374151">' + summary + '</p>'
    html += '<p style="color:#6b7280;font-size:14px;background:#f0fdf4;padding:12px;border-radius:6px;margin-top:12px">' + risk_summary + '</p></div>'
    html += sections
    html += '<div class="footer"><strong>Disclaimer:</strong> This report is AI-generated for informational purposes only. Not a substitute for legal advice. Report ID: ' + document_id + '</div>'
    html += '</body></html>'
    return html


def lambda_handler(event, context):
    document_id = None
    try:
        http_method = event.get('httpMethod', 'POST')
        path = event.get('path', '')

        # Handle shared report viewing (GET /reports/shared/{shareToken})
        if 'shared' in path and http_method == 'GET':
            share_token = get_path_param(event, 'shareToken')
            share = get_record(share_token, 'SHARE#' + share_token)

            if not share:
                return error('Share link not found.', 404, 'NOT_FOUND')

            # Check if share link has expired
            if share.get('expiresAt') < now_iso():
                return error('Share link has expired. Please request a new one.', 410, 'EXPIRED')

            document_id = share.get('documentId')
            report = get_record(document_id, 'REPORT')

            if not report:
                return error('Report not found.', 404, 'NOT_FOUND')

            # Generate fresh presigned URL (valid for 24 hours)
            bucket = get_documents_bucket()
            fresh_report_url = generate_presigned_download_url(
                bucket,
                report.get('reportKey'),
                expires_in=86400
            )

            logger.info('Shared report accessed: shareToken=' + share_token + ', documentId=' + document_id)
            return ok({
                'reportUrl': fresh_report_url,
                'documentId': document_id,
                'expiresAt': share.get('expiresAt')
            })

        document_id = get_path_param(event, 'documentId')

        if http_method == 'GET':
            report = get_record(document_id, 'REPORT')
            if not report:
                return error('Report not generated yet.', 404, 'NOT_FOUND')
            return ok(report)

        if 'share' in path:
            report = get_record(document_id, 'REPORT')
            if not report:
                return error('Generate report first.', 400, 'REPORT_NOT_FOUND')
            share_token = hashlib.sha256((document_id + now_iso()).encode()).hexdigest()[:32]
            expiry = (datetime.utcnow() + timedelta(days=7)).isoformat()
            put_record({
                'documentId': document_id,
                'recordType': 'SHARE#' + share_token,
                'shareToken': share_token,
                'expiresAt': expiry,
                'createdAt': now_iso(),
                'ttl': int((datetime.utcnow() + timedelta(days=7)).timestamp()),
            })
            base_url = os.environ.get('FRONTEND_URL', 'http://localhost:3001')
            return ok({'shareToken': share_token, 'shareUrl': base_url + '/shared/' + share_token, 'expiresAt': expiry})

        records = query_document_records(document_id)
        if not records:
            raise DocumentNotFoundError(document_id)

        metadata = analysis = checklist = dictionary = None
        for r in records:
            rt = r.get('recordType', '')
            if rt == 'METADATA': metadata = r
            elif rt == 'ANALYSIS': analysis = r
            elif rt == 'CHECKLIST': checklist = r
            elif rt == 'DICTIONARY': dictionary = r

        if not analysis:
            return error('Document must be analyzed first.', 400, 'ANALYSIS_REQUIRED')

        html_content = build_html(document_id, metadata, analysis, checklist, dictionary)
        report_key = 'reports/' + document_id + '/report.html'
        bucket = get_documents_bucket()
        put_object_bytes(bucket, report_key, html_content.encode('utf-8'), 'text/html')
        report_url = generate_presigned_download_url(bucket, report_key, expires_in=86400)

        report_record = {
            'documentId': document_id,
            'recordType': 'REPORT',
            'reportKey': report_key,
            'reportUrl': report_url,
            'generatedAt': now_iso(),
            'ttl': ttl_24h(),
        }
        put_record(report_record)
        logger.info('Report generated for documentId=' + document_id)
        return ok({'documentId': document_id, 'reportUrl': report_url, 'generatedAt': report_record['generatedAt']})

    except SamvidError as e:
        logger.warning('Report error: ' + e.message)
        return error(e.message, e.status_code, e.error_code)
    except Exception as e:
        logger.exception('Unexpected error in report handler')
        return error('Report generation failed.', 500, 'INTERNAL_ERROR')
