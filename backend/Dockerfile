FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN addgroup --system offeros && adduser --system --ingroup offeros offeros

COPY requirements.txt ./requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY alembic ./alembic
COPY alembic.ini ./alembic.ini
COPY app ./app
COPY start.sh ./start.sh

USER offeros
EXPOSE 8000

CMD ["sh", "./start.sh"]
