import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from app.config.settings import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class EmailNotificationService:
    """
    Modular email service abstraction.
    Supports standard SMTP. If disabled or unconfigured, logs safely without errors.
    """

    def __init__(self):
        self.enabled = settings.EMAIL_ENABLED
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from = settings.SMTP_FROM

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        if not self.enabled:
            logger.info("[Email Disabled] Would send email to '%s' with subject '%s'", to_email, subject)
            return True

        if not self.smtp_host:
            logger.warning("[Email] SMTP_HOST not configured. Email suppressed to '%s'", to_email)
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.smtp_from
            msg["To"] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                server.starttls()
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.smtp_from, [to_email], msg.as_string())

            logger.info("Successfully sent email to '%s'", to_email)
            return True
        except Exception as e:
            logger.warning("Failed to send email to '%s': %s", to_email, e)
            return False


email_service = EmailNotificationService()
