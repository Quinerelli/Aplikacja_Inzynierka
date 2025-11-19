import React from "react";
import "../styles/FamilyMemberCard.css";   // ← POPRAWIONY IMPORT

export default function FamilyMemberCard({ member, onChange, onDelete }) {
    const handleNameChange = (e) => {
        onChange({ ...member, name: e.target.value });
    };

    const handleRoleChange = (e) => {
        onChange({ ...member, role: e.target.value });
    };

    const getInitials = (name) => {
        if (!name) return "?";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    };

    return (
        <div className="member-card">
            <div
                className="member-avatar"
                style={{ backgroundColor: member.avatar_color }}
            >
                {getInitials(member.name)}
            </div>

            <div className="member-info">
                <input
                    className="member-name"
                    value={member.name}
                    onChange={handleNameChange}
                    placeholder="Name"
                />

                <select
                    className="member-role"
                    value={member.role}
                    onChange={handleRoleChange}
                >
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                </select>
            </div>

            <button className="member-delete" onClick={onDelete}>
                ✖
            </button>
        </div>
    );
}
