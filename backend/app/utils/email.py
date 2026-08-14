import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging
from datetime import datetime

# Load environment variables from .env file if present
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(base_dir, ".env")
if os.path.exists(env_path):
    try:
        from dotenv import load_dotenv
        load_dotenv(env_path)
    except ImportError:
        # Fallback manual parsing if python-dotenv is not installed
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()


def send_email(to_email: str, subject: str, body: str):
    """
    Sends an email to the specified recipient.
    Attempts to send via SMTP if configuration environment variables are present,
    otherwise prints to console and appends to backend/logs/sent_emails.log.
    """
    logging.info(f"Sending email to {to_email} with subject '{subject}'...")

    # 1. Print to console for development visibility
    print("\n" + "=" * 50)
    print("[SMTP MOCK EMAIL SENT]")
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"Body:\n{body}")
    print("=" * 50 + "\n")

    # 2. Append to a local file for inspection in development
    base_dir = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    log_dir = os.path.join(base_dir, "logs")

    try:
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)

        log_file = os.path.join(log_dir, "sent_emails.log")
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"--- Sent at: {timestamp} ---\n")
            f.write(f"To: {to_email}\n")
            f.write(f"Subject: {subject}\n")
            f.write(f"Body:\n{body}\n")
            f.write("=" * 50 + "\n\n")
    except Exception as e:
        logging.error(f"Failed to log email to file: {e}")

    # 3. SMTP configuration check and delivery attempt
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_sender = os.getenv("SMTP_SENDER", "no-reply@projectpulse.com")

    if smtp_server and smtp_port and smtp_username and smtp_password:
        try:
            msg = MIMEMultipart()
            msg["From"] = smtp_sender
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            port = int(smtp_port)
            if port == 465:
                server = smtplib.SMTP_SSL(smtp_server, port)
                server.login(smtp_username, smtp_password)
            else:
                server = smtplib.SMTP(smtp_server, port)
                server.starttls()
                server.login(smtp_username, smtp_password)

            server.sendmail(smtp_sender, to_email, msg.as_string())
            server.quit()
            logging.info(f"Email successfully sent to {to_email} via SMTP.")
        except Exception as e:
            logging.error(f"Failed to send email via SMTP to {to_email}: {e}")
