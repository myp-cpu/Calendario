import os
import smtplib
from email.mime.multipart import MIMEMultipart
from typing import Optional

def send_email_smtp(
    message: MIMEMultipart,
    to_email: str,
    attachment_path: Optional[str] = None
) -> dict:
    """
    Send email securely using SMTP with Gmail App Password support
    
    Args:
        message: MIMEMultipart message object with subject, from, to, body already set
        to_email: Recipient email address (for logging)
        attachment_path: Optional path to attachment file (not used if message already has attachments)
    
    Returns:
        dict with 'success' (bool) and 'message' (str)
    
    Raises:
        Exception: If SMTP configuration is missing or sending fails
    """
    try:
        # Get SMTP settings from environment (matching existing server.py variables)
        SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
        SMTP_USER = os.environ.get("SMTP_USER", "")
        SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
        SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER)

        # Validate required credentials
        if not SMTP_USER or not SMTP_PASSWORD:
            error_msg = "SMTP_USER and SMTP_PASSWORD environment variables are required"
            print(f"[EMAIL_SENDER] ERROR: {error_msg}")
            raise ValueError(error_msg)

        print(f"[EMAIL_SENDER] Connecting to {SMTP_SERVER}:{SMTP_PORT}...")
        
        # Create SMTP connection
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        
        # Enable STARTTLS (required for Gmail)
        print(f"[EMAIL_SENDER] Starting TLS...")
        server.starttls()
        
        # Authenticate
        print(f"[EMAIL_SENDER] Authenticating as {SMTP_USER}...")
        server.login(SMTP_USER, SMTP_PASSWORD)
        print(f"[EMAIL_SENDER] Authentication successful")
        
        # Send message
        print(f"[EMAIL_SENDER] Sending email to {to_email}...")
        server.send_message(message)
        print(f"[EMAIL_SENDER] Email sent successfully to {to_email}")
        
        # Close connection
        server.quit()
        
        return {
            "success": True,
            "message": f"Email sent successfully to {to_email}"
        }
        
    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"SMTP Authentication failed: {str(e)}"
        print(f"[EMAIL_SENDER] ERROR: {error_msg}")
        print(f"[EMAIL_SENDER] Suggestion: Verify SMTP_USER and SMTP_PASSWORD. For Gmail, use an App Password, not your regular password.")
        raise Exception(error_msg)
        
    except smtplib.SMTPException as e:
        error_msg = f"SMTP error: {str(e)}"
        print(f"[EMAIL_SENDER] ERROR: {error_msg}")
        raise Exception(error_msg)
        
    except Exception as e:
        error_msg = f"Error sending email: {str(e)}"
        print(f"[EMAIL_SENDER] ERROR: {error_msg}")
        raise Exception(error_msg)

