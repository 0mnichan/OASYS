from fastapi import FastAPI, Form, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from bs4 import BeautifulSoup
from urllib.parse import urlencode
from html import escape
import base64
import random
import re
import math
import os
import asyncio
import time
import datetime
import json
import secrets
from collections import deque
from sessions import create_session, get_session, cleanup_sessions, Session, register_session
from utils import parse_hidden_fields
import admin_auth

app = FastAPI()

frontend_path = os.path.join(os.path.dirname(__file__), "../oasys_frontend/dist")

# Each entry: {netid, timestamp (ISO), user_id}
_login_log: list[dict] = []

app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

SRM_BASE_URL       = "https://sp.srmist.edu.in/srmiststudentportal"
SRM_LOGIN_URL      = f"{SRM_BASE_URL}/students/loginManager/youLogin.jsp"
SRM_LOGIN_SUBMIT   = "https://sp.srmist.edu.in/srmiststudentportal/SLoginServlet"
SRM_ATTENDANCE_URL = f"{SRM_BASE_URL}/students/report/studentAttendanceDetails.jsp"
SRM_HOME_URL       = f"{SRM_BASE_URL}/students/loginManager/UserHomePage.jsp"

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"

SCREEN_SIZES = [
    ("1920", "1080"),
    ("1680", "1050"),
    ("1440", "900"),
    ("1366", "768"),
    ("1536", "864"),
    ("2560", "1440"),
]

CONCURRENCY = ["4", "6", "8", "12", "16"]

BROWSER_HEADERS = {
    "User-Agent": UA,
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "DNT": "1",
}

LOGIN_SUBMIT_HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "max-age=0",
    "Connection": "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded",
    "DNT": "1",
    "Origin": "https://sp.srmist.edu.in",
    "Referer": SRM_LOGIN_URL,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
}


def compute_js_response(js_challenge: str) -> tuple[str, str]:
    width, height = random.choice(SCREEN_SIZES)
    cores = random.choice(CONCURRENCY)
    fingerprint = (
        UA +
        width +
        height +
        "en-US" +
        "Linux x86_64" +
        "24" +
        "Asia/Calcutta" +
        cores
    )
    js_response = base64.b64encode((js_challenge + fingerprint).encode()).decode()
    return js_response, fingerprint


def extract_captcha_img_url(login_page_html: str) -> str | None:
    soup = BeautifulSoup(login_page_html, "html.parser")
    img = soup.find("img", src=re.compile(r"SCaptchaServlet"))
    if img:
        src = img["src"]
        if src.startswith("/"):
            return f"https://sp.srmist.edu.in{src}"
        return src
    return None


def extract_captcha_text(login_page_html: str) -> str | None:
    match = re.search(r'class="captcha-text"[^>]*>([^<]+)<', login_page_html)
    return match.group(1).strip() if match else None


async def fetch_captcha_image_b64(session, captcha_url: str, referer: str, retries: int = 4, delay: float = 1.0) -> str:
    last_exc = None
    for attempt in range(retries):
        try:
            res = await session.client.get(captcha_url, timeout=10.0, headers={
                "User-Agent": UA,
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": SRM_LOGIN_URL,
                "Sec-Fetch-Dest": "image",
                "Sec-Fetch-Mode": "no-cors",
                "Sec-Fetch-Site": "same-origin",
                "Sec-GPC": "1",
                "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Linux"',
                "DNT": "1",
            })
            content_type = res.headers.get("content-type", "")
            if "image" not in content_type:
                raise ValueError(f"Not an image: {content_type}")
            return base64.b64encode(res.content).decode("utf-8")
        except Exception as e:
            last_exc = e
            if attempt < retries - 1:
                await asyncio.sleep(delay)  # flat 1s delay, not increasing
    raise last_exc


async def get_captcha(session, login_page_html: str) -> dict:
    text = extract_captcha_text(login_page_html)
    if text:
        print(f"[Captcha] Plain text mode: '{text}'")
        return {"captcha_image": None, "captcha_solved": text}

    captcha_url = extract_captcha_img_url(login_page_html)
    if captcha_url:
        print(f"[Captcha] Image mode: {captcha_url}")
        b64 = await fetch_captcha_image_b64(session, captcha_url, referer=SRM_LOGIN_URL)
        return {"captcha_image": b64, "captcha_solved": None}

    raise ValueError("Could not find captcha in login page HTML")


WARM_POOL_SIZE = 3
WARM_TTL = 60

_warm_pool: deque = deque()
_warm_needed: asyncio.Event | None = None


async def _warm_loop():
    while True:
        # Top up pool to WARM_POOL_SIZE
        while len(_warm_pool) < WARM_POOL_SIZE:
            try:
                sess = Session("__warm__")
                login_page = await sess.client.get(SRM_LOGIN_URL, headers=BROWSER_HEADERS)
                sess.login_page_html = login_page.text
                result = await get_captcha(sess, login_page.text)
                sess.captcha_image = result.get("captcha_image")
                _warm_pool.append({"session": sess, "captcha_result": result, "warmed_at": time.time()})
                print(f"[Warm] Pool {len(_warm_pool)}/{WARM_POOL_SIZE}")
            except Exception as e:
                print(f"[Warm] Failed to warm session: {e}")
                await asyncio.sleep(5)
                break

        # Wait for a consumption signal or TTL expiry
        _warm_needed.clear()
        try:
            await asyncio.wait_for(_warm_needed.wait(), timeout=WARM_TTL)
        except asyncio.TimeoutError:
            # Flush all — captchas are stale, refill on next iteration
            print("[Warm] TTL expired, flushing pool")
            while _warm_pool:
                try:
                    await _warm_pool.popleft()["session"].close()
                except Exception:
                    pass


def sanitize_table_html(table) -> str:
    """Re-render a BeautifulSoup table as safe HTML — all cell text is escaped,
    only structural tags and safe attributes (style, colspan, rowspan) are kept."""
    lines = ['<table style="border-collapse:collapse;width:100%;background:white;box-shadow:0 0 10px rgba(0,0,0,0.1)">']
    for row in table.find_all("tr"):
        lines.append("<tr>")
        for cell in row.find_all(["th", "td"]):
            tag = cell.name
            attrs = ""
            style = cell.get("style", "")
            if style:
                attrs += f' style="{escape(style)}"'
            colspan = cell.get("colspan", "")
            if colspan:
                attrs += f' colspan="{escape(str(colspan))}"'
            rowspan = cell.get("rowspan", "")
            if rowspan:
                attrs += f' rowspan="{escape(str(rowspan))}"'
            text = escape(cell.get_text(strip=True))
            lines.append(f"<{tag}{attrs}>{text}</{tag}>")
        lines.append("</tr>")
    lines.append("</table>")
    return "\n".join(lines)


def is_login_failed(response) -> bool:
    if response.status_code >= 400:
        return True
    if "youLogin.jsp" in str(response.url):
        return True
    if "forbiddenPage" in str(response.url):
        return True
    if "captcha-text" in response.text or "SCaptchaServlet" in response.text:
        return True
    return False


@app.api_route("/stat", methods=["GET", "HEAD"])
async def stat():
    return Response(content="OASYS backend alive", media_type="text/plain")


@app.api_route("/ping", methods=["GET", "HEAD"])
async def ping():
    return Response(content="pong", media_type="text/plain")


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    return FileResponse(os.path.join(frontend_path, "index.html"))


@app.get("/health/captcha")
async def health_captcha():
    sess = Session("__health__")
    try:
        login_page = await sess.client.get(SRM_LOGIN_URL, headers=BROWSER_HEADERS, timeout=10.0)
        captcha_url = extract_captcha_img_url(login_page.text)
        if not captcha_url:
            return JSONResponse({"status": "fail", "reason": "captcha URL not found in login page"}, status_code=503)
        b64 = await fetch_captcha_image_b64(sess, captcha_url, referer=SRM_LOGIN_URL)
        img_bytes = base64.b64decode(b64)
        if img_bytes[:4] != b"\x89PNG":
            return JSONResponse({"status": "fail", "reason": f"unexpected image header: {img_bytes[:4].hex()}"}, status_code=503)
        return JSONResponse({"status": "ok"})
    except Exception as e:
        print(f"[Health] captcha check failed: {e}")
        return JSONResponse({"status": "fail", "reason": "captcha check failed"}, status_code=503)
    finally:
        await sess.close()


_AUTH_PAGE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/><title>OASYS Admin — Sign In</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;
         background:#0a0f1e;font-family:Arial,sans-serif}
    .card{background:#111827;border:1px solid #1f2937;border-radius:16px;
          padding:40px;width:360px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
    h1{color:#fff;font-size:22px;margin-bottom:8px}
    p{color:#6b7280;font-size:13px;margin-bottom:28px;line-height:1.6}
    button{width:100%;padding:14px;background:#003366;color:#fff;border:none;
           border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:background .2s}
    button:hover{background:#00448a}
    button:disabled{background:#374151;cursor:not-allowed}
    .err{color:#ef4444;font-size:12px;margin-top:14px;text-align:center}
    .ok{color:#6b7280;font-size:12px;margin-top:14px;text-align:center}
  </style>
</head>
<body>
<div class="card">
  <h1>OASYS Admin</h1>
  <p>Sign in with your passkey. Use your phone or security key when prompted.</p>
  <button id="btn" onclick="signIn()">Sign in with Passkey</button>
  <div id="msg"></div>
</div>
<script>
  const b2b = b => b.replace(/-/g,'+').replace(/_/g,'/'),
        buf = b => Uint8Array.from(atob(b2b(b).padEnd(b.length+(4-b.length%4)%4,'=')),c=>c.charCodeAt(0)).buffer,
        b64 = ab => btoa(String.fromCharCode(...new Uint8Array(ab))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=/g,'');
  async function signIn() {
    const btn=document.getElementById('btn'), msg=document.getElementById('msg');
    btn.disabled=true; msg.className='ok'; msg.textContent='Waiting for passkey…';
    try {
      const opts = await (await fetch('/auth/challenge',{method:'POST'})).json();
      opts.challenge = buf(opts.challenge);
      if(opts.allowCredentials) opts.allowCredentials = opts.allowCredentials.map(c=>({...c,id:buf(c.id)}));
      const cred = await navigator.credentials.get({publicKey: opts});
      const body = {
        id: cred.id, rawId: b64(cred.rawId), type: cred.type,
        response: {
          clientDataJSON:    b64(cred.response.clientDataJSON),
          authenticatorData: b64(cred.response.authenticatorData),
          signature:         b64(cred.response.signature),
        }
      };
      if(cred.response.userHandle) body.response.userHandle = b64(cred.response.userHandle);
      const res = await fetch('/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.ok){ msg.textContent='Authenticated! Redirecting…'; window.location.href='/admin'; }
      else { const e=await res.json(); msg.className='err'; msg.textContent=e.error||'Authentication failed.'; btn.disabled=false; }
    } catch(e) {
      msg.className='err';
      msg.textContent = e.name==='NotAllowedError' ? 'Request cancelled or timed out.' : e.message;
      btn.disabled=false;
    }
  }
</script>
</body></html>"""

_REGISTER_PAGE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/><title>OASYS Admin — Register Passkey</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;
         background:#0a0f1e;font-family:Arial,sans-serif}
    .card{background:#111827;border:1px solid #1f2937;border-radius:16px;
          padding:40px;width:380px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
    h1{color:#fff;font-size:22px;margin-bottom:8px}
    p{color:#6b7280;font-size:13px;margin-bottom:6px;line-height:1.6}
    .warn{color:#f59e0b;font-size:12px;margin-bottom:24px;padding:10px 12px;
          background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:8px}
    button{width:100%;padding:14px;background:#003366;color:#fff;border:none;
           border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:background .2s}
    button:hover{background:#00448a}
    button:disabled{background:#374151;cursor:not-allowed}
    .err{color:#ef4444;font-size:12px;margin-top:14px;text-align:center}
    .ok{color:#22c55e;font-size:12px;margin-top:14px;text-align:center}
  </style>
</head>
<body>
<div class="card">
  <h1>Register Passkey</h1>
  <p>One-time setup. Register your phone or security key as the admin passkey.</p>
  <p class="warn">This endpoint disappears after registration. Do this once.</p>
  <button id="btn" onclick="register()">Register Passkey</button>
  <div id="msg"></div>
</div>
<script>
  const b2b = b => b.replace(/-/g,'+').replace(/_/g,'/'),
        buf = b => Uint8Array.from(atob(b2b(b).padEnd(b.length+(4-b.length%4)%4,'=')),c=>c.charCodeAt(0)).buffer,
        b64 = ab => btoa(String.fromCharCode(...new Uint8Array(ab))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=/g,'');
  async function register() {
    const btn=document.getElementById('btn'), msg=document.getElementById('msg');
    btn.disabled=true; msg.className='ok'; msg.textContent='Follow the prompt on your device…';
    try {
      const opts = await (await fetch('/auth/register/options',{method:'POST'})).json();
      opts.challenge = buf(opts.challenge);
      opts.user.id   = buf(opts.user.id);
      if(opts.excludeCredentials) opts.excludeCredentials=opts.excludeCredentials.map(c=>({...c,id:buf(c.id)}));
      const cred = await navigator.credentials.create({publicKey: opts});
      const body = {
        id: cred.id, rawId: b64(cred.rawId), type: cred.type,
        response: {
          clientDataJSON:    b64(cred.response.clientDataJSON),
          attestationObject: b64(cred.response.attestationObject),
        }
      };
      const res = await fetch('/auth/register/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.ok){ msg.className='ok'; msg.textContent='Passkey registered! Go to /auth to sign in.'; }
      else { const e=await res.json(); msg.className='err'; msg.textContent=e.error||'Registration failed.'; btn.disabled=false; }
    } catch(e) {
      msg.className='err';
      msg.textContent = e.name==='NotAllowedError' ? 'Request cancelled.' : e.message;
      btn.disabled=false;
    }
  }
</script>
</body></html>"""


@app.get("/auth/register")
async def auth_register_page():
    if admin_auth.credential_registered():
        return Response(content="Already registered.", status_code=403, media_type="text/plain")
    return HTMLResponse(_REGISTER_PAGE)


@app.post("/auth/register/options")
async def auth_register_options():
    if admin_auth.credential_registered():
        return Response(content="Already registered.", status_code=403, media_type="text/plain")
    return Response(content=admin_auth.registration_options_json(), media_type="application/json")


@app.post("/auth/register/complete")
async def auth_register_complete(request: Request):
    body = await request.json()
    if admin_auth.complete_registration(body):
        return JSONResponse({"ok": True})
    return JSONResponse({"error": "Registration failed. Retry from /auth/register."}, status_code=400)


@app.get("/auth")
async def auth_page():
    if not admin_auth.credential_registered():
        return RedirectResponse("/auth/register")
    return HTMLResponse(_AUTH_PAGE)


@app.post("/auth/challenge")
async def auth_challenge():
    return Response(content=admin_auth.authentication_options_json(), media_type="application/json")


@app.post("/auth/verify")
async def auth_verify(request: Request):
    body = await request.json()
    if admin_auth.complete_authentication(body):
        token = admin_auth.create_session()
        secure = admin_auth.RP_ID != "localhost"
        resp = JSONResponse({"ok": True})
        resp.set_cookie(
            key="admin_session",
            value=token,
            httponly=True,
            samesite="strict",
            secure=secure,
            max_age=admin_auth.SESSION_TTL,
        )
        return resp
    return JSONResponse({"error": "Authentication failed."}, status_code=401)


@app.get("/admin")
async def admin_dashboard(request: Request):
    if not admin_auth.validate_session(request.cookies.get("admin_session")):
        return RedirectResponse("/auth")

    stats: dict[str, dict] = {}
    for entry in _login_log:
        nid = entry["netid"]
        if nid not in stats:
            stats[nid] = {"count": 0, "first": entry["timestamp"], "last": entry["timestamp"], "logins": []}
        stats[nid]["count"] += 1
        stats[nid]["last"] = entry["timestamp"]
        stats[nid]["logins"].append(entry["timestamp"])

    sorted_stats = sorted(stats.items(), key=lambda x: x[1]["count"], reverse=True)
    rows_html = ""
    for nid, s in sorted_stats:
        recent = "<br>".join(s["logins"][-5:][::-1])
        rows_html += f"""
        <tr>
            <td>{escape(nid)}</td>
            <td>{s["count"]}</td>
            <td>{escape(s["first"])}</td>
            <td>{escape(s["last"])}</td>
            <td style="font-size:11px;line-height:1.6">{recent}</td>
        </tr>"""

    total_logins = len(_login_log)
    unique_users = len(stats)
    page = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/><title>OASYS Admin</title>
  <style>
    body {{ font-family: Arial, sans-serif; background: #f0f2f5; padding: 32px; }}
    h1 {{ color: #003366; margin-bottom: 8px; }}
    .summary {{ display: flex; gap: 24px; margin-bottom: 28px; }}
    .card {{ background: white; border-radius: 10px; padding: 20px 28px;
             box-shadow: 0 2px 8px rgba(0,0,0,0.08); min-width: 160px; }}
    .card .num {{ font-size: 36px; font-weight: 700; color: #003366; }}
    .card .lbl {{ font-size: 12px; color: #888; margin-top: 4px; }}
    table {{ border-collapse: collapse; width: 100%; background: white;
             box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-radius: 10px; overflow: hidden; }}
    th {{ background: #003366; color: white; padding: 12px 14px; text-align: left; font-size: 13px; }}
    td {{ border-bottom: 1px solid #eee; padding: 10px 14px; font-size: 13px; vertical-align: top; }}
    tr:last-child td {{ border-bottom: none; }}
    tr:hover td {{ background: #f7f9fc; }}
  </style>
</head>
<body>
  <h1>OASYS Admin</h1>
  <div class="summary">
    <div class="card"><div class="num">{unique_users}</div><div class="lbl">Unique users</div></div>
    <div class="card"><div class="num">{total_logins}</div><div class="lbl">Total logins</div></div>
  </div>
  <table>
    <thead><tr>
      <th>NetID</th><th>Login count</th><th>First login</th><th>Last login</th><th>Recent logins (last 5)</th>
    </tr></thead>
    <tbody>{rows_html}</tbody>
  </table>
  <p style="margin-top:16px;font-size:11px;color:#aaa">Session expires in 8 hours. In-memory — resets on server restart.</p>
</body>
</html>"""
    return HTMLResponse(page)


@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_spa(full_path: str):
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return Response(content="Frontend not built yet", media_type="text/plain", status_code=404)


@app.post("/start_login/")
async def start_login(user_id: str = Form(...)):
    if _warm_pool:
        warm = _warm_pool.popleft()
        print(f"[Warm] Serving warm session to {user_id} (pool now {len(_warm_pool)}/{WARM_POOL_SIZE})")
        if _warm_needed:
            _warm_needed.set()
        session = warm["session"]
        session.last_used = time.time()
        register_session(user_id, session)
        return JSONResponse(warm["captcha_result"])

    # Fallback: fresh session
    try:
        session = await create_session(user_id)
        login_page = await session.client.get(SRM_LOGIN_URL, headers=BROWSER_HEADERS, timeout=15.0)
        session.login_page_html = login_page.text
        result = await get_captcha(session, login_page.text)
        session.captcha_image = result["captcha_image"]
        return JSONResponse(result)
    except Exception as e:
        print(f"Captcha fetch failed: {e}")
        return JSONResponse({"error": "Could not load captcha from SRM. Try again."}, status_code=503)


@app.post("/refresh_captcha/")
async def refresh_captcha(user_id: str = Form(...)):
    session = get_session(user_id)
    if not session:
        return JSONResponse({"error": "Session invalid"}, status_code=400)

    login_page = await session.client.get(SRM_LOGIN_URL, headers=BROWSER_HEADERS, timeout=15.0)
    session.login_page_html = login_page.text

    try:
        result = await get_captcha(session, login_page.text)
        session.captcha_image = result["captcha_image"]
        return JSONResponse(result)
    except Exception as e:
        print(f"Captcha refresh failed: {e}")
        return JSONResponse({"error": "Could not refresh captcha. Try again."}, status_code=503)


@app.post("/submit_login/")
async def submit_login(
    user_id: str = Form(...),
    netid: str = Form(...),
    password: str = Form(...),
    captcha: str = Form(...),
):
    session = get_session(user_id)
    if not session:
        return HTMLResponse("<h3>Session expired</h3>", status_code=400)

    hidden_fields = parse_hidden_fields(session.login_page_html)
    js_challenge = hidden_fields.get("jsChallenge", "")
    js_response, fingerprint = compute_js_response(js_challenge)

    payload = {
        "username": netid,
        "password": password,
        "captcha": captcha,
        "txtPageAction": "0",
        "csrfToken": hidden_fields.get("csrfToken", ""),
        "jsChallenge": js_challenge,
        "jsResponse": js_response,
        "fingerprint": fingerprint,
        "netId": "",
    }

    await asyncio.sleep(1.5)

    login_res = await session.client.post(
        SRM_LOGIN_SUBMIT,
        data=urlencode(payload),
        timeout=15.0,
        allow_redirects=True,
        headers=LOGIN_SUBMIT_HEADERS,
    )

    print(f"[Login] url={login_res.url} status={login_res.status_code}")
    print(f"[Login] history={[str(r.url) for r in login_res.history]}")

    if is_login_failed(login_res):
        print(f"[Login] Failed — user_id={user_id}")
        return HTMLResponse("<h3>Login failed</h3>", status_code=401)

    print(f"[Login] Success — user_id={user_id}")
    _login_log.append({
        "netid": netid,
        "timestamp": datetime.datetime.now().isoformat(timespec="seconds"),
        "user_id": user_id,
    })

    student_name = ""
    reg_number = ""

    try:
        home_res = await session.client.get(SRM_HOME_URL, headers=BROWSER_HEADERS)
        home_soup = BeautifulSoup(home_res.text, "html.parser")
        subtitles = home_soup.find_all("div", class_="sidenav-footer-subtitle")
        if len(subtitles) >= 1:
            reg_number = subtitles[0].get_text(strip=True)
        if len(subtitles) >= 2:
            student_name = subtitles[1].get_text(strip=True)
    except Exception:
        pass

    attendance_payload = {
        "iden": "9",
        "filter": "",
        "hdnFormDetails": "1",
    }

    attendance_res = await session.client.post(SRM_ATTENDANCE_URL, data=attendance_payload)
    print(f"[Attendance] status={attendance_res.status_code} url={attendance_res.url}")

    soup = BeautifulSoup(attendance_res.text, "html.parser")
    table = soup.find("table")

    if not table:
        return HTMLResponse("<h3>Attendance table not found.</h3>")

    header_row = table.find("tr")
    new_th = soup.new_tag("th")
    new_th.string = "Action"
    header_row.append(new_th)

    def req_attendance(present, total, percentage=75):
        return math.ceil((percentage * total - 100 * present) / (100 - percentage))

    def days_to_bunk(present, total, percentage=75):
        return math.floor((100 * present - percentage * total) / percentage)

    for row in table.find_all("tr")[1:]:
        cols = row.find_all("td")
        if len(cols) < 8:
            continue
        try:
            total = int(cols[2].text.strip())
            present = int(cols[3].text.strip())
        except ValueError:
            continue
        if "Total" in cols[0].text:
            continue

        percent = (present / total) * 100 if total else 0

        if percent >= 75:
            bunk = days_to_bunk(present, total, 75)
            action = f"Can bunk {bunk} hrs" if bunk > 0 else "Exactly at 75%"
            color = "#e6ffe6" if bunk > 0 else "#fff2cc"
        else:
            need = req_attendance(present, total, 75)
            action = f"Attend {need} hrs"
            color = "#ffe5e5"

        new_td = soup.new_tag("td")
        new_td.string = action
        new_td["style"] = f"background:{color}; font-weight:bold; text-align:center;"
        row.append(new_td)

    html_out = f"""
    <html>
    <head>
        <meta charset="utf-8"/>
        <title>OASYS Attendance</title>
        <style>
            body {{ font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; }}
            table {{ border-collapse: collapse; width: 100%; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: center; }}
            th {{ background-color: #003366; color: white; }}
        </style>
    </head>
    <body>
        <div id="oasys-student-name" style="display:none">{escape(student_name)}</div>
        <div id="oasys-reg-number" style="display:none">{escape(reg_number)}</div>
        <h2>📊 Course-wise Attendance</h2>
        {sanitize_table_html(table)}
    </body>
    </html>
    """

    return HTMLResponse(html_out)


@app.on_event("startup")
async def start_background_tasks():
    global _warm_needed
    _warm_needed = asyncio.Event()
    asyncio.create_task(_warm_loop())
    asyncio.create_task(cleanup_sessions())