"""
Samvid AI - Deletion Service Lambda Handler
Manually deletes all data for a document: DynamoDB records and S3 objects.
Documents also auto-delete via S3 lifecycle policies and DynamoDB TTL.
"""
import logging, os, sys
sys.path.insert(0, "/opt/python")

from errors import DocumentNotFoundError, SamvidError
from utils import (
    delete_document_records, delete_s3_object, error,
    get_audio_bucket, get_documents_bucket, get_path_param,
    get_record, ok, query_document_records,
)

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))


def lambda_handler(event: dict, context) -> dict:
    document_id = get_path_param(event, "documentId")
    if not document_id:
        return error("documentId path parameter is required", 400, "MISSING_PARAMETER")

    try:
        metadata = get_record(document_id, "METADATA")
        if not metadata:
            raise DocumentNotFoundError(document_id)

        # Delete the uploaded document from S3
        s3_key = metadata.get("s3Key")
        if s3_key:
            delete_s3_object(get_documents_bucket(), s3_key)

        # Delete any generated audio files
        records = query_document_records(document_id)
        audio_bucket = get_audio_bucket()
        for record in records:
            if record.get("recordType", "").startswith("VOICE#"):
                audio_key = record.get("audioS3Key")
                if audio_key:
                    delete_s3_object(audio_bucket, audio_key)

        # Delete all DynamoDB records
        delete_document_records(document_id)

        logger.info(f"Document deleted: documentId={document_id}")
        return ok({"message": f"Document {document_id} and all associated data have been permanently deleted."})

    except SamvidError as e:
        return error(e.message, e.status_code, e.error_code)
    except Exception as e:
        logger.exception(f"Unexpected error deleting documentId={document_id}")
        return error("Deletion failed unexpectedly.", 500)
