import mimetypes
import re
from dataclasses import dataclass
from pathlib import Path

from app.core.errors import ValidationError
from app.services.resume_extraction.base import ExtractionResult
from app.services.resume_extraction.docx import DocxResumeExtractor
from app.services.resume_extraction.pdf import PdfResumeExtractor
from app.services.resume_extraction.text import TextResumeExtractor


MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}
SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


@dataclass(frozen=True)
class ValidatedResumeFile:
    filename: str
    extension: str
    content_type: str
    content: bytes


class ResumeExtractionService:
    def validate(self, *, filename: str, content_type: str | None, content: bytes) -> ValidatedResumeFile:
        if not content:
            raise ValidationError("Upload a non-empty resume file.")
        if len(content) > MAX_RESUME_FILE_BYTES:
            raise ValidationError("Resume files must be 5 MB or smaller.")
        safe_name = sanitize_filename(filename)
        extension = Path(safe_name).suffix.lower()
        if extension not in SUPPORTED_EXTENSIONS:
            raise ValidationError("Unsupported resume file type. Upload a PDF, DOCX, or TXT file.")
        guessed_type = mimetypes.guess_type(safe_name)[0] or ""
        supplied_type = (content_type or "").split(";", 1)[0].strip().lower()
        if supplied_type and supplied_type not in SUPPORTED_MIME_TYPES and guessed_type not in SUPPORTED_MIME_TYPES:
            raise ValidationError("Unsupported resume file type. Upload a PDF, DOCX, or TXT file.")
        if extension == ".pdf" and not content.startswith(b"%PDF"):
            raise ValidationError("This file does not appear to be a valid PDF.")
        if extension == ".docx" and not content.startswith(b"PK"):
            raise ValidationError("This file does not appear to be a valid DOCX.")
        return ValidatedResumeFile(safe_name, extension, supplied_type or guessed_type, content)

    def extract(self, file: ValidatedResumeFile) -> ExtractionResult:
        if file.extension == ".pdf":
            return PdfResumeExtractor().extract(file.content)
        if file.extension == ".docx":
            return DocxResumeExtractor().extract(file.content)
        return TextResumeExtractor().extract(file.content)


def sanitize_filename(value: str) -> str:
    name = Path(value or "resume").name
    name = re.sub(r"[^A-Za-z0-9._ -]+", "_", name).strip(" .")
    return name[:180] or "resume"
