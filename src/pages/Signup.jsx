// src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupWithEmail, loginWithGoogle } from "../firebase";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      await signupWithEmail(email, password);
      setMsg("Account created!");
      navigate("/", { replace: true });
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setMsg("");

    try {
      // Redirect-based Google login (works in Trust Wallet)
      await loginWithGoogle();
      // No navigate() or setMsg() here — redirect will take over
    } catch (err) {
      setMsg(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <h2>Signup</h2>

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
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : "Create account"}
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
        Already have account? <Link to="/login">Login</Link>
      </div>

      {msg && (
        <div style={{ marginTop: 12, color: "#ffeb3b" }}>
          {msg}
        </div>
      )}
    </div>
  );
}