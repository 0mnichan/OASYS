import httpx, asyncio, uuid, time

# in-memory session store (RAM only)
_sessions = {}

# sessions expire after 15 min of inactivity
SESSION_TTL = 900  # seconds


class Session:
    def __init__(self, user_id):
        self.user_id = user_id
        self.session_id = str(uuid.uuid4())
        self.created = time.time()
        self.last_used = time.time()
        self.client = httpx.AsyncClient(headers={"User-Agent": "OASYS/1.0"})
        self.captcha_image = None

    async def close(self):
        await self.client.aclose()


async def create_session(user_id):
    # Remove existing if any
    old = _sessions.pop(user_id, None)
    if old:
        await old.close()

    sess = Session(user_id)
    _sessions[user_id] = sess
    print(f"[+] New session for {user_id}")
    return sess


def get_session(user_id):
    sess = _sessions.get(user_id)
    if not sess:
        return None

    # Expire after TTL
    if time.time() - sess.last_used > SESSION_TTL:
        try:
            asyncio.create_task(sess.close())
        except:
            pass
        _sessions.pop(user_id, None)
        print(f"[x] Session expired for {user_id}")
        return None

    sess.last_used = time.time()
    return sess


async def cleanup_sessions():
    """Run periodically to remove old sessions"""
    while True:
        now = time.time()
        expired = [uid for uid, s in _sessions.items() if now - s.last_used > SESSION_TTL]
        for uid in expired:
            try:
                await _sessions[uid].close()
            except:
                pass
            _sessions.pop(uid, None)
            print(f"[x] Cleaned expired session for {uid}")
        await asyncio.sleep(300)  # check every 5 mins
