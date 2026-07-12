from app.core.errors import AppError, ValidationError
from app.services.resume_extraction.base import ExtractionResult, MAX_EXTRACTED_TEXT_CHARS
from app.services.resume_extraction.utils import normalize_resume_text


class PdfResumeExtractor:
    def extract(self, content: bytes) -> ExtractionResult:
        try:
            import fitz
        except ImportError as exc:
            raise AppError("extraction_not_configured", "PDF extraction is not configured on the backend.", 503) from exc

        try:
            document = fitz.open(stream=content, filetype="pdf")
        except Exception as exc:
            raise ValidationError("OfferOS could not read this PDF file.") from exc

        try:
            page_text: list[str] = []
            for page in document:
                text = page.get_text("text")
                if text.strip():
                    page_text.append(text)
            page_count = document.page_count
        finally:
            document.close()
        normalized = normalize_resume_text("\n\n".join(page_text))
        if len(normalized) < 80:
            raise ValidationError("This PDF appears to be scanned or image-based. OCR support is coming soon.")
        warnings: list[str] = []
        if len(normalized) > MAX_EXTRACTED_TEXT_CHARS:
            warnings.append("Extracted text was truncated to the maximum supported length.")
            normalized = normalized[:MAX_EXTRACTED_TEXT_CHARS]
        return ExtractionResult(text=normalized, page_count=page_count, warnings=warnings)
