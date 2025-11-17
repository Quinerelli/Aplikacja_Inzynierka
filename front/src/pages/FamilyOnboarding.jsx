// src/pages/FamilyOnboarding.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { me, createFamily, getMyFamilies } from "../api/auth.js";
import "../styles/FamilyOnboarding.css";

export default function FamilyOnboarding() {
    const nav = useNavigate();
    const [familyName, setFamilyName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [existingFamily, setExistingFamily] = useState(null);
    const [message, setMessage] = useState("");
    const [creating, setCreating] = useState(false);

    // po wejściu: sprawdzamy, czy user jest zalogowany i ma rodzinę
    useEffect(() => {
        async function load() {
            try {
                const meRes = await me();
                setUserEmail(meRes.data.user?.email || "");

                const famRes = await getMyFamilies();
                if (famRes.data.families && famRes.data.families.length > 0) {
                    setExistingFamily(famRes.data.families[0]);
                }
            } catch (err) {
                // jak nie zalogowany → na login
                nav("/login");
            }
        }
        load();
    }, [nav]);

    async function handleCreateFamily(e) {
        e.preventDefault();
        setMessage("");

        if (!familyName.trim()) {
            setMessage("Podaj nazwę rodziny 😊");
            return;
        }

        setCreating(true);
        try {
            const res = await createFamily(familyName.trim());
            setMessage(res.data.message || "Rodzina utworzona ✅");
            setTimeout(() => nav("/dashboard"), 600);
        } catch (err) {
            const msg =
                err?.response?.data?.error || "Nie udało się utworzyć rodziny";
            setMessage(msg);
        } finally {
            setCreating(false);
        }
    }

    function handleSkip() {
        nav("/dashboard");
    }

    return (
        <div className="fam-page">
            {/* HEADER */}
            <header className="fam-header">
                <div className="fam-header-left">
                    <div className="fam-logo-icon" />
                    <span className="fam-logo-text">FamilyHub</span>
                </div>

                <nav className="fam-nav">
                    <button
                        type="button"
                        className="fam-nav-link fam-nav-link-active"
                        onClick={() => nav("/dashboard")}
                    >
                        Dashboard
                    </button>
                    <button type="button" className="fam-nav-link">
                        Chores
                    </button>
                    <button type="button" className="fam-nav-link">
                        Finances
                    </button>
                    <button type="button" className="fam-nav-link">
                        Calendar
                    </button>
                </nav>

                <div className="fam-header-right">
                    <div className="fam-bell" />
                    <div className="fam-user-avatar">
                        {userEmail ? userEmail[0]?.toUpperCase() : "U"}
                    </div>
                </div>
            </header>

            {/* MAIN CARD */}
            <main className="fam-main">
                <section className="fam-card">
                    <div className="fam-card-head">
                        <div>
                            <h1 className="fam-title">Create Your Family Profile</h1>
                            <p className="fam-subtitle">
                                Make it fun! Add everyone, pick cool avatars, and choose your
                                favorite colors.
                            </p>
                            {existingFamily && (
                                <p className="fam-existing">
                                    You already belong to{" "}
                                    <strong>{existingFamily.families?.name}</strong> as{" "}
                                    <strong>{existingFamily.role}</strong>.
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            className="fam-skip"
                            onClick={handleSkip}
                        >
                            Skip for now
                        </button>
                    </div>

                    <form className="fam-form" onSubmit={handleCreateFamily}>
                        {/* Family name */}
                        <div className="fam-field">
                            <label className="fam-label">Family Name</label>
                            <input
                                className="fam-input"
                                type="text"
                                placeholder="e.g. The Super Millers"
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                            />
                        </div>

                        {/* Members – tylko UI (jak na makiecie) */}
                        <div className="fam-section">
                            <h2 className="fam-section-title">Family Members</h2>
                            <div className="fam-members-grid">
                                {/* przykładowe 2 karty + jedna pusta */}
                                <div className="fam-member-card">
                                    <div className="fam-member-avatar fam-member-avatar-green">
                                        SD
                                    </div>
                                    <div className="fam-member-name">Super Dad</div>
                                    <div className="fam-member-role-row">
                                        <span className="fam-color-dot fam-color-dot-green" />
                                        <select className="fam-role-select" disabled>
                                            <option>Parent</option>
                                        </select>
                                    </div>
                                    <div className="fam-member-icons">
                                        <span>⭐</span>
                                        <span>🛡️</span>
                                        <span>💙</span>
                                    </div>
                                </div>

                                <div className="fam-member-card">
                                    <div className="fam-member-avatar fam-member-avatar-pink">
                                        WM
                                    </div>
                                    <div className="fam-member-name">Wonder Mom</div>
                                    <div className="fam-member-role-row">
                                        <span className="fam-color-dot fam-color-dot-pink" />
                                        <select className="fam-role-select" disabled>
                                            <option>Parent</option>
                                        </select>
                                    </div>
                                    <div className="fam-member-icons">
                                        <span>🌸</span>
                                        <span>💜</span>
                                        <span>🍃</span>
                                    </div>
                                </div>

                                <div className="fam-member-card fam-member-card-empty">
                                    <div className="fam-add-circle">+</div>
                                    <div className="fam-add-text">Add New Member</div>
                                </div>
                            </div>
                        </div>

                        {/* STOPKA */}
                        <div className="fam-footer">
                            {message && <p className="fam-message">{message}</p>}
                            <button
                                type="submit"
                                className="fam-primary-btn"
                                disabled={creating}
                            >
                                {creating ? "Creating..." : "Create Family"}
                            </button>
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
}
