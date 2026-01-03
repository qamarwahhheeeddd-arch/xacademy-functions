// src/pages/Login.jsx
import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { loginWithEmail } from "../firebase";
import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithRedirect } from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // ---------------- EMAIL LOGIN ----------------
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      await loginWithEmail(email, password);
      setMsg("Login successful!");
      navigate(from, { replace: true });
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------------- GOOGLE LOGIN (REDIRECT) ----------------
  async function handleGoogle() {
    setLoading(true);
    setMsg("");

    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider); // ✅ redirect-based login
    } catch (err) {
      setMsg(err.message);
      setLoading(false); // redirect won't return here, but safe fallback
    }
  }

  return (
    <div className="page-container">
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : "Login"}
        </button>
      </form>

      <button
        onClick={handleGoogle}
        disabled={loading}
        style={{ marginTop: 10 }}
      >
        Continue with Google
      </button>

      <div className="small-link">
        <Link to="/forgot">Forgot password?</Link>
      </div>

      <div className="small-link">
        New here? <Link to="/signup">Create account</Link>
      </div>

      {msg && (
        <div style={{ marginTop: 12, color: "#ffeb3b" }}>
          {msg}
        </div>
      )}
    </div>
  );
}