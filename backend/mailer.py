"""
mailer.py — Patient report e-mails via Brevo (transactional e-mail API).

Environment
  BREVO_API_KEY        API key (Brevo > SMTP & API > API Keys), starts with "xkeysib-"
  BREVO_SENDER_EMAIL   a sender address verified in Brevo (Senders, Domains & Dedicated IPs)
  BREVO_SENDER_NAME    display name (default: CancerLens)
"""

import html
import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


class MailerError(RuntimeError):
    pass


def mailer_status() -> str:
    if not os.environ.get("BREVO_API_KEY"):
        return "not_configured"
    if not os.environ.get("BREVO_SENDER_EMAIL"):
        return "missing_sender"
    return "configured"


def send_email(to_email: str, to_name: str, subject: str, html_body: str, text_body: str) -> str:
    """Send one transactional e-mail. Returns Brevo's messageId."""
    api_key = os.environ.get("BREVO_API_KEY", "").strip()
    sender = os.environ.get("BREVO_SENDER_EMAIL", "").strip()
    if not api_key:
        raise MailerError("E-mail is not configured (BREVO_API_KEY missing)")
    if not sender:
        raise MailerError("E-mail is not configured (BREVO_SENDER_EMAIL missing)")

    payload = {
        "sender": {"email": sender, "name": os.environ.get("BREVO_SENDER_NAME", "CancerLens")},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": text_body,
        # Clinical content: don't let Brevo rewrite links or track opens
        "headers": {"X-Mailin-Track": "0"},
    }
    req = urllib.request.Request(
        BREVO_URL,
        data=json.dumps(payload).encode(),
        # Brevo's Cloudflare front blocks urllib's default User-Agent (error 1010)
        headers={"api-key": api_key, "content-type": "application/json", "accept": "application/json",
                 "user-agent": "cancerlens-backend/2.4"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            return json.loads(res.read() or b"{}").get("messageId", "")
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read()).get("message", "")
        except Exception:
            msg = ""
        if e.code == 401:
            raise MailerError("Brevo rejected the API key (401)")
        raise MailerError(f"Brevo error {e.code}: {msg or e.reason}")
    except urllib.error.URLError as e:
        raise MailerError(f"Could not reach Brevo: {e.reason}")


RISK_COPY = {
    "high": ("#C8353B", "Requires prompt follow-up"),
    "moderate": ("#C98A0A", "Follow-up recommended"),
    "normal": ("#0E9F8E", "No abnormality detected"),
    "low": ("#0E9F8E", "Low risk"),
}


def build_report_email(
    patient_name: str,
    hospital: str,
    support_contact: str,
    visit: Dict[str, Any],
    doctor_notes: Optional[str],
    signed_by: Optional[str],
) -> Dict[str, str]:
    """Render subject / HTML / text for a signed-off visit. All dynamic values are HTML-escaped."""
    ai = visit.get("ai_result") or {}
    review = visit.get("review") or {}
    esc = html.escape
    color, risk_text = RISK_COPY.get(ai.get("risk_level"), ("#3C566E", ""))
    signed_at = review.get("signed_off_at")
    signed_str = signed_at.strftime("%d %b %Y") if signed_at else ""
    confidence = f"{(ai.get('confidence') or 0) * 100:.0f}%"
    domain = (ai.get("domain") or "").capitalize()

    # Subject deliberately carries no diagnosis — inbox previews are often visible to others
    subject = f"Your diagnostic report from {hospital} is ready"

    notes_html = (
        f'<tr><td style="padding:12px 0 0;color:#7A91A6;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Doctor\'s notes</td></tr>'
        f'<tr><td style="padding:4px 0 0;color:#0B2239;font-size:14px;line-height:1.5;white-space:pre-wrap">{esc(doctor_notes)}</td></tr>'
        if doctor_notes else ""
    )
    html_body = f"""<!doctype html><html><body style="margin:0;background:#F3F8FB;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F8FB;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #DCE8F0;border-radius:12px">
<tr><td style="height:4px;background:#0F74C9;border-radius:12px 12px 0 0"></td></tr>
<tr><td style="padding:24px 28px 8px;color:#0B2239">
  <p style="margin:0;font-size:13px;color:#7A91A6">{esc(hospital)}</p>
  <h1 style="margin:6px 0 0;font-size:20px">Your diagnostic report</h1>
  <p style="margin:16px 0 0;font-size:14px;line-height:1.5">Dear {esc(patient_name)},</p>
  <p style="margin:8px 0 0;font-size:14px;line-height:1.5">Your imaging study has been analysed and reviewed by your doctor{f" on {esc(signed_str)}" if signed_str else ""}. A summary is below.</p>
</td></tr>
<tr><td style="padding:12px 28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FBFC;border:1px solid #DCE8F0;border-radius:10px;padding:16px">
    <tr><td style="color:#7A91A6;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Study</td></tr>
    <tr><td style="padding:4px 0 0;color:#0B2239;font-size:14px">{esc(domain)} imaging · Visit {esc(visit.get("visit_code", ""))}</td></tr>
    <tr><td style="padding:12px 0 0;color:#7A91A6;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Finding</td></tr>
    <tr><td style="padding:4px 0 0;font-size:16px;font-weight:700;color:{color}">{esc(ai.get("display_name") or "—")}</td></tr>
    <tr><td style="padding:2px 0 0;font-size:13px;color:#3C566E">{esc(risk_text)} · AI confidence {confidence}</td></tr>
    {notes_html}
    {f'<tr><td style="padding:12px 0 0;color:#3C566E;font-size:13px">Reviewed by {esc(signed_by)}</td></tr>' if signed_by else ""}
  </table>
</td></tr>
<tr><td style="padding:8px 28px 24px;color:#3C566E;font-size:13px;line-height:1.5">
  <p style="margin:0">Please discuss these results with your doctor before making any decisions about your care. If you have questions, contact {esc(support_contact)}.</p>
  <p style="margin:16px 0 0;font-size:11px;color:#7A91A6">This report was produced with AI decision-support software and reviewed by a clinician. It is not a standalone diagnosis. This e-mail contains confidential medical information intended only for {esc(patient_name)}; if you received it in error, please delete it and notify the sender.</p>
</td></tr>
</table></td></tr></table></body></html>"""

    text_body = "\n".join(line for line in [
        f"{hospital} — Your diagnostic report",
        "",
        f"Dear {patient_name},",
        "Your imaging study has been analysed and reviewed by your doctor.",
        "",
        f"Study: {domain} imaging (visit {visit.get('visit_code', '')})",
        f"Finding: {ai.get('display_name') or '-'} — {risk_text} (AI confidence {confidence})",
        f"Doctor's notes: {doctor_notes}" if doctor_notes else None,
        f"Reviewed by: {signed_by}" if signed_by else None,
        "",
        f"Please discuss these results with your doctor. Questions: {support_contact}",
        "This report was produced with AI decision-support software and reviewed by a clinician; it is not a standalone diagnosis.",
    ] if line is not None)
    return {"subject": subject, "html": html_body, "text": text_body}
