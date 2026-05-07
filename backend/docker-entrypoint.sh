# Arranque explícito: migraciones y luego gunicorn (evita problemas con $PORT en railway.toml).
set -e
PORT="${PORT:-8000}"
echo "[entrypoint] PORT=${PORT}"
echo "[entrypoint] migrate..."
python manage.py migrate --noinput
echo "[entrypoint] gunicorn..."
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers 1 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
