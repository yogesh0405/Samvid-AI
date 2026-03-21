"""
Samvid AI - Upload Service Lambda Handler
"""
import json, logging, os, sys, uuid
sys.path.insert(0, "/opt/python")

from errors import FileTooLargeError, SamvidError, UnsupportedFileTypeError, ValidationError
from models import ProcessingStatus, UploadRequest
from utils import (
    error, generate_document_id, generate_presigned_upload_url,
    get_documents_bucket, now_iso, ok, parse_body, put_record, ttl_24h,
)

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}


def lambda_handler(event: dict, context) -> dict:
    try:
        body = parse_body(event)

        # Validate required fields
        file_name = body.get("file_name") or body.get("fileName") or body.get("filename", "")
        file_size = body.get("file_size") or body.get("fileSizeBytes") or body.get("fileSize", 0)
        mime_type = body.get("mime_type") or body.get("mimeType", "")

        if not file_name:
            raise ValidationError("file_name is required.")
        if not mime_type:
            raise ValidationError("mime_type is required.")
        if mime_type not in ALLOWED_MIME_TYPES:
            raise UnsupportedFileTypeError(mime_type)
        if int(file_size) > MAX_FILE_SIZE_BYTES:
            raise FileTooLargeError(int(file_size) / (1024 * 1024))

        document_id = generate_document_id()
        s3_key = f"documents/{document_id}/{file_name}"
        bucket = get_documents_bucket()

        upload_url = generate_presigned_upload_url(
            bucket=bucket, s3_key=s3_key, mime_type=mime_type, expires_in=900,
        )

        metadata = {
            "documentId": document_id,
            "recordType": "METADATA",
            "originalFilename": file_name,
            "mimeType": mime_type,
            "fileSizeBytes": int(file_size),
            "s3Key": s3_key,
            "status": ProcessingStatus.UPLOADED,
            "uploadedAt": now_iso(),
            "ttl": ttl_24h(),
        }
        put_record(metadata)

        response = {
            "document_id": document_id,
            "upload_url": upload_url,
            "s3_key": s3_key,
            "expires_in": 900,
        }
        logger.info(f"Upload prepared: documentId={document_id}, file={file_name}")
        return ok(response, status_code=201)

    except SamvidError as e:
        logger.warning(f"Upload error: {e.message}")
        return error(e.message, e.status_code, e.error_code)
    except Exception as e:
        logger.exception("Unexpected error in upload handler")
        return error(str(e), 500, "INTERNAL_ERROR")
