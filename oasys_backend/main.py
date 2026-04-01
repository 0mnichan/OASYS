from fastapi import FastAPI, Form, Response, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from bs4 import BeautifulSoup
from urllib.parse import urlencode
from html import escape as html_escape
import base64
import random
import re
import math
import os
import asyncio
import time
from collections import deque
from sessions import create_session, get_session, get_session_count, cleanup_sessions, Session, register_session
from utils import parse_hidden_fields

MAX_SESSIONS = 500
MAX_FIELD_LENGTH = 256
RESERVED_USER_IDS = {"__warm__", "__health__"}

app = FastAPI()

ALLOWED_ORIGINS = os.environ.get("OASYS_ALLOWED_ORIGINS", "").split(",")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()]

if ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

# Simple in-memory rate limiter: tracks (ip -> list of timestamps)
_rate_limit: dict[str, deque] = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 15     # max requests per window per IP for auth endpoints

frontend_path = os.path.join(os.path.dirname(__file__), "../oasys_frontend/dist")

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


ALLOWED_TABLE_TAGS = {"table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col"}
ALLOWED_TABLE_ATTRS = {"style", "class", "colspan", "rowspan"}


def sanitize_table(table_tag) -> str:
    """Strip all tags/attrs from a BeautifulSoup table except safe table elements."""
    for tag in table_tag.find_all(True):
        if tag.name not in ALLOWED_TABLE_TAGS:
            tag.unwrap()
        else:
            attrs = dict(tag.attrs)
            for attr in attrs:
                if attr not in ALLOWED_TABLE_ATTRS:
                    del tag[attr]
            # Escape text content to prevent injection via cell values
            for string in tag.strings:
                pass  # BeautifulSoup NavigableString is already escaped on str()
    return str(table_tag)


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


def _check_rate_limit(request: Request) -> bool:
    """Returns True if the request should be rate-limited (rejected)."""
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    timestamps = _rate_limit.setdefault(ip, deque())
    # Purge old entries
    while timestamps and timestamps[0] < now - RATE_LIMIT_WINDOW:
        timestamps.popleft()
    if len(timestamps) >= RATE_LIMIT_MAX:
        return True
    timestamps.append(now)
    return False


def _validate_field(value: str, name: str) -> str | None:
    """Returns an error message if the field is invalid, else None."""
    if len(value) > MAX_FIELD_LENGTH:
        return f"{name} exceeds maximum length"
    return None


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
        return JSONResponse({"status": "fail", "reason": str(e)}, status_code=503)
    finally:
        await sess.close()


@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_spa(full_path: str):
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return Response(content="Frontend not built yet", media_type="text/plain", status_code=404)


@app.post("/start_login/")
async def start_login(request: Request, user_id: str = Form(...)):
    if _check_rate_limit(request):
        return JSONResponse({"error": "Too many requests. Try again later."}, status_code=429)
    if user_id in RESERVED_USER_IDS:
        return JSONResponse({"error": "Invalid user ID"}, status_code=400)
    if len(get_session_count()) >= MAX_SESSIONS and not get_session(user_id):
        return JSONResponse({"error": "Server busy. Try again later."}, status_code=503)
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
    session = await create_session(user_id)
    login_page = await session.client.get(SRM_LOGIN_URL, headers=BROWSER_HEADERS)
    session.login_page_html = login_page.text

    try:
        result = await get_captcha(session, login_page.text)
        session.captcha_image = result["captcha_image"]
        return JSONResponse(result)
    except Exception as e:
        print(f"Captcha fetch failed: {e}")
        return JSONResponse({"error": "Could not load captcha from SRM. Try again."}, status_code=503)


@app.post("/refresh_captcha/")
async def refresh_captcha(request: Request, user_id: str = Form(...)):
    if _check_rate_limit(request):
        return JSONResponse({"error": "Too many requests. Try again later."}, status_code=429)
    session = get_session(user_id)
    if not session:
        return JSONResponse({"error": "Session invalid"}, status_code=400)

    login_page = await session.client.get(SRM_LOGIN_URL, headers=BROWSER_HEADERS)
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
    request: Request,
    user_id: str = Form(...),
    netid: str = Form(...),
    password: str = Form(...),
    captcha: str = Form(...),
):
    if _check_rate_limit(request):
        return JSONResponse({"error": "Too many requests. Try again later."}, status_code=429)
    for field_name, field_val in [("netid", netid), ("password", password), ("captcha", captcha)]:
        err = _validate_field(field_val, field_name)
        if err:
            return JSONResponse({"error": err}, status_code=400)
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
        print(f"[Login] Failed \u2014 user_id={user_id}")
        return HTMLResponse("<h3>Login failed</h3>", status_code=401)

    print(f"[Login] Success \u2014 user_id={user_id}")

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
        <div id="oasys-student-name" style="display:none">{html_escape(student_name)}</div>
        <div id="oasys-reg-number" style="display:none">{html_escape(reg_number)}</div>
        <h2>\ud83d\udcca Course-wise Attendance</h2>
        {sanitize_table(table)}
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
