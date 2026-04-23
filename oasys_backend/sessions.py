import asyncio
import uuid
import time

try:
    from curl_cffi.requests import AsyncSession as CurlAsyncSession
    from curl_cffi.curl import CurlOpt
    CURL_CFFI_AVAILABLE = True
except ImportError:
    import httpx
    CURL_CFFI_AVAILABLE = False
    print("[!] curl_cffi not available, falling back to httpx")

_sessions = {}

SESSION_TTL = 900


class Session:
    def __init__(self, user_id):
        self.user_id = user_id
        self.session_id = str(uuid.uuid4())
        self.created = time.time()
        self.last_used = time.time()
        self.login_page_html = ""
        self.captcha_image = None

        if CURL_CFFI_AVAILABLE:
            self.client = CurlAsyncSession(
                impersonate="chrome124",
                curl_options={CurlOpt.IPRESOLVE: 1},  # force IPv4, avoids IPv6 DNS timeouts
            )
        else:
            self.client = httpx.AsyncClient(headers={"User-Agent": "OASYS/1.0"})

    async def close(self):
        try:
            if CURL_CFFI_AVAILABLE:
                await self.client.close()
            else:
                await self.client.aclose()
        except Exception:
            pass


async def create_session(user_id):
    old = _sessions.pop(user_id, None)
    if old:
        await old.close()

    sess = Session(user_id)
    _sessions[user_id] = sess
    print(f"[+] New session for {user_id} (curl_cffi={CURL_CFFI_AVAILABLE})")
    return sess


def get_session(user_id):
    sess = _sessions.get(user_id)
    if not sess:
        return None

    if time.time() - sess.last_used > SESSION_TTL:
        try:
            asyncio.create_task(sess.close())
        except Exception:
            pass
        _sessions.pop(user_id, None)
        print(f"[x] Session expired for {user_id}")
        return None

    sess.last_used = time.time()
    return sess


def register_session(user_id, session):
    session.user_id = user_id
    _sessions[user_id] = session


async def cleanup_sessions():
    while True:
        now = time.time()
        expired = [uid for uid, s in _sessions.items() if now - s.last_used > SESSION_TTL]
        for uid in expired:
            try:
                await _sessions[uid].close()
            except Exception:
                pass
            _sessions.pop(uid, None)
            print(f"[x] Cleaned expired session for {uid}")
        await asyncio.sleep(300)