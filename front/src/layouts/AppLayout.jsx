import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { me, logout } from "../api/auth.js";
import "../styles/Layout.css";

export default function AppLayout() {
    const nav = useNavigate();
    const [userEmail, setUserEmail] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const res = await me();
                if (!res.data.user) {
                    nav("/login");
                    return;
                }
                setUserEmail(res.data.user.email || "");
            } catch {
                nav("/login");
            }
        }
        load();
    }, [nav]);

    async function handleLogout() {
        try {
            await logout();
        } finally {
            nav("/login");
        }
    }

    return (
        <div className="app-layout">
            <header className="app-header">

                {/* LEWA STRONA */}
                <div className="app-header-left">
                    <div className="app-logo-icon" />
                    <span className="app-logo-text">FamilyHub</span>

                    <nav className="app-nav">
                        <NavLink to="/dashboard" className="app-nav-link">Dashboard</NavLink>
                        <NavLink to="/chores" className="app-nav-link">Chores</NavLink>
                        <NavLink to="/finances" className="app-nav-link">Finances</NavLink>
                        <NavLink to="/calendar" className="app-nav-link">Calendar</NavLink>
                    </nav>
                </div>

                {/* PRAWA STRONA */}
                <div className="app-header-right">
                    {userEmail && <span className="app-user-email">{userEmail}</span>}

                    <div className="app-user-avatar">
                        {userEmail ? userEmail[0]?.toUpperCase() : "U"}
                    </div>

                    <button className="app-logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="app-main">
                <Outlet />
            </main>
        </div>
    );
}
