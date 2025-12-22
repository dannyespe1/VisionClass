import requests
from django.conf import settings


def send_mailgun_email(to_email: str, subject: str, text: str) -> None:
    if not settings.MAILGUN_API_KEY or not settings.MAILGUN_DOMAIN:
        raise ValueError("Mailgun no configurado")

    url = f"{settings.MAILGUN_BASE_URL}/v3/{settings.MAILGUN_DOMAIN}/messages"
    auth = ("api", settings.MAILGUN_API_KEY)
    data = {
        "from": settings.MAILGUN_FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "text": text,
    }
    response = requests.post(url, auth=auth, data=data, timeout=10)
    response.raise_for_status()
