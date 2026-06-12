"""
The Quest of Mesh 3 - Game Server
Accounts, PVP, Open World
"""
import http.server
import socketserver
import json
import os
import hashlib
from pathlib import Path

PORT = int(os.environ.get("PORT", 6902))
BASE_DIR = Path(__file__).parent
ACCOUNTS_FILE = BASE_DIR / "accounts.json"


def load_accounts():
    if ACCOUNTS_FILE.exists():
        with open(ACCOUNTS_FILE, "r") as f:
            return json.loads(f.read())
    return {}


def save_accounts(accounts):
    with open(ACCOUNTS_FILE, "w") as f:
        f.write(json.dumps(accounts, indent=2))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR / "public"), **kwargs)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(length).decode()) if length > 0 else {}

        if self.path == "/api/register":
            username = data.get("username", "").strip()
            password = data.get("password", "").strip()
            gender = data.get("gender", "male")
            avatar = data.get("avatar", {})

            if not username or not password:
                self._json({"ok": False, "err": "Username and password required"})
                return
            if len(username) < 3:
                self._json({"ok": False, "err": "Username must be 3+ characters"})
                return

            accounts = load_accounts()
            if username.lower() in [k.lower() for k in accounts]:
                self._json({"ok": False, "err": "Username taken"})
                return

            accounts[username] = {
                "pw": hashlib.sha256(password.encode()).hexdigest(),
                "gender": gender,
                "avatar": avatar,
                "level": 1,
                "money": 2000,
                "xp": 0,
                "hp": 200,
                "kills": 0,
                "pvp_wins": 0,
                "pvp_losses": 0,
                "weapons": ["Fists"],
                "story_progress": 0,
            }
            save_accounts(accounts)
            self._json({"ok": True, "account": accounts[username], "username": username})

        elif self.path == "/api/login":
            username = data.get("username", "").strip()
            password = data.get("password", "").strip()
            accounts = load_accounts()

            # Case-insensitive lookup
            match = None
            for k, v in accounts.items():
                if k.lower() == username.lower():
                    match = (k, v)
                    break

            if not match:
                self._json({"ok": False, "err": "Account not found"})
                return

            pw_hash = hashlib.sha256(password.encode()).hexdigest()
            if match[1]["pw"] != pw_hash:
                self._json({"ok": False, "err": "Wrong password"})
                return

            self._json({"ok": True, "account": match[1], "username": match[0]})

        elif self.path == "/api/save":
            username = data.get("username", "")
            accounts = load_accounts()
            if username in accounts:
                for key in ["level", "money", "xp", "hp", "kills", "pvp_wins", "pvp_losses", "weapons", "story_progress"]:
                    if key in data:
                        accounts[username][key] = data[key]
                save_accounts(accounts)
                self._json({"ok": True})
            else:
                self._json({"ok": False, "err": "Account not found"})

        elif self.path == "/api/pvp-opponents":
            accounts = load_accounts()
            opponents = []
            me = data.get("username", "")
            for name, acc in accounts.items():
                if name != me:
                    opponents.append({
                        "name": name,
                        "level": acc.get("level", 1),
                        "kills": acc.get("kills", 0),
                        "pvp_wins": acc.get("pvp_wins", 0),
                    })
            opponents.sort(key=lambda x: x["level"], reverse=True)
            self._json({"ok": True, "opponents": opponents[:10]})

        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        print(f"[MESH3] {args[0]}")


if __name__ == "__main__":
    (BASE_DIR / "public").mkdir(exist_ok=True)
    print("=" * 45)
    print("  THE QUEST OF MESH 3 - Server")
    print(f"  http://localhost:{PORT}")
    print("=" * 45)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            httpd.shutdown()
