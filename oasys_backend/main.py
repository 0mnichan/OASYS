from fastapi import FastAPI, Form, Response
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from base64 import b64encode
from bs4 import BeautifulSoup
import math
import os
import asyncio
from sessions import create_session, get_session, cleanup_sessions
from utils import parse_hidden_fields

app = FastAPI()

frontend_path = os.path.join(os.path.dirname(__file__), "../oasys_frontend/dist")

app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

SRM_BASE_URL = "https://sp.srmist.edu.in/srmiststudentportal"
SRM_LOGIN_URL = f"{SRM_BASE_URL}/students/loginManager/youLogin.jsp"
SRM_CAPTCHA_URL = f"{SRM_BASE_URL}/captchas"
SRM_ATTENDANCE_URL = f"{SRM_BASE_URL}/students/report/studentAttendanceDetails.jsp"
SRM_HOME_URL = f"{SRM_BASE_URL}/students/loginManager/UserHomePage.jsp"


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
    return Response(content="Frontend not built yet", media_type="text/plain", status_code=404)


@app.post("/start_login/")
async def start_login(user_id: str = Form(...)):
    session = await create_session(user_id)
    _ = await session.client.get(SRM_LOGIN_URL)
    captcha_res = await session.client.get(SRM_CAPTCHA_URL)
    session.captcha_image = b64encode(captcha_res.content).decode()
    return JSONResponse({"captcha_image": session.captcha_image})


@app.post("/refresh_captcha/")
async def refresh_captcha(user_id: str = Form(...)):
    session = get_session(user_id)
    if not session:
        return JSONResponse({"error": "Session invalid"}, status_code=400)
    captcha_res = await session.client.get(SRM_CAPTCHA_URL)
    session.captcha_image = b64encode(captcha_res.content).decode()
    return JSONResponse({"captcha_image": session.captcha_image})


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

    login_page = await session.client.get(SRM_LOGIN_URL)
    hidden_fields = parse_hidden_fields(login_page.text)
    csrf_value = hidden_fields.get("hdnCSRF", "")

    payload = {
        "login": netid,
        "passwd": password,
        "ccode": captcha,
        "txtAN": netid,
        "txtSK": password,
        "hdnCaptcha": captcha,
        "csrfPreventionSalt": csrf_value,
        "_tries": "1",
        "txtPageAction": "1",
        "hdnCSRF": csrf_value,
    }

    login_res = await session.client.post(SRM_LOGIN_URL, data=payload)
    if login_res.status_code >= 400:
        return HTMLResponse("<h3>Login failed</h3>", status_code=401)

    # Fetch home page to get student name and reg number
    # From the HTML: first sidenav-footer-subtitle = reg number, second = name
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
        pass  # frontend falls back to netid

    attendance_payload = {
        "iden": "9",
        "filter": "",
        "hdnFormDetails": "1",
        "csrfPreventionSalt": csrf_value,
    }
    attendance_res = await session.client.post(SRM_ATTENDANCE_URL, data=attendance_payload)

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
        if present < 0 or total <= 0 or present > total:
            action = "Invalid values"
            color = "#ffcccc"
        elif percent >= 75:
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