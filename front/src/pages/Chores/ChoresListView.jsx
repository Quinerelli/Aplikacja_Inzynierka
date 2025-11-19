// src/pages/Chores/ChoresListView.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "../../styles/Chores.css";
import { me } from "../../api/auth.js";
import {
    getChores,
    completeChoreRequest,
    getChoreHistory,
    takeChoreRequest,
} from "../../api/chores.js";
import NewChoreModal from "./NewChoreModal.jsx";

export default function ChoresListView() {
    const location = useLocation();

    const [chores, setChores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [expandedTaskId, setExpandedTaskId] = useState(null);

    const [historyTaskId, setHistoryTaskId] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // wybór trybu
    let mode = "all";
    if (location.pathname.endsWith("/my")) mode = "my";
    else if (location.pathname.endsWith("/assigned")) mode = "assigned";
    else if (location.pathname.endsWith("/completed")) mode = "completed";

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const [meRes, choresRes] = await Promise.all([me(), getChores()]);
                setUserId(meRes.data.user?.id || null);
                setChores(choresRes.data.chores || []);
            } catch (err) {
                console.error("load chores error", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function refreshChores() {
        try {
            const res = await getChores();
            setChores(res.data.chores || []);
        } catch (err) {
            console.error("refresh chores error", err);
        }
    }

    async function handleMarkDone(taskId) {
        try {
            await completeChoreRequest(taskId);
            await refreshChores();
            if (historyTaskId === taskId) loadHistory(taskId);
        } catch (err) {
            console.error("mark done error", err);
        }
    }

    async function handleTakeTask(taskId) {
        try {
            await takeChoreRequest(taskId);
            await refreshChores();
            if (historyTaskId === taskId) loadHistory(taskId);
        } catch (err) {
            console.error("take error", err);
        }
    }

    async function loadHistory(taskId) {
        try {
            setHistoryLoading(true);
            setHistoryTaskId(taskId);
            const res = await getChoreHistory(taskId);
            setHistory(res.data.history || []);
        } catch (err) {
            console.error("history error", err);
        } finally {
            setHistoryLoading(false);
        }
    }

    // filtrowanie
    const filtered = chores.filter((chore) => {
        if (mode === "completed") {
            return chore.status === "done" || chore.status === "verified";
        }
        if (mode === "my") {
            return (chore.assignees || []).some((a) => a.user_id === userId);
        }
        if (mode === "assigned") {
            return chore.created_by === userId;
        }
        return true;
    });

    function formatDateTime(dateStr) {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }).replace(":", ".")}`;
    }

    function statusLabel(st) {
        switch (st) {
            case "unassigned":
                return "UNASSIGNED";
            case "assigned":
                return "ASSIGNED";
            case "in_progress":
                return "IN PROGRESS";
            case "done":
                return "DONE";
            case "verified":
                return "VERIFIED";
            default:
                return st;
        }
    }

    function toggleExpand(taskId) {
        setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
    }

    function titleByMode() {
        switch (mode) {
            case "my":
                return "My Chores";
            case "assigned":
                return "Assigned by Me";
            case "completed":
                return "Completed Chores";
            default:
                return "Household Chores";
        }
    }

    return (
        <div className="ch-content">
            {/* HEADER */}
            <div className="ch-header-row">
                <div>
                    <h1 className="ch-heading">{titleByMode()}</h1>
                    <p className="ch-sub">
                        Create tasks, let family members volunteer for them and track progress.
                    </p>
                </div>

                <button
                    type="button"
                    className="ch-new-chore-btn"
                    onClick={() => setShowModal(true)}
                >
                    + New Chore
                </button>
            </div>

            {/* TABLICA */}
            <div className="ch-table">
                <div className="ch-table-header">
                    <span>Chore</span>
                    <span>Assigned To</span>
                    <span>Due Date</span>
                    <span>Status</span>
                    <span></span>
                </div>

                {filtered.map((t) => {
                    const assignee =
                        (t.assignees || []).find((a) => a.member)?.member?.name ||
                        "Unassigned";

                    const expanded = expandedTaskId === t.id;

                    const completed =
                        t.status === "done" || t.status === "verified";

                    return (
                        <React.Fragment key={t.id}>
                            <div
                                className="ch-table-row ch-table-row-clickable"
                                onClick={(e) => {
                                    if (e.target.closest(".ch-row-actions")) return;
                                    toggleExpand(t.id);
                                }}
                            >
                                <span>{t.title}</span>
                                <span>{assignee}</span>
                                <span>{formatDateTime(t.due_date)}</span>
                                <span
                                    className={
                                        "ch-status " +
                                        (completed ? "completed" : "pending")
                                    }
                                >
                                    {statusLabel(t.status)}
                                </span>

                                <span className="ch-row-actions">
                                    {!completed && t.status === "unassigned" && (
                                        <button
                                            className="ch-row-btn"
                                            onClick={() => handleTakeTask(t.id)}
                                        >
                                            Take task
                                        </button>
                                    )}

                                    {!completed && t.status !== "unassigned" && (
                                        <button
                                            className="ch-row-btn"
                                            onClick={() => handleMarkDone(t.id)}
                                        >
                                            Mark done
                                        </button>
                                    )}
                                </span>
                            </div>

                            {/* ROZWIJANY PANEL — WERSJA KTÓRĄ CHCIAŁEŚ */}
                            {expanded && (
                                <div className="ch-details-row">
                                    <div className="ch-details-box">
                                        <h3 className="ch-details-title">
                                            Task details
                                        </h3>

                                        <div className="ch-details-line">
                                            <div className="ch-details-label">
                                                Description:
                                            </div>
                                            <div className="ch-details-value">
                                                {t.description || "—"}
                                            </div>
                                        </div>

                                        <div className="ch-details-line">
                                            <div className="ch-details-label">
                                                Due:
                                            </div>
                                            <div className="ch-details-value">
                                                {formatDateTime(t.due_date)}
                                            </div>
                                        </div>

                                        <div className="ch-details-line">
                                            <div className="ch-details-label">
                                                Assigned to:
                                            </div>
                                            <div className="ch-details-value">
                                                {assignee}
                                            </div>
                                        </div>

                                        <div className="ch-details-line">
                                            <div className="ch-details-label">
                                                Status:
                                            </div>
                                            <div className="ch-details-value">
                                                {statusLabel(t.status)}
                                            </div>
                                        </div>

                                        {/* Historia zadania w panelu */}
                                        {historyTaskId === t.id && (
                                            <div className="ch-details-history">
                                                <h4 className="ch-history-subtitle">
                                                    History
                                                </h4>

                                                {historyLoading ? (
                                                    <p className="ch-info">
                                                        Loading history...
                                                    </p>
                                                ) : history.length === 0 ? (
                                                    <p className="ch-empty">
                                                        No history entries yet.
                                                    </p>
                                                ) : (
                                                    <ul className="ch-history-list">
                                                        {history.map((h) => (
                                                            <li
                                                                key={h.id}
                                                                className="ch-history-item"
                                                            >
                                                                <span className="ch-history-action">
                                                                    {h.action}
                                                                </span>
                                                                <span className="ch-history-date">
                                                                    {new Date(
                                                                        h.created_at
                                                                    ).toLocaleString()}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {showModal && (
                <NewChoreModal
                    onClose={() => setShowModal(false)}
                    onCreated={async () => {
                        await refreshChores();
                        setShowModal(false);
                    }}
                />
            )}
        </div>
    );
}
