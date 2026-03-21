"""
Samvid AI - Custom Exception Classes
"""

class SamvidBaseError(Exception):
    def __init__(self, message: str, status_code: int = 500, error_code: str = "INTERNAL_ERROR"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)
    def to_dict(self):
        return {"error": self.error_code, "message": self.message}

SamvidError = SamvidBaseError

class ValidationError(SamvidBaseError):
    def __init__(self, message: str): super().__init__(message, 400, "VALIDATION_ERROR")

class UnsupportedFileTypeError(SamvidBaseError):
    def __init__(self, file_type: str = ""): super().__init__(f"Unsupported file type: {file_type}." if file_type else "Unsupported file type.", 400, "UNSUPPORTED_FILE_TYPE")

class FileTooLargeError(SamvidBaseError):
    def __init__(self, size_mb: float = 0): super().__init__(f"File size {size_mb:.1f}MB exceeds the 50MB limit.", 400, "FILE_TOO_LARGE")

class MissingParameterError(SamvidBaseError):
    def __init__(self, param: str = ""): super().__init__(f"Missing required parameter: {param}.", 400, "MISSING_PARAMETER")

class InvalidRequestError(SamvidBaseError):
    def __init__(self, message: str = "Invalid request."): super().__init__(message, 400, "INVALID_REQUEST")

class DocumentNotFoundError(SamvidBaseError):
    def __init__(self, document_id: str = ""): super().__init__(f"Document not found: {document_id}.", 404, "DOCUMENT_NOT_FOUND")

class ResourceNotFoundError(SamvidBaseError):
    def __init__(self, resource: str = ""): super().__init__(f"Resource not found: {resource}.", 404, "RESOURCE_NOT_FOUND")

class DocumentAlreadyProcessedError(SamvidBaseError):
    def __init__(self, document_id: str = ""): super().__init__("Document already processed.", 409, "ALREADY_PROCESSED")

class InvalidDocumentStateError(SamvidBaseError):
    def __init__(self, current_state: str = "", expected_state: str = ""): super().__init__(f"Document is in state '{current_state}', expected '{expected_state}'.", 409, "INVALID_DOCUMENT_STATE")

class OcrError(SamvidBaseError):
    def __init__(self, message: str = "OCR extraction failed."): super().__init__(message, 422, "OCR_ERROR")

class TextExtractionError(SamvidBaseError):
    def __init__(self, message: str = "Text extraction failed."): super().__init__(message, 422, "TEXT_EXTRACTION_ERROR")

class AnalysisError(SamvidBaseError):
    def __init__(self, message: str = "AI analysis failed."): super().__init__(message, 422, "ANALYSIS_ERROR")

class TranslationError(SamvidBaseError):
    def __init__(self, language: str = ""): super().__init__(f"Translation to '{language}' failed.", 422, "TRANSLATION_ERROR")

class UnsupportedLanguageError(SamvidBaseError):
    def __init__(self, language: str = ""): super().__init__(f"Unsupported language: '{language}'.", 422, "UNSUPPORTED_LANGUAGE")

class VoiceGenerationError(SamvidBaseError):
    def __init__(self, message: str = "Voice generation failed."): super().__init__(message, 422, "VOICE_GENERATION_ERROR")

class IntelligenceExtractionError(SamvidBaseError):
    def __init__(self, message: str = "Intelligence extraction failed."): super().__init__(message, 422, "INTELLIGENCE_EXTRACTION_ERROR")

class OpenAIError(SamvidBaseError):
    def __init__(self, message: str = "OpenAI API request failed."): super().__init__(message, 502, "OPENAI_ERROR")

class TextractError(SamvidBaseError):
    def __init__(self, message: str = "AWS Textract request failed."): super().__init__(message, 502, "TEXTRACT_ERROR")

class PollyError(SamvidBaseError):
    def __init__(self, message: str = "AWS Polly request failed."): super().__init__(message, 502, "POLLY_ERROR")

class S3Error(SamvidBaseError):
    def __init__(self, message: str = "S3 operation failed."): super().__init__(message, 502, "S3_ERROR")

class DynamoDBError(SamvidBaseError):
    def __init__(self, message: str = "DynamoDB operation failed."): super().__init__(message, 502, "DYNAMODB_ERROR")

class SecretsManagerError(SamvidBaseError):
    def __init__(self, message: str = "Failed to retrieve secret."): super().__init__(message, 502, "SECRETS_MANAGER_ERROR")

class InternalError(SamvidBaseError):
    def __init__(self, message: str = "An internal error occurred."): super().__init__(message, 500, "INTERNAL_ERROR")

class ConfigurationError(SamvidBaseError):
    def __init__(self, message: str = "Service configuration error."): super().__init__(message, 500, "CONFIGURATION_ERROR")


# Additional aliases used by handlers
OcrExtractionError = OcrError
ProcessingNotCompleteError = InvalidDocumentStateError
AnalysisFailedError = AnalysisError
