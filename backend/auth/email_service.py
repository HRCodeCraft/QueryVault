import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings


def send_verification_email(to_email: str, token: str):
    verify_url = f"http://localhost:5173/verify-email?token={token}"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #0f1117; color: #e2e8f0; border-radius: 12px;">
        <h2 style="color: #6c63ff;">📄 Welcome to QueryVault</h2>
        <p>Thank you for signing up! Please verify your email address to get started.</p>
        <a href="{verify_url}"
           style="display: inline-block; margin: 20px 0; padding: 12px 28px; background: #6c63ff; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Verify Email
        </a>
        <p style="color: #8892a4; font-size: 13px;">If you didn't create an account, ignore this email.</p>
        <p style="color: #8892a4; font-size: 13px;">This link expires in 24 hours.</p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your QueryVault account"
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.EMAIL_FROM, settings.EMAIL_PASSWORD)
        server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())
