// src/pages/Register.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import { signup } from "../api/auth.js";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        try {
            const res = await signup(email, password);
            setMessage(res.data.message || "Konto utworzone, sprawdź e-mail.");
        } catch (err) {
            const msg = err?.response?.data?.error || "Błąd rejestracji";
            setMessage(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthCard
            title="Join FamilyHub"
            subtitle="Create your account and start organizing your family life!"
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

                <button
                    type="submit"
                    className="auth-button green"
                    disabled={loading}
                >
                    {loading ? "Creating..." : "Get Started"}
                </button>

                {message && <p className="auth-message">{message}</p>}
            </form>

            <p className="auth-footer">
                Already have an account?{" "}
                <Link to="/login" className="auth-link orange">
                    Log in
                </Link>
            </p>
        </AuthCard>
    );
}
