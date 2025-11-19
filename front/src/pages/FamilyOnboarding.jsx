// src/pages/FamilyOnboarding.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { me, createFamily, getMyFamilies, logout } from "../api/auth.js";
import "../styles/FamilyOnboarding.css";

// losowy kolor avatara
function randomColor() {
    const colors = ["#00c97e", "#ff7ab7", "#6A8FF7", "#F7C948", "#FF9F40", "#4AD1F7"];
    return colors[Math.floor(Math.random() * colors.length)];
}

// inicjały z imienia
function getInitials(name) {
    if (!name) return "?";
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export default function FamilyOnboarding() {
    const nav = useNavigate();
    const [familyName, setFamilyName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [userId, setUserId] = useState(null);
    const [members, setMembers] = useState([]);
    const [message, setMessage] = useState("");
    const [creating, setCreating] = useState(false);

    // po wejściu: jeśli user ma już rodzinę LUB kliknął „skip”, od razu na dashboard
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
                setUserId(user.id);

                const skip = localStorage.getItem("fh_skip_onboarding") === "1";
                const famRes = await getMyFamilies();
                const families = famRes.data.families || [];
                const hasFamily = families.length > 0;

                if (hasFamily || skip) {
                    nav("/dashboard");
                    return;
                }

                // pierwsza karta – zalogowany użytkownik jako parent
                const ownerName = (user.email || "").split("@")[0] || "You";
                setMembers([
                    {
                        id: crypto.randomUUID(),
                        name: ownerName,
                        role: "parent",
                        avatarColor: "#00c97e",
                        user_id: user.id,
                    },
                ]);
            } catch (err) {
                nav("/login");
            }
        }

        load();
    }, [nav]);

    // dodaj członka
    function handleAddMember() {
        const newMember = {
            id: crypto.randomUUID(),
            name: "",
            role: "child",
            avatarColor: randomColor(),
            user_id: null,
        };
        setMembers((prev) => [...prev, newMember]);
    }

    // edytuj członka
    function updateMember(id, patch) {
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    }

    // usuń członka (nie usuwamy właściciela konta)
    function deleteMember(id) {
        const found = members.find((m) => m.id === id);
        if (found?.user_id) {
            setMessage("Nie możesz usunąć administratora rodziny 😊");
            return;
        }
        setMembers((prev) => prev.filter((m) => m.id !== id));
    }

    async function handleCreateFamily(e) {
        e.preventDefault();
        setMessage("");

        if (!familyName.trim()) {
            setMessage("Podaj nazwę rodziny 😊");
            return;
        }

        if (members.length === 0) {
            setMessage("Dodaj przynajmniej jednego członka rodziny");
            return;
        }

        const hasEmptyName = members.some((m) => !m.name.trim());
        if (hasEmptyName) {
            setMessage("Uzupełnij imiona wszystkich członków");
            return;
        }

        setCreating(true);
        try {
            const payloadMembers = members.map((m) => ({
                name: m.name,
                role: m.role,
                avatar_color: m.avatarColor,
                user_id: m.user_id,
            }));

            const res = await createFamily(familyName.trim(), payloadMembers);
            // skoro rodzina jest, skip nie jest już potrzebny
            localStorage.removeItem("fh_skip_onboarding");
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
        localStorage.setItem("fh_skip_onboarding", "1");
        nav("/dashboard");
    }

    async function handleLogout() {
        try {
            await logout();
        } finally {
            nav("/login");
        }
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
                    <button type="button" className="fam-nav-link" onClick={() => nav("/dashboard")}>Dashboard</button>
                    <button type="button" className="fam-nav-link fam-nav-link-active" onClick={() => nav("/chores")}>Chores</button>
                    <button type="button" className="fam-nav-link" onClick={() => nav("/finances")}>Finances</button>
                    <button type="button" className="fam-nav-link" onClick={() => nav("/calendar")}>Calendar</button>
                </nav>


                <div className="fam-header-right">
                    <div className="fam-bell" />
                    <div className="fam-user-avatar">
                        {userEmail ? userEmail[0]?.toUpperCase() : "U"}
                    </div>
                    <button
                        type="button"
                        className="fam-logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
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

                        {/* Members – dynamicznie */}
                        <div className="fam-section">
                            <h2 className="fam-section-title">Family Members</h2>
                            <div className="fam-members-grid">
                                {members.map((m) => (
                                    <div key={m.id} className="fam-member-card">
                                        <div
                                            className="fam-member-avatar"
                                            style={{ background: m.avatarColor }}
                                        >
                                            {getInitials(m.name)}
                                        </div>

                                        <input
                                            className="fam-member-name"
                                            value={m.name}
                                            placeholder="Name"
                                            onChange={(e) =>
                                                updateMember(m.id, { name: e.target.value })
                                            }
                                        />

                                        <div className="fam-member-role-row">
                      <span
                          className="fam-color-dot"
                          style={{
                              background:
                                  m.role === "parent" ? "#b8f2d5" : "#ffc8e4",
                          }}
                      />
                                            <select
                                                className="fam-role-select"
                                                value={m.role}
                                                onChange={(e) =>
                                                    updateMember(m.id, { role: e.target.value })
                                                }
                                            >
                                                <option value="parent">Parent</option>
                                                <option value="child">Child</option>
                                            </select>
                                        </div>

                                        <div className="fam-member-icons">
                                            {m.role === "parent" ? (
                                                <>
                                                    <span>⭐</span>
                                                    <span>🛡️</span>
                                                    <span>💙</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>🎮</span>
                                                    <span>📚</span>
                                                    <span>⚽</span>
                                                </>
                                            )}
                                        </div>

                                        {!m.user_id && (
                                            <button
                                                type="button"
                                                className="fam-member-delete-btn"
                                                onClick={() => deleteMember(m.id)}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    className="fam-member-card fam-member-card-empty fam-add-member-click"
                                    onClick={handleAddMember}
                                >
                                    <div className="fam-add-circle">+</div>
                                    <div className="fam-add-text">Add New Member</div>
                                </button>
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
