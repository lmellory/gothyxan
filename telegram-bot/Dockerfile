FROM python:3.12-slim

WORKDIR /app

RUN useradd --create-home botuser

COPY telegram-bot/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY telegram-bot .
USER botuser
CMD ["python", "bot.py"]
