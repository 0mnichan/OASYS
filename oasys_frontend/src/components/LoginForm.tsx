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
        sessionStorage.setItem("attendanceHTML", html);
        sessionStorage.setItem("oasys_netid", netid);
        navigate("/dashboard");
      } else {
        setError("Login failed — check credentials or captcha.");
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
    fetchCaptcha(true);
  }, []);

  return (
    <div className="flex justify-center mt-4 mb-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 shadow-xl rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors">
        <h1 className="text-2xl font-semibold text-center mb-5 text-gray-900 dark:text-white">
          Sign In
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-100 dark:bg-red-600/20 p-2 rounded text-center">
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder="SRM NetID"
            value={netid}
            onChange={(e) => setNetid(e.target.value)}
            className="w-full p-2 border rounded-md bg-gray-50 text-gray-900 placeholder:text-gray-500 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 transition 
                       dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            autoComplete="username"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded-md bg-gray-50 text-gray-900 placeholder:text-gray-500 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 transition 
                       dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            autoComplete="current-password"
          />

          {/* Captcha Box */}
          <div className="flex items-center justify-between border rounded-md bg-gray-50 dark:bg-gray-800 p-2">
            {captchaLoading ? (
              <div className="h-10 w-24 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : captchaImg ? (
              <img
                src={captchaImg}
                alt="Captcha"
                className="h-10 w-auto rounded-md border bg-white dark:bg-gray-900"
              />
            ) : (
              <div className="h-10 w-24 border rounded bg-gray-100 dark:bg-gray-700" />
            )}

            <button
              type="button"
              onClick={refreshCaptcha}
              className="text-sm px-2 py-1 rounded-md text-blue-600 hover:bg-blue-50 
                         dark:text-blue-400 dark:hover:bg-gray-700 transition"
              disabled={captchaLoading}
            >
              Change
            </button>
          </div>

          <input
            type="text"
            placeholder="Enter the captcha code"
            value={captcha}
            onChange={(e) => setCaptcha(e.target.value)}
            className="w-full p-2 border rounded-md bg-gray-50 text-gray-900 placeholder:text-gray-500 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 transition 
                       dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 
                       transition disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {loading ? "Logging in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
