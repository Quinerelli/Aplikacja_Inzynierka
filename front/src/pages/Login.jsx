// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import { login } from "../api/auth.js";

export default function Login() {
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        try {
            await login(email, password);
            setMessage("Zalogowano pomyślnie ✅");
            setTimeout(() => nav("/onboarding"), 400);
        } catch (err) {
            const msg = err?.response?.data?.error || "Błąd logowania";
            setMessage(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthCard
            title="Secret Clubhouse"
            subtitle="Enter the secret password to join the fun!"
        >
            <form className="auth-form" onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Parent's Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Secret Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <div className="auth-options">
                    <label>
                        <input type="checkbox" /> Remember me
                    </label>
                    <a href="#" className="auth-link small">
                        Forgot password?
                    </a>
                </div>

                <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? "Logging in..." : "Enter"}
                </button>

                {message && <p className="auth-message">{message}</p>}
            </form>

            <p className="auth-footer">
                Not in the club yet?{" "}
                <Link to="/register" className="auth-link">
                    Join Now!
                </Link>
            </p>
        </AuthCard>
    );
}
