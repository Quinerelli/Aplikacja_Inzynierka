import React from "react";
import "../styles/Auth.css";

export default function AuthCard({ title, subtitle, children }) {
    return (
        <div className="auth-bg">
            {/* Logo */}
            <div className="auth-logo">
                <div className="logo-icon"></div>
                <span className="logo-text">FamilyHub</span>
            </div>

            {/* Karta logowania */}
            <div className="auth-card">
                <h2 className="auth-title">{title}</h2>
                <p className="auth-subtitle">{subtitle}</p>
                {children}
            </div>
        </div>
    );
}
