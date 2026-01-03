// src/pages/Forgot.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function handleReset(e) {
    e.preventDefault();
    setMsg("");
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg("Reset email sent. Check your inbox.");
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="page-container">
      <h2>Forgot password</h2>
      <form onSubmit={handleReset}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send reset link</button>
      </form>
      <div className="small-link">
        <Link to="/login">Back to login</Link>
      </div>
      {msg && <div style={{ marginTop: 12, color: "#ffeb3b" }}>{msg}</div>}
    </div>
  );
}