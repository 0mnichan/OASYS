import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = ""; // leave empty - relative calls to same origin

const getOrCreateUserId = () => {
  const key = "oasys_user_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem(key, id);
  }
  return id;
};

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [netid, setNetid] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaImg, setCaptchaImg] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = React.useMemo(() => getOrCreateUserId(), []);

  const fetchCaptcha = async (start = false) => {
    setCaptchaLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/start_login/`, {
        method: "POST",
        body: new URLSearchParams({ user_id: userId }),
      });
      if (!res.ok) throw new Error("Failed to get captcha");
      const data = await res.json();
      setCaptchaImg(`data:image/png;base64,${data.captcha_image}`);
      if (start) setCaptcha("");
    } catch (err: any) {
      console.error("fetchCaptcha:", err);
      setError("Could not load captcha. Try again.");
    } finally {
      setCaptchaLoading(false);
    }
  };

  const refreshCaptcha = async () => {
    setCaptchaLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/refresh_captcha/`, {
        method: "POST",
        body: new URLSearchParams({ user_id: userId }),
      });
      if (!res.ok) throw new Error("Failed to refresh captcha");
      const data = await res.json();
      setCaptchaImg(`data:image/png;base64,${data.captcha_image}`);
      setCaptcha("");
    } catch (err: any) {
      console.error("refreshCaptcha:", err);
      setError("Could not refresh captcha. Try again.");
    } finally {
      setCaptchaLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!netid || !password || !captcha) {
      setError("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/submit_login/`, {
        method: "POST",
        body: new URLSearchParams({
          user_id: userId,
          netid,
          password,
          captcha,
        }),
      });

      const html = await res.text();

      if (res.ok) {
        // store HTML for dashboard parsing
        sessionStorage.setItem("attendanceHTML", html);
        // optional: store netid so dashboard can say "Welcome, <netid>"
        sessionStorage.setItem("oasys_netid", netid);
        navigate("/dashboard");
      } else {
        // backend returns HTMLResponse error messages; show small message
        setError("Login failed — check credentials or captcha.");
        // reload a fresh captcha
        await fetchCaptcha();
      }
    } catch (err: any) {
      console.error("submit_login:", err);
      setError("Network error. Try again.");
      await fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If there's already an attendance HTML (from earlier), prefer fresh captcha start
    fetchCaptcha(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}

      <div>
        <input
          type="text"
          placeholder="SRM NetID"
          value={netid}
          onChange={(e) => setNetid(e.target.value)}
          className="w-full p-2 border rounded"
          autoComplete="username"
        />
      </div>

      <div>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          autoComplete="current-password"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          {captchaLoading ? (
            <div className="h-10 w-24 flex items-center justify-center border rounded bg-muted-foreground/5 text-xs">
              Loading...
            </div>
          ) : captchaImg ? (
            // Use img with alt; if data URL is invalid, browser will show broken image
            <img src={captchaImg} alt="captcha" className="h-10 border rounded" />
          ) : (
            <div className="h-10 w-24 border rounded bg-muted-foreground/5" />
          )}
          <button
            type="button"
            onClick={refreshCaptcha}
            className="px-2 py-1 border rounded text-sm"
            disabled={captchaLoading}
          >
            ↻
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Enter captcha"
        value={captcha}
        onChange={(e) => setCaptcha(e.target.value)}
        className="w-full p-2 border rounded"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-2 rounded-md"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
};

export default LoginForm;
