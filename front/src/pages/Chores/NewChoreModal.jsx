// src/pages/Chores/NewChoreModal.jsx
import React, { useEffect, useState } from "react";
import "../../styles/Chores.css";
import { createChore, getFamilyMembers } from "../../api/chores.js";

export default function NewChoreModal({ onClose, onCreated }) {
    const [familyMembers, setFamilyMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(true);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [assigneeId, setAssigneeId] = useState(""); // na razie tylko UI
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        async function loadMembers() {
            try {
                setLoadingMembers(true);
                const res = await getFamilyMembers();
                setFamilyMembers(res.data.members || []);
            } catch (err) {
                console.error("members error", err);
            } finally {
                setLoadingMembers(false);
            }
        }
        loadMembers();
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setErrorMsg("");

        if (!title.trim()) {
            setErrorMsg("Title is required.");
            return;
        }

        try {
            setSaving(true);

            // 🔥 NOWE: zawsze tworzymy jako "unassigned"
            await createChore({
                title: title.trim(),
                description: description.trim() || null,
                due_date: dueDate || null,
                reward_points: null,
                // backend ustawi status: "unassigned"
                // i NIE tworzymy jeszcze żadnego assignmentu
            });

            await onCreated();
        } catch (err) {
            console.error("create chore error", err);
            const msg =
                err?.response?.data?.error || "Could not create chore. Try again.";
            setErrorMsg(msg);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="ch-modal-backdrop">
            <div className="ch-modal">
                <div className="ch-modal-header">
                    <h2 className="ch-modal-title">New Chore</h2>
                    <button
                        type="button"
                        className="ch-modal-close"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                <form className="ch-modal-form" onSubmit={handleSubmit}>
                    <div className="ch-modal-field">
                        <label className="ch-modal-label">Title</label>
                        <input
                            className="ch-modal-input"
                            type="text"
                            placeholder="e.g. Clean the kitchen"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="ch-modal-field">
                        <label className="ch-modal-label">Description</label>
                        <textarea
                            className="ch-modal-textarea"
                            placeholder="Optional details..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="ch-modal-field">
                        <label className="ch-modal-label">Due date</label>
                        <input
                            className="ch-modal-input"
                            type="datetime-local"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>

                    {/* To na razie tylko informacyjne – można później wykorzystać
                       do ręcznego przypisywania, jeśli będziesz chciał */}
                    <div className="ch-modal-field">
                        <label className="ch-modal-label">Assign to</label>
                        <select
                            className="ch-modal-select"
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                        >
                            <option value="">— Nobody yet —</option>
                            {loadingMembers ? (
                                <option>Loading members...</option>
                            ) : (
                                familyMembers.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name || "(no name)"}
                                    </option>
                                ))
                            )}
                        </select>
                        <p className="ch-modal-hint">
                            Right now tasks start as <strong>UNASSIGNED</strong>.
                            Family members can volunteer for a task from the list.
                        </p>
                    </div>

                    {errorMsg && <p className="ch-modal-error">{errorMsg}</p>}

                    <div className="ch-modal-actions">
                        <button
                            type="button"
                            className="ch-modal-btn ch-modal-btn-secondary"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="ch-modal-btn ch-modal-btn-primary"
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Create chore"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
