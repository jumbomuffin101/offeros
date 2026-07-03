from fastapi import status

from app.core.errors import AppError


def reject_null_fields(values: dict[str, object], non_nullable_fields: set[str]) -> None:
    invalid = sorted(field for field in non_nullable_fields if field in values and values[field] is None)
    if invalid:
        raise AppError(
            code="validation_error",
            message="Required fields cannot be null.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={field: ["This field cannot be null."] for field in invalid},
        )
