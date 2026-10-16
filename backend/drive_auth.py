"""
drive_auth.py — One-time Google sign-in to let the backend upload patient scans to your Drive.

Before running:
  1. https://console.cloud.google.com → create/select a project → enable "Google Drive API".
  2. APIs & Services → OAuth consent screen → External → add your Gmail as a Test user,
     then click "Publish app" (In production). In "Testing" mode Google expires the
     refresh token after 7 days and uploads would stop.
  3. Credentials → Create credentials → OAuth client ID → "Desktop app".
     Put the client ID / secret in backend/.env:
       GDRIVE_OAUTH_CLIENT_ID=...
       GDRIVE_OAUTH_CLIENT_SECRET=...

Run (from backend/):  ..\\venv\\Scripts\\python drive_auth.py
A browser opens; sign in with the account that owns the patient-images folder
("Google hasn't verified this app" → Advanced → Continue is expected for your own app).
The script prints GDRIVE_OAUTH_REFRESH_TOKEN=... — add it to .env and to Render.
"""

import http.server
import json
import os
import secrets
import sys
import urllib.parse
import urllib.request
import webbrowser

from dotenv import load_dotenv

load_dotenv()

SCOPE = "https://www.googleapis.com/auth/drive"  # needed to write into a folder the app didn't create
PORT = 8765


def main():
    client_id = os.environ.get("GDRIVE_OAUTH_CLIENT_ID")
    client_secret = os.environ.get("GDRIVE_OAUTH_CLIENT_SECRET")
    if not client_id or not client_secret:
        sys.exit("Set GDRIVE_OAUTH_CLIENT_ID and GDRIVE_OAUTH_CLIENT_SECRET in backend/.env first (see this file's header).")

    redirect = f"http://127.0.0.1:{PORT}"
    state = secrets.token_urlsafe(16)
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": client_id, "redirect_uri": redirect, "response_type": "code",
        "scope": SCOPE, "access_type": "offline", "prompt": "consent", "state": state,
    })
    result = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            ok = qs.get("state", [""])[0] == state and "code" in qs
            if ok:
                result["code"] = qs["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h3>Done - you can close this tab and return to the terminal.</h3>" if ok
                             else b"<h3>Sign-in failed or was cancelled.</h3>")

        def log_message(self, *args):
            pass

    print("Opening browser for Google sign-in...\nIf it doesn't open, visit:\n" + auth_url)
    webbrowser.open(auth_url)
    server = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    while "code" not in result:
        server.handle_request()

    body = urllib.parse.urlencode({
        "code": result["code"], "client_id": client_id, "client_secret": client_secret,
        "redirect_uri": redirect, "grant_type": "authorization_code",
    }).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=body)) as r:
        tokens = json.loads(r.read())
    if "refresh_token" not in tokens:
        sys.exit("No refresh token returned. Remove the app at https://myaccount.google.com/permissions and run again.")
    print("\nAdd this to backend/.env and to Render > Environment:\n")
    print(f"GDRIVE_OAUTH_REFRESH_TOKEN={tokens['refresh_token']}")


if __name__ == "__main__":
    main()
