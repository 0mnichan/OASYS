from fastapi import FastAPI, Form, Response
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from bs4 import BeautifulSoup
import re
import math
import os
import asyncio
import httpx
from sessions import create_session, get_session, cleanup_sessions

app = FastAPI()

frontend_path = os.path.join(os.path.dirname(__file__), "../oasys_frontend/dist")

app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

SRM_BASE_URL       = "https://sp.srmist.edu.in/srmiststudentportal"
SRM_LOGIN_URL      = f"{SRM_BASE_URL}/students/loginManager/youLogin.jsp"
SRM_ATTENDANCE_URL = f"{SRM_BASE_URL}/students/report/studentAttendanceDetails.jsp"
SRM_HOME_URL       = f"{SRM_BASE_URL}/students/loginManager/UserHomePage.jsp"

CAPTCHA_BROWSER_HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Referer": SRM_LOGIN_URL,
    "Accept": "text/plain, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
}


def extract_captcha_text(login_page_html: str) -> str | None:
    match = re.search(r'class="captcha-text"[^>]*>([^<]+)<', login_page_html)
    return match.group(1).strip() if match else None


def extract_captcha_url(login_page_html: str) -> str | None:
    match = re.search(r'const CAPTCHA_URL\s*=\s*["\']([^"\']+)["\']', login_page_html)
    return f"https://sp.srmist.edu.in{match.group(1)}" if match else None


async def fetch_captcha_with_retry(session, login_page_html: str, retries: int = 4, delay: float = 1.0) -> str:
    captcha_url = extract_captcha_url(login_page_html)
    if not captcha_url:
        raise ValueError("Could not find CAPTCHA_URL in login page HTML")

    last_exc = None

    for attempt in range(retries):
        try:
            res = await session.client.get(captcha_url, timeout=10.0, headers=CAPTCHA_BROWSER_HEADERS)
            res.raise_for_status()
            return res.text.strip()

        except (httpx.ReadError, httpx.ConnectError, httpx.TimeoutException) as e:
            last_exc = e
            if attempt < retries - 1:
                await asyncio.sleep(delay * (attempt + 1))
            continue

        except Exception as e:
            raise e

    raise last_exc


async def get_captcha(session, login_page_html: str) -> dict:
    text = extract_captcha_text(login_page_html)

    if text:
        print(f"[Captcha] Plain text mode: '{text}'")
        return {"captcha_image": None, "captcha_solved": text}

    print("[Captcha] Image mode")

    b64 = await fetch_captcha_with_retry(session, login_page_html)

    return {
        "captcha_image": b64,
        "captcha_solved": None
    }


@app.api_route("/stat", methods=["GET", "HEAD"])
async def stat():
    return Response(content="OASYS backend alive", media_type="text/plain")


@app.api_route("/ping", methods=["GET", "HEAD"])
async def ping():
    return Response(content="pong", media_type="text/plain")


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    return FileResponse(os.path.join(frontend_path, "index.html"))


@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_spa(full_path: str):
    index_file = os.path.join(frontend_path, "index.html")

    if os.path.exists(index_file):
        return FileResponse(index_file)

    return Response(
        content="Frontend not built yet",
        media_type="text/plain",
        status_code=404
    )


@app.post("/start_login/")
async def start_login(user_id: str = Form(...)):
    session = await create_session(user_id)

    login_page = await session.client.get(SRM_LOGIN_URL)

    session.login_page_html = login_page.text

    try:
        result = await get_captcha(session, login_page.text)

        session.captcha_image = result["captcha_image"]

        return JSONResponse(result)

    except Exception as e:
        print(f"Captcha fetch failed: {e}")

        return JSONResponse(
            {"error": "Could not load captcha from SRM. Try again."},
            status_code=503
        )


@app.post("/refresh_captcha/")
async def refresh_captcha(user_id: str = Form(...)):
    session = get_session(user_id)

    if not session:
        return JSONResponse({"error": "Session invalid"}, status_code=400)

    login_page = await session.client.get(SRM_LOGIN_URL)

    session.login_page_html = login_page.text

    try:
        result = await get_captcha(session, login_page.text)

        session.captcha_image = result["captcha_image"]

        return JSONResponse(result)

    except Exception as e:
        print(f"Captcha refresh failed: {e}")

        return JSONResponse(
            {"error": "Could not refresh captcha. Try again."},
            status_code=503
        )


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

    payload = {
        "login": netid,
        "passwd": password,
        "ccode": captcha,
        "txtPageAction": "0",
    }

    print(f"[Login] payload={payload}")

    login_res = await session.client.post(SRM_LOGIN_URL, data=payload)

    print(f"[Login] status={login_res.status_code}")
    print(f"[Login] response body=\n{login_res.text[:2000]}")

    if login_res.status_code >= 400:
        return HTMLResponse("<h3>Login failed</h3>", status_code=401)

    student_name = ""
    reg_number = ""

    try:
        home_res = await session.client.get(SRM_HOME_URL)

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

    attendance_res = await session.client.post(
        SRM_ATTENDANCE_URL,
        data=attendance_payload
    )

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
        <div id="oasys-student-name" style="display:none">{student_name}</div>
        <div id="oasys-reg-number" style="display:none">{reg_number}</div>

        <h2>📊 Course-wise Attendance</h2>

        {str(table)}

    </body>
    </html>
    """

    return HTMLResponse(html_out)


@app.on_event("startup")
async def start_cleanup():
    asyncio.create_task(cleanup_sessions())