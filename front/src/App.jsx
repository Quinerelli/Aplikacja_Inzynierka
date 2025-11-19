// src/App.jsx
import { Routes, Route } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";

// Public pages (bez layoutu)
import Login from "./pages/Login";
import Register from "./pages/Register";
import FamilyOnboarding from "./pages/FamilyOnboarding";

// Protected pages (z layoutem)
import Dashboard from "./pages/Dashboard";

// Chores
import Chores from "./pages/Chores/Chores";
import ChoresListView from "./pages/Chores/ChoresListView";
import ChoresQuestView from "./pages/Chores/ChoresQuestView";
import ChoresHistoryView from "./pages/Chores/ChoresHistoryView";


export default function App() {
    return (
        <Routes>

            {/* PUBLIC — NIE używają AppLayout */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<FamilyOnboarding />} />

            {/* PROTECTED — używają AppLayout */}
            <Route element={<AppLayout />}>

                <Route path="/dashboard" element={<Dashboard />} />

                {/* CHORES */}
                <Route path="/chores" element={<Chores />}>
                    <Route index element={<ChoresListView />} />
                    <Route path="my" element={<ChoresListView filter="my" />} />
                    <Route path="assigned" element={<ChoresListView filter="assigned" />} />
                    <Route path="completed" element={<ChoresListView filter="completed" />} />

                    {/* NOWA STRONA 🎉 */}
                    <Route path="history" element={<ChoresHistoryView />} />

                    <Route path="quests" element={<ChoresQuestView />} />
                    <Route path="list/:name" element={<ChoresListView />} />
                </Route>


            </Route>

            {/* fallback */}
            <Route path="*" element={<Login />} />
        </Routes>
    );
}
