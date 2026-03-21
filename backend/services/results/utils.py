"""
Samvid AI - Shared Utilities
Reusable helpers for DynamoDB, S3, Secrets Manager, and response formatting.
"""
from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

# ─────────────────────────────────────────
# AWS Clients (initialized lazily)
# ─────────────────────────────────────────
_dynamodb_resource = None
_s3_client = None
_secrets_client = None

DOCUMENTS_TABLE = os.environ.get("DOCUMENTS_TABLE", "samvid-ai-documents-dev")
DOCUMENTS_BUCKET = os.environ.get("DOCUMENTS_BUCKET", "")
AUDIO_BUCKET = os.environ.get("AUDIO_BUCKET", "")
TTL_HOURS = 24


def get_dynamodb():
    global _dynamodb_resource
    if _dynamodb_resource is None:
        _dynamodb_resource = boto3.resource("dynamodb")
    return _dynamodb_resource


def get_s3():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client("s3")
    return _s3_client


def get_secrets_client():
    global _secrets_client
    if _secrets_client is None:
        _secrets_client = boto3.client("secretsmanager")
    return _secrets_client


def get_table():
    return get_dynamodb().Table(DOCUMENTS_TABLE)


# ─────────────────────────────────────────
# DynamoDB Helpers
# ─────────────────────────────────────────

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def calculate_ttl(hours: int = TTL_HOURS) -> int:
    """Calculate Unix timestamp for DynamoDB TTL."""
    return int((datetime.utcnow() + timedelta(hours=hours)).timestamp())


def put_record(item: Dict[str, Any]) -> bool:
    """Write a record to DynamoDB."""
    try:
        table = get_table()
        # Ensure TTL is set
        if "ttl" not in item or item.get("ttl") is None:
            item["ttl"] = calculate_ttl()
        table.put_item(Item=item)
        return True
    except ClientError as e:
        logger.error(f"DynamoDB put_item error: {e.response['Error']['Message']}")
        raise


def get_record(document_id: str, record_type: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single record from DynamoDB."""
    try:
        table = get_table()
        response = table.get_item(
            Key={"documentId": document_id, "recordType": record_type}
        )
        item = response.get("Item")
        if item:
            return json.loads(json.dumps(item, cls=DecimalEncoder))
        return None
    except ClientError as e:
        logger.error(f"DynamoDB get_item error: {e.response['Error']['Message']}")
        raise


def query_document_records(document_id: str) -> List[Dict[str, Any]]:
    """Retrieve all records for a document."""
    try:
        table = get_table()
        response = table.query(
            KeyConditionExpression="documentId = :pk",
            ExpressionAttributeValues={":pk": document_id},
        )
        items = response.get("Items", [])
        return json.loads(json.dumps(items, cls=DecimalEncoder))
    except ClientError as e:
        logger.error(f"DynamoDB query error: {e.response['Error']['Message']}")
        raise


def update_document_status(document_id: str, status: str, error_message: Optional[str] = None):
    """Update processing status on the METADATA record."""
    try:
        table = get_table()
        update_expr = "SET #status = :status, updatedAt = :updated_at"
        expr_values: Dict[str, Any] = {
            ":status": status,
            ":updated_at": datetime.utcnow().isoformat(),
        }
        expr_names = {"#status": "status"}
        if error_message:
            update_expr += ", errorMessage = :error"
            expr_values[":error"] = error_message
        table.update_item(
            Key={"documentId": document_id, "recordType": "METADATA"},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names,
        )
    except ClientError as e:
        logger.error(f"DynamoDB update_item error: {e.response['Error']['Message']}")
        raise


def delete_document_records(document_id: str):
    """Delete all DynamoDB records for a document."""
    records = query_document_records(document_id)
    table = get_table()
    with table.batch_writer() as batch:
        for record in records:
            batch.delete_item(
                Key={
                    "documentId": record["documentId"],
                    "recordType": record["recordType"],
                }
            )
    logger.info(f"Deleted {len(records)} records for document {document_id}")


# ─────────────────────────────────────────
# S3 Helpers
# ─────────────────────────────────────────

def generate_presigned_upload_url(bucket: str, s3_key: str, mime_type: str, expires_in: int = 3600) -> str:
    """Generate a presigned PUT URL for direct browser upload."""
    s3 = get_s3()
    url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": bucket,
            "Key": s3_key,
            "ContentType": mime_type,
        },
        ExpiresIn=expires_in,
    )
    return url


def generate_presigned_download_url(bucket: str, s3_key: str, expires_in: int = 3600) -> str:
    """Generate a presigned GET URL for audio/document download."""
    s3 = get_s3()
    url = s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": s3_key},
        ExpiresIn=expires_in,
    )
    return url


def get_s3_object(bucket: str, s3_key: str) -> bytes:
    """Download an S3 object and return raw bytes."""
    s3 = get_s3()
    response = s3.get_object(Bucket=bucket, Key=s3_key)
    return response["Body"].read()


def put_s3_object(bucket: str, s3_key: str, data: bytes, content_type: str = "application/octet-stream"):
    """Upload bytes to S3."""
    s3 = get_s3()
    s3.put_object(Bucket=bucket, Key=s3_key, Body=data, ContentType=content_type)


def delete_s3_objects_with_prefix(bucket: str, prefix: str):
    """Delete all S3 objects under a given key prefix."""
    s3 = get_s3()
    paginator = s3.get_paginator("list_objects_v2")
    pages = paginator.paginate(Bucket=bucket, Prefix=prefix)
    objects_to_delete = []
    for page in pages:
        for obj in page.get("Contents", []):
            objects_to_delete.append({"Key": obj["Key"]})

    if objects_to_delete:
        s3.delete_objects(
            Bucket=bucket,
            Delete={"Objects": objects_to_delete},
        )
        logger.info(f"Deleted {len(objects_to_delete)} S3 objects from {bucket}/{prefix}")


# ─────────────────────────────────────────
# Secrets Manager Helpers
# ─────────────────────────────────────────

_secret_cache: Dict[str, str] = {}


def get_secret(secret_name: str) -> str:
    """Retrieve a secret from AWS Secrets Manager (cached per Lambda container)."""
    if secret_name in _secret_cache:
        return _secret_cache[secret_name]
    try:
        client = get_secrets_client()
        response = client.get_secret_value(SecretId=secret_name)
        secret = response.get("SecretString", "")
        _secret_cache[secret_name] = secret
        return secret
    except ClientError as e:
        logger.error(f"Failed to retrieve secret {secret_name}: {e}")
        raise


def get_openai_api_key() -> str:
    """Retrieve OpenAI API key from Secrets Manager or environment variable."""
    # During local development, fall back to env var
    env_key = os.environ.get("OPENAI_API_KEY")
    if env_key:
        return env_key
    secret_name = os.environ.get("OPENAI_SECRET_NAME", "samvid-ai/openai-api-key")
    secret_json = get_secret(secret_name)
    try:
        data = json.loads(secret_json)
        return data.get("api_key", secret_json)
    except json.JSONDecodeError:
        return secret_json


# ─────────────────────────────────────────
# HTTP Response Helpers
# ─────────────────────────────────────────

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Content-Type": "application/json",
}


def success_response(data: Any, status_code: int = 200, message: Optional[str] = None) -> Dict:
    body: Dict[str, Any] = {"success": True, "data": data}
    if message:
        body["message"] = message
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, cls=DecimalEncoder, default=str),
    }


def error_response(
    error_message: str,
    error_code: str,
    status_code: int = 400,
    details: Any = None,
    request_id: Optional[str] = None,
) -> Dict:
    body: Dict[str, Any] = {
        "success": False,
        "error": error_message,
        "error_code": error_code,
    }
    if details:
        body["details"] = details
    if request_id:
        body["request_id"] = request_id
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, cls=DecimalEncoder, default=str),
    }


def parse_request_body(event: Dict) -> Dict[str, Any]:
    """Safely parse JSON request body from Lambda event."""
    body = event.get("body", "{}")
    if body is None:
        return {}
    if isinstance(body, dict):
        return body
    try:
        return json.loads(body)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON body: {e}")


def get_path_param(event: Dict, param_name: str) -> str:
    """Extract a path parameter from Lambda event."""
    params = event.get("pathParameters") or {}
    value = params.get(param_name)
    if not value:
        raise ValueError(f"Missing required path parameter: {param_name}")
    return value


def get_request_id(context) -> str:
    """Extract AWS request ID from Lambda context."""
    try:
        return context.aws_request_id
    except Exception:
        return "unknown"


# ─────────────────────────────────────────
# Text Processing Helpers
# ─────────────────────────────────────────

def truncate_text(text: str, max_chars: int = 100_000) -> str:
    """Truncate text to avoid exceeding LLM token limits."""
    if len(text) <= max_chars:
        return text
    logger.warning(f"Truncating document text from {len(text)} to {max_chars} chars")
    return text[:max_chars] + "\n\n[Document truncated due to length. Please review original document for complete content.]"


def chunk_text(text: str, chunk_size: int = 3000) -> List[str]:
    """Split text into chunks for AWS Translate (max 5000 bytes per request)."""
    chunks = []
    words = text.split()
    current_chunk: List[str] = []
    current_length = 0
    for word in words:
        if current_length + len(word) + 1 > chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_length = len(word)
        else:
            current_chunk.append(word)
            current_length += len(word) + 1
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks


# ─────────────────────────────────────────
# Short aliases used by Lambda handlers
# ─────────────────────────────────────────
import uuid

def generate_document_id() -> str:
    return str(uuid.uuid4())

def now_iso() -> str:
    return datetime.utcnow().isoformat()

def ttl_24h() -> int:
    return calculate_ttl(24)

def get_documents_bucket() -> str:
    return os.environ.get("DOCUMENTS_BUCKET", "")

def get_audio_bucket() -> str:
    return os.environ.get("AUDIO_BUCKET", "")

def ok(data, status_code: int = 200, message=None) -> dict:
    return success_response(data, status_code, message)

def error(message: str, status_code: int = 500, error_code: str = "INTERNAL_ERROR", details=None) -> dict:
    return error_response(message, error_code, status_code, details)

def parse_body(event: dict) -> dict:
    return parse_request_body(event)


def get_object_bytes(bucket: str, s3_key: str) -> bytes:
    """Alias for get_s3_object."""
    return get_s3_object(bucket, s3_key)

def put_object_bytes(bucket: str, s3_key: str, data: bytes, content_type: str = "application/octet-stream"):
    """Alias for put_s3_object."""
    put_s3_object(bucket, s3_key, data, content_type)

def delete_s3_object(bucket: str, s3_key: str):
    """Delete a single S3 object."""
    s3 = get_s3()
    s3.delete_object(Bucket=bucket, Key=s3_key)
    logger.info(f"Deleted s3://{bucket}/{s3_key}")
