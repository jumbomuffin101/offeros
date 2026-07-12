from app.core.errors import ValidationError
from app.services.resume_extraction.base import ExtractionResult, MAX_EXTRACTED_TEXT_CHARS
from app.services.resume_extraction.utils import normalize_resume_text


class TextResumeExtractor:
    def extract(self, content: bytes) -> ExtractionResult:
        for encoding in ("utf-8", "utf-16", "latin-1"):
            try:
                text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                text = ""
        if not text.strip():
            raise ValidationError("This text file does not contain readable resume text.")
        normalized = normalize_resume_text(text)[:MAX_EXTRACTED_TEXT_CHARS]
        return ExtractionResult(text=normalized, page_count=None)
