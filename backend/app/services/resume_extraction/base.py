from dataclasses import dataclass, field
from typing import Protocol


MAX_EXTRACTED_TEXT_CHARS = 120_000


@dataclass(frozen=True)
class ExtractionResult:
    text: str
    page_count: int | None = None
    status: str = "completed"
    warnings: list[str] = field(default_factory=list)

    @property
    def character_count(self) -> int:
        return len(self.text)


class ResumeExtractor(Protocol):
    def extract(self, content: bytes) -> ExtractionResult:
        ...
