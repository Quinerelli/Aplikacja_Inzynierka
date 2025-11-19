// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { me, getMyFamilies } from "../api/auth.js";
import "../styles/Dashboard.css";

export default function Dashboard() {
    const nav = useNavigate();
    const [userEmail, setUserEmail] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const meRes = await me();
                const user = meRes.data.user;
                if (!user) {
                    nav("/login");
                    return;
                }
                setUserEmail(user.email || "");

                const skip = localStorage.getItem("fh_skip_onboarding") === "1";
                const famRes = await getMyFamilies();
                const hasFamily =
                    Array.isArray(famRes.data.families) &&
                    famRes.data.families.length > 0;

                if (!hasFamily && !skip) {
                    nav("/onboarding");
                }
            } catch (err) {
                console.error("dashboard load error", err);
                nav("/login");
            }
        }

        load();
    }, [nav]);

    return (
        <div className="dash-page">
            <main className="dash-main">
                <h1 className="dash-main-title">Welcome back 👋</h1>
                <p className="dash-main-subtitle">
                    Here you’ll manage your family tasks, expenses and rewards.
                </p>

                <div className="dash-grid">
                    <section className="dash-card">
                        <h2 className="dash-card-title">Household tasks</h2>
                        <p className="dash-card-text">
                            Create tasks, assign them to family members and track progress.
                        </p>
                        <button className="dash-card-btn dash-card-btn-primary">
                            Go to tasks (later)
                        </button>
                    </section>

                    <section className="dash-card">
                        <h2 className="dash-card-title">Family finances</h2>
                        <p className="dash-card-text">
                            Add shared expenses and keep track of your home budget.
                        </p>
                        <button className="dash-card-btn dash-card-btn-secondary">
                            Go to finances (later)
                        </button>
                    </section>
                </div>
            </main>
        </div>
    );
}
