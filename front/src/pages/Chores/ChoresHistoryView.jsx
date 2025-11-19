// src/pages/Chores/ChoresHistoryView.jsx
import React, { useEffect, useState } from "react";
import "../../styles/Chores.css";
import { me } from "../../api/auth.js";
import { getChoreHistoryList, getChoreHistory } from "../../api/chores.js";

export default function ChoresHistoryView() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                await me();
                const res = await getChoreHistoryList();
                setTasks(res.data.history || []);
            } catch (err) {
                console.error("history load error", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function expand(taskId) {
        if (expandedId === taskId) {
            setExpandedId(null);
            return;
        }
        try {
            setExpandedId(taskId);
            setHistoryLoading(true);

            const res = await getChoreHistory(taskId);
            setHistory(res.data.history || []);
        } catch (err) {
            console.error("load details error", err);
        } finally {
            setHistoryLoading(false);
        }
    }

    const format = (d) => {
        if (!d) return "—";
        const t = new Date(d);
        return (
            t.toLocaleDateString() +
            " " +
            t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).replace(":", ".")
        );
    };

    return (
        <div className="ch-content">
            <h1 className="ch-heading">Task History</h1>
            <p className="ch-sub">All completed or expired tasks.</p>

            {loading ? (
                <p className="ch-info">Loading...</p>
            ) : tasks.length === 0 ? (
                <p className="ch-empty">No historical tasks yet.</p>
            ) : (
                <div className="ch-table">
                    <div className="ch-table-header">
                        <span>Task</span>
                        <span>Final Assignee</span>
                        <span>Due</span>
                        <span>Status</span>
                        <span></span>
                    </div>

                    {tasks.map((t) => (
                        <React.Fragment key={t.id}>
                            <div
                                className="ch-table-row ch-table-row-clickable"
                                onClick={() => expand(t.id)}
                            >
                                <span>{t.title}</span>
                                <span>
                                    {t.assignees?.[0]?.member?.name || "—"}
                                </span>
                                <span>{format(t.due_date)}</span>
                                <span
                                    className={
                                        "ch-status " +
                                        (t.status === "done" ||
                                        t.status === "verified"
                                            ? "completed"
                                            : "pending")
                                    }
                                >
                                    {t.status.toUpperCase()}
                                </span>
                                <span>▾</span>
                            </div>

                            {expandedId === t.id && (
                                <div className="ch-details-row">
                                    <div className="ch-details-box">
                                        <h3 className="ch-details-title">Task details</h3>

                                        <div className="ch-details-line">
                                            <div className="ch-details-label">Description:</div>
                                            <div className="ch-details-value">
                                                {t.description || "—"}
                                            </div>
                                        </div>

                                        <div className="ch-details-line">
                                            <div className="ch-details-label">Due:</div>
                                            <div className="ch-details-value">
                                                {format(t.due_date)}
                                            </div>
                                        </div>

                                        <div className="ch-details-line">
                                            <div className="ch-details-label">Final Assignee:</div>
                                            <div className="ch-details-value">
                                                {t.assignees?.[0]?.member?.name || "—"}
                                            </div>
                                        </div>

                                        <div className="ch-details-line">
                                            <div className="ch-details-label">Final Status:</div>
                                            <div className="ch-details-value">
                                                {t.status.toUpperCase()}
                                            </div>
                                        </div>

                                        <h4 className="ch-history-subtitle">Events</h4>

                                        {historyLoading ? (
                                            <p className="ch-info">Loading…</p>
                                        ) : history.length === 0 ? (
                                            <p className="ch-empty">No events recorded.</p>
                                        ) : (
                                            <ul className="ch-history-list">
                                                {history.map((h) => (
                                                    <li key={h.id} className="ch-history-item">
                                                        <span className="ch-history-action">
                                                            {h.action}
                                                        </span>
                                                        <span className="ch-history-date">
                                                            {format(h.created_at)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
}
