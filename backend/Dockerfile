FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# `sh` evita problemas de permisos/shebang si el repo se clona en Windows.
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
