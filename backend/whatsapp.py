"""
whatsapp.py — WhatsApp click-to-chat notifications for patients.

No WhatsApp API account is needed: the backend builds a https://wa.me/<number>?text=…
link and the clinician's WhatsApp (web or phone) opens with the message pre-filled.
Staff press Send, so the message comes from the clinic's own WhatsApp number.

The message is a notification only — it never contains the diagnosis, because
WhatsApp previews appear on lock screens and shared devices.

Environment
  DEFAULT_COUNTRY_CODE   prefix for numbers entered without one (default: 91, India)
  BREVO_SENDER_NAME      clinic name used in the message (default: CancerLens)
"""

import os
import re
import urllib.parse
from typing import Optional


class WhatsAppError(ValueError):
    pass


def normalize_phone(raw: Optional[str]) -> str:
    """Return digits-only international format (e.g. 919876543210) as wa.me requires."""
    if not raw:
        raise WhatsAppError("No phone number on record for this patient")
    s = raw.strip()
    digits = re.sub(r"\D", "", s)
    cc = re.sub(r"\D", "", os.environ.get("DEFAULT_COUNTRY_CODE", "91")) or "91"
    if s.startswith("+"):
        pass                                   # already international
    elif digits.startswith("00"):
        digits = digits[2:]                    # 00 international prefix
    elif digits.startswith("0") and len(digits) == 11:
        digits = cc + digits[1:]               # national trunk prefix, e.g. 09876543210
    elif len(digits) == 10:
        digits = cc + digits                   # bare national number
    if not 8 <= len(digits) <= 15:
        raise WhatsAppError("The phone number on record is not a valid WhatsApp number")
    return digits


def build_message(patient_name: str, clinic: str, report_emailed: bool) -> str:
    first = (patient_name or "").split()[0] if (patient_name or "").strip() else "there"
    if report_emailed:
        body = (f"your diagnostic report from {clinic} is ready and has been sent to your "
                f"e-mail address on file. Please check your inbox (and spam folder).")
    else:
        body = f"your diagnostic report from {clinic} is ready. Please contact the clinic to discuss it with your doctor."
    return (f"Hello {first}, {body}\n\n"
            f"If you have any questions, please reply here or contact the clinic.\n— {clinic}")


def click_to_chat_url(phone_digits: str, message: str) -> str:
    return f"https://wa.me/{phone_digits}?text={urllib.parse.quote(message)}"


def mask_phone(phone_digits: str) -> str:
    return f"+{phone_digits[:2]} ••••••{phone_digits[-4:]}"
