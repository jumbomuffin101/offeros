import re
from dataclasses import dataclass

from app.core.errors import ValidationError


USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,80}$")


@dataclass(frozen=True)
class ProviderSyncResult:
    status: str
    message: str


class CodingProfileProvider:
    name: str

    def validate_username(self, username: str) -> str:
        raise NotImplementedError

    def profile_url(self, username: str) -> str:
        raise NotImplementedError

    def sync(self, username: str) -> ProviderSyncResult:
        raise NotImplementedError


class LeetCodeProvider(CodingProfileProvider):
    name = "leetcode"

    def validate_username(self, username: str) -> str:
        normalized = username.strip().lstrip("@")
        if not USERNAME_PATTERN.fullmatch(normalized):
            raise ValidationError("Enter a valid LeetCode username using letters, numbers, underscores, or hyphens.")
        return normalized

    def profile_url(self, username: str) -> str:
        return f"https://leetcode.com/u/{username}/"

    def sync(self, username: str) -> ProviderSyncResult:
        return ProviderSyncResult(
            status="unsupported",
            message="Automatic LeetCode activity sync is unavailable. Log or import practice manually; OfferOS never asks for your LeetCode password.",
        )


def provider_for(name: str) -> CodingProfileProvider:
    if name == "leetcode":
        return LeetCodeProvider()
    raise ValidationError("This coding profile provider is not supported.")
