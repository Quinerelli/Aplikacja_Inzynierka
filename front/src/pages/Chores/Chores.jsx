// src/pages/Chores/Chores.jsx
import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import "../../styles/Chores.css";

export default function Chores() {
    return (
        <div className="chores-layout">
            <aside className="chores-sidebar">
                <div className="ch-sidebar-section">
                    <div className="ch-sidebar-title">Chores</div>

                    <NavLink to="/chores" end className="ch-sidebar-link">
                        🗂️ All Chores
                    </NavLink>

                    <NavLink to="/chores/my" className="ch-sidebar-link">
                        👤 My Chores
                    </NavLink>

                    <NavLink to="/chores/assigned" className="ch-sidebar-link">
                        📤 Assigned by Me
                    </NavLink>

                    <NavLink to="/chores/completed" className="ch-sidebar-link">
                        ✔ Completed
                    </NavLink>
                    <NavLink to="/chores/history" className="ch-sidebar-link">
                        📜 History
                    </NavLink>

                </div>

                <div className="ch-sidebar-section">
                    <div className="ch-sidebar-title">Lists</div>

                    <NavLink to="/chores/list/household" className="ch-sidebar-link">
                        🏠 Household
                    </NavLink>
                    <NavLink to="/chores/list/outdoor" className="ch-sidebar-link">
                        🌿 Outdoor
                    </NavLink>
                    <NavLink to="/chores/list/errands" className="ch-sidebar-link">
                        🛒 Errands
                    </NavLink>
                    <NavLink to="/chores/list/kids" className="ch-sidebar-link">
                        🧸 Kids
                    </NavLink>

                    <button className="ch-new-list-btn">+ New List</button>
                </div>
            </aside>

            <main className="chores-main">
                <Outlet />
            </main>
        </div>
    );
}
