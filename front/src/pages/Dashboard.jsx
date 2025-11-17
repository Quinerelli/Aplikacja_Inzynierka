// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { me, logout } from "../api/auth.js";

export default function Dashboard() {
    const nav = useNavigate();
    const [userEmail, setUserEmail] = useState("");

    useEffect(() => {
        me()
            .then((res) => setUserEmail(res.data.user?.email || ""))
            .catch(() => nav("/login"));
    }, [nav]);

    async function handleLogout() {
        await logout();
        nav("/login");
    }

    return (
        <div style={{ minHeight: "100vh", background: "#f6fff9", padding: "30px" }}>
            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "30px",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                        style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "8px",
                            backgroundColor: "#00c97e",
                        }}
                    />
                    <span style={{ fontWeight: 700, fontSize: "20px" }}>FamilyHub</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    {userEmail && (
                        <span style={{ fontSize: "14px", color: "#555" }}>{userEmail}</span>
                    )}
                    <button
                        onClick={handleLogout}
                        style={{
                            background: "transparent",
                            border: "1px solid #ccc",
                            borderRadius: "999px",
                            padding: "6px 14px",
                            cursor: "pointer",
                            fontSize: "13px",
                        }}
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main>
                <h1 style={{ fontSize: "24px", marginBottom: "10px" }}>
                    Welcome back 👋
                </h1>
                <p style={{ color: "#666", marginBottom: "24px" }}>
                    Here you’ll manage your family tasks, expenses and rewards.
                </p>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: "18px",
                    }}
                >
                    <div
                        style={{
                            background: "white",
                            borderRadius: "18px",
                            padding: "18px",
                            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                        }}
                    >
                        <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>
                            Household tasks
                        </h2>
                        <p style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
                            Create tasks, assign them to family members and track progress.
                        </p>
                        <button
                            style={{
                                background: "#ff7b00",
                                color: "white",
                                border: "none",
                                borderRadius: "999px",
                                padding: "8px 16px",
                                fontSize: "14px",
                                cursor: "pointer",
                            }}
                        >
                            Go to tasks (later)
                        </button>
                    </div>

                    <div
                        style={{
                            background: "white",
                            borderRadius: "18px",
                            padding: "18px",
                            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                        }}
                    >
                        <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>
                            Family finances
                        </h2>
                        <p style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
                            Add shared expenses and keep track of your home budget.
                        </p>
                        <button
                            style={{
                                background: "#04bb7a",
                                color: "white",
                                border: "none",
                                borderRadius: "999px",
                                padding: "8px 16px",
                                fontSize: "14px",
                                cursor: "pointer",
                            }}
                        >
                            Go to finances (later)
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
