// backend/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// -------------------------------------
// ENV ZMIENNE
// -------------------------------------
const {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY,

    COOKIE_NAME_ACCESS = "supa_access",
    COOKIE_NAME_REFRESH = "supa_refresh",
    COOKIE_SECRET = "change_me",

    COOKIE_DOMAIN = "localhost",
    COOKIE_SECURE = "false", // false w dev
    COOKIE_SAMESITE = "lax",

    ACCESS_TOKEN_MAXAGE = "3600",
    REFRESH_TOKEN_MAXAGE = "1209600",

    PORT = 5000,
} = process.env;

const COOKIE_SECURE_BOOL = COOKIE_SECURE === "true";

// -------------------------------------
// APP CONFIG
// -------------------------------------
const app = express();
app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));

// CORS — ZEZWALAMY FRONTENDOWI
app.use(
    cors({
        origin: ["http://localhost:5173"],
        credentials: true,
    })
);

// Supabase klient backendowy (service_role)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Ustawienia cookies
const accessCookieOpts = {
    httpOnly: true,
    secure: COOKIE_SECURE_BOOL,
    sameSite: COOKIE_SAMESITE,
    domain: COOKIE_DOMAIN === "localhost" ? undefined : COOKIE_DOMAIN,
    maxAge: Number(ACCESS_TOKEN_MAXAGE) * 1000,
    path: "/",
};

const refreshCookieOpts = {
    httpOnly: true,
    secure: COOKIE_SECURE_BOOL,
    sameSite: COOKIE_SAMESITE,
    domain: COOKIE_DOMAIN === "localhost" ? undefined : COOKIE_DOMAIN,
    maxAge: Number(REFRESH_TOKEN_MAXAGE) * 1000,
    path: "/",
};

// -------------------------------------
// HELPERY
// -------------------------------------

// pobieranie zalogowanego usera z access_token
async function getUserFromRequest(req) {
    const token = req.cookies[COOKIE_NAME_ACCESS];
    if (!token) return null;

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return null;

    return data.user;
}

// ensureUserRow: jeśli user nie istnieje w tabeli users → utwórz
async function ensureUserRow(supabaseAdmin, user) {
    if (!user) return;

    const { data: exists } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

    if (!exists) {
        await supabaseAdmin.from("users").insert({
            id: user.id,
            email: user.email,
        });
    }
}

// pomocniczo: user + rodzina (pierwsza, do której należy)
async function getUserAndFamily(req) {
    const user = await getUserFromRequest(req);
    if (!user) return { user: null, familyId: null, member: null };

    const { data: member, error } = await supabaseAdmin
        .from("family_members")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error || !member) return { user, familyId: null, member: null };

    return { user, familyId: member.family_id, member };
}

// AUTO-FAIL: oznacz zadania jako failed, jeśli minął due_date
async function autoFailOverdueTasks(familyId) {
    const nowIso = new Date().toISOString();

    // znajdź zadania assigned/in_progress po terminie
    const { data: overdue, error: overdueErr } = await supabaseAdmin
        .from("tasks")
        .select("id")
        .eq("family_id", familyId)
        .in("status", ["assigned", "in_progress"])
        .lt("due_date", nowIso);

    if (overdueErr || !overdue || overdue.length === 0) return;

    const ids = overdue.map((t) => t.id);

    // ustaw status = failed
    const { error: updErr } = await supabaseAdmin
        .from("tasks")
        .update({ status: "failed" })
        .in("id", ids);

    if (updErr) {
        console.error("autoFail update error", updErr);
        return;
    }

    // dopisz historię (user_id może być null)
    const historyRows = ids.map((taskId) => ({
        task_id: taskId,
        user_id: null,
        action: "failed",
    }));

    const { error: histErr } = await supabaseAdmin
        .from("task_history")
        .insert(historyRows);

    if (histErr) {
        console.error("autoFail history error", histErr);
    }
}

// -------------------------------------
// AUTH: SIGNUP
// -------------------------------------
app.post("/auth/signup", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ error: "Email i hasło są wymagane" });

    try {
        const { data, error } = await supabaseAdmin.auth.signUp({
            email,
            password,
        });

        if (error) return res.status(400).json({ error: error.message });

        return res.json({
            message: "Konto utworzone. Sprawdź skrzynkę jeśli masz verify email.",
            userId: data.user?.id ?? null,
        });
    } catch (err) {
        console.error("signup error:", err);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

// -------------------------------------
// AUTH: LOGIN
// -------------------------------------
app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ error: "Email i hasło są wymagane" });

    try {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.session)
            return res.status(401).json({
                error: error?.message ?? "Nieprawidłowe dane logowania",
            });

        const { access_token, refresh_token, expires_in, user } =
            data.session;

        // zapewnij wpis w tabeli users (relacja do families)
        await ensureUserRow(supabaseAdmin, user);

        // ustaw cookies
        res.cookie(COOKIE_NAME_ACCESS, access_token, accessCookieOpts);
        res.cookie(COOKIE_NAME_REFRESH, refresh_token, refreshCookieOpts);

        return res.json({
            message: "Zalogowano",
            user: { id: user.id, email: user.email },
            expires_in,
        });
    } catch (err) {
        console.error("login error:", err);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

// -------------------------------------
// AUTH: ME
// -------------------------------------
app.get("/auth/me", async (req, res) => {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return res.status(401).json({ error: "Brak sesji" });

        await ensureUserRow(supabaseAdmin, user);

        return res.json({
            user: { id: user.id, email: user.email },
        });
    } catch (err) {
        console.error("me error:", err);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

// -------------------------------------
// AUTH: LOGOUT
// -------------------------------------
app.post("/auth/logout", async (req, res) => {
    try {
        res.clearCookie(COOKIE_NAME_ACCESS, accessCookieOpts);
        res.clearCookie(COOKIE_NAME_REFRESH, refreshCookieOpts);

        res.json({ message: "Wylogowano" });
    } catch (err) {
        console.error("logout error:", err);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

// -------------------------------------
// FAMILIES: CREATE
// -------------------------------------
app.post("/families", async (req, res) => {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return res.status(401).json({ error: "Brak zalogowanego użytkownika" });
        }

        const { name, members } = req.body || {};

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Nazwa rodziny jest wymagana" });
        }

        if (!Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ error: "Lista członków jest wymagana" });
        }

        // 1) Tworzymy rodzinę
        const { data: famData, error: famError } = await supabaseAdmin
            .from("families")
            .insert({ name })
            .select("id")
            .single();

        if (famError) {
            console.error("families insert error", famError);
            return res.status(500).json({ error: "Nie udało się utworzyć rodziny" });
        }

        const familyId = famData.id;

        // 2) Tworzymy członków
        const toInsert = members.map((m) => ({
            family_id: familyId,
            user_id: m.user_id, // może być null dla profili
            name: m.name,
            role: m.role,
            avatar_color: m.avatar_color,
        }));

        const { error: memError } = await supabaseAdmin
            .from("family_members")
            .insert(toInsert);

        if (memError) {
            console.error("family_members insert error", memError);
            return res.status(500).json({
                error: "Rodzina utworzona, ale nie udało się zapisać członków",
            });
        }

        return res.json({
            message: "Rodzina utworzona",
            familyId,
        });
    } catch (err) {
        console.error("families error", err);
        return res.status(500).json({ error: "Błąd serwera" });
    }
});

// -------------------------------------
// FAMILIES: MY FAMILIES
// -------------------------------------
app.get("/families/me", async (req, res) => {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return res.status(401).json({ error: "Brak sesji" });

        const { data, error } = await supabaseAdmin
            .from("family_members")
            .select(`
                role,
                families:family_id (id, name)
            `)
            .eq("user_id", user.id);

        if (error) {
            console.error("families/me error:", error);
            return res.status(500).json({ error: "Błąd serwera" });
        }

        res.json({ families: data || [] });
    } catch (err) {
        console.error("families/me error:", err);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

// GET /families/me/members - lista członków rodziny z imionami
app.get("/families/me/members", async (req, res) => {
    try {
        const { user, familyId } = await getUserAndFamily(req);
        if (!user) return res.status(401).json({ error: "Brak sesji" });
        if (!familyId) return res.json({ members: [] });

        const { data, error } = await supabaseAdmin
            .from("family_members")
            .select("id, name, role, avatar_color, user_id")
            .eq("family_id", familyId)
            .order("id");

        if (error) {
            console.error("members error", error);
            return res.status(500).json({ error: "Błąd pobierania członków" });
        }

        return res.json({ members: data || [] });
    } catch (err) {
        console.error("members error", err);
        return res.status(500).json({ error: "Błąd serwera" });
    }
});

// -------------------------------------
// CHORES
// -------------------------------------

// GET /chores - aktywne zadania rodziny + przypisania
app.get("/chores", async (req, res) => {
    try {
        const { user, familyId } = await getUserAndFamily(req);
        if (!user) return res.status(401).json({ error: "Brak sesji" });
        if (!familyId) return res.json({ chores: [] });

        // 0) auto-FAIL zadań po terminie
        await autoFailOverdueTasks(familyId);

        // 1. pobierz AKTYWNE zadania (bez done/verified/failed)
        const { data: tasks, error: tasksErr } = await supabaseAdmin
            .from("tasks")
            .select("*")
            .eq("family_id", familyId)
            .in("status", ["unassigned", "assigned", "in_progress"])
            .order("due_date", { ascending: true });

        if (tasksErr) {
            console.error("tasks error", tasksErr);
            return res.status(500).json({ error: "Błąd pobierania zadań" });
        }

        if (!tasks || tasks.length === 0) {
            return res.json({ chores: [] });
        }

        const taskIds = tasks.map((t) => t.id);

        // 2. przypisania
        const { data: assignments, error: assignErr } = await supabaseAdmin
            .from("task_assignments")
            .select("*")
            .in("task_id", taskIds);

        if (assignErr) {
            console.error("assign error", assignErr);
            return res.status(500).json({ error: "Błąd pobierania przypisań" });
        }

        // 3. członkowie rodziny (dla imion/avatarów)
        const { data: members, error: memErr } = await supabaseAdmin
            .from("family_members")
            .select("id, name, avatar_color, user_id")
            .eq("family_id", familyId);

        if (memErr) {
            console.error("members error", memErr);
            return res.status(500).json({ error: "Błąd pobierania członków" });
        }

        const memberByUserId = new Map();
        (members || []).forEach((m) => {
            if (m.user_id) memberByUserId.set(m.user_id, m);
        });

        // 4. sklej w strukturę pod frontend
        const chores = tasks.map((t) => {
            const ass = (assignments || []).filter(
                (a) => a.task_id === t.id
            );
            const assignees = ass.map((a) => {
                const m = a.user_id ? memberByUserId.get(a.user_id) : null;
                return {
                    assignment_id: a.id,
                    user_id: a.user_id,
                    assigned_at: a.assigned_at,
                    completed_at: a.completed_at,
                    member: m
                        ? {
                            id: m.id,
                            name: m.name,
                            avatar_color: m.avatar_color,
                        }
                        : null,
                };
            });

            return {
                ...t,
                assignees,
            };
        });

        return res.json({ chores });
    } catch (err) {
        console.error("GET /chores error", err);
        return res.status(500).json({ error: "Błąd serwera" });
    }
});

// GET /chores/history – wszystkie zakończone (done/verified/failed) + timeline
app.get("/chores/history", async (req, res) => {
    try {
        const { user, familyId } = await getUserAndFamily(req);
        if (!user) return res.status(401).json({ error: "Brak sesji" });
        if (!familyId) return res.json({ history: [] });

        // auto-FAIL na wszelki wypadek
        await autoFailOverdueTasks(familyId);

        // 1) Zakończone zadania
        const { data: tasks, error: tasksErr } = await supabaseAdmin
            .from("tasks")
            .select("*")
            .eq("family_id", familyId)
            .in("status", ["done", "verified", "failed"])
            .order("due_date", { ascending: false });

        if (tasksErr) {
            console.error("history tasks error", tasksErr);
            return res.status(500).json({ error: "Błąd pobierania zadań" });
        }

        if (!tasks || tasks.length === 0) {
            return res.json({ history: [] });
        }

        const taskIds = tasks.map((t) => t.id);

        // 2) przypisania
        const { data: assignments, error: assignErr } = await supabaseAdmin
            .from("task_assignments")
            .select("*")
            .in("task_id", taskIds);

        if (assignErr) {
            console.error("history assign error", assignErr);
            return res.status(500).json({ error: "Błąd pobierania przypisań" });
        }

        // 3) członkowie
        const { data: members, error: memErr } = await supabaseAdmin
            .from("family_members")
            .select("id, name, avatar_color, user_id")
            .eq("family_id", familyId);

        if (memErr) {
            console.error("history members error", memErr);
            return res.status(500).json({ error: "Błąd pobierania członków" });
        }

        const memberByUserId = new Map();
        (members || []).forEach((m) => {
            if (m.user_id) memberByUserId.set(m.user_id, m);
        });

        // 4) historia (timeline)
        const { data: histRows, error: histErr } = await supabaseAdmin
            .from("task_history")
            .select("*")
            .in("task_id", taskIds)
            .order("created_at", { ascending: true });

        if (histErr) {
            console.error("history rows error", histErr);
            return res.status(500).json({ error: "Błąd pobierania historii" });
        }

        const historyByTask = new Map();
        (histRows || []).forEach((h) => {
            if (!historyByTask.has(h.task_id)) historyByTask.set(h.task_id, []);
            historyByTask.get(h.task_id).push(h);
        });

        const result = tasks.map((t) => {
            const ass = (assignments || []).filter((a) => a.task_id === t.id);
            const assignees = ass.map((a) => {
                const m = a.user_id ? memberByUserId.get(a.user_id) : null;
                return {
                    assignment_id: a.id,
                    user_id: a.user_id,
                    assigned_at: a.assigned_at,
                    completed_at: a.completed_at,
                    member: m
                        ? {
                            id: m.id,
                            name: m.name,
                            avatar_color: m.avatar_color,
                        }
                        : null,
                };
            });

            return {
                ...t,
                assignees,
                timeline: historyByTask.get(t.id) || [],
            };
        });

        return res.json({ history: result });
    } catch (err) {
        console.error("GET /chores/history error", err);
        return res.status(500).json({ error: "Błąd serwera" });
    }
});

// POST /chores - tworzenie zadania
app.post("/chores", async (req, res) => {
    try {
        const { user, familyId } = await getUserAndFamily(req);
        if (!user) return res.status(401).json({ error: "Brak sesji" });
        if (!familyId) return res.status(400).json({ error: "Brak rodziny" });

        const {
            title,
            description,
            due_date,       // pełny timestamp (string)
            reward_points,
            assignee_member_id,
        } = req.body || {};

        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Tytuł zadania jest wymagany" });
        }

        let status = "unassigned";
        if (assignee_member_id) status = "assigned";

        // 1. utwórz zadanie
        const { data: task, error: taskErr } = await supabaseAdmin
            .from("tasks")
            .insert({
                family_id: familyId,
                created_by: user.id,
                title: title.trim(),
                description: description || null,
                // tu zapisujemy timestamptz; jeśli front da tylko datę, supabase
                // doda 00:00:00 w UTC
                due_date: due_date || null,
                reward_points: reward_points ?? null,
                status,
            })
            .select("*")
            .single();

        if (taskErr) {
            console.error("create task error", taskErr);
            return res
                .status(500)
                .json({ error: "Nie udało się utworzyć zadania" });
        }

        // 2. jeśli jest przypisanie – dodaj do task_assignments
        if (assignee_member_id) {
            // pobierz członka, żeby wziąć jego user_id
            const { data: member, error: memErr } = await supabaseAdmin
                .from("family_members")
                .select("user_id")
                .eq("id", assignee_member_id)
                .maybeSingle();

            if (!memErr && member && member.user_id) {
                await supabaseAdmin.from("task_assignments").insert({
                    task_id: task.id,
                    user_id: member.user_id,
                    assigned_at: new Date().toISOString(),
                });
            }
        }

        // wpis w historii: created
        await supabaseAdmin.from("task_history").insert({
            task_id: task.id,
            user_id: user.id,
            action: "created",
        });

        return res.json({ message: "Zadanie utworzone", task });
    } catch (err) {
        console.error("POST /chores error", err);
        return res.status(500).json({ error: "Błąd serwera" });
    }
});

// POST /chores/:id/status - zmiana statusu + historia (bardziej ogólne)
app.post("/chores/:id/status", async (req, res) => {
    try {
        const { user } = await getUserAndFamily(req);
        if (!user) return res.status(401).json({ error: "Brak sesji" });

        const taskId = parseInt(req.params.id, 10);
        const { status } = req.body || {};

        const allowed = [
            "unassigned",
            "assigned",
            "in_progress",
            "done",
            "verified",
            "failed",
        ];
        if (!allowed.includes(status)) {
            return res.status(400).json({ error: "Nieprawidłowy status" });
        }

        const { error: updErr } = await supabaseAdmin
            .from("tasks")
            .update({ status })
            .eq("id", taskId);

        if (updErr) {
            console.error("update status error", updErr);
            return res.status(500).json({ error: "Nie udało się zmienić statusu" });
        }

        await supabaseAdmin.from("task_history").insert({
            task_id: taskId,
            user_id: user.id,
            action: `status:${status}`,
        });

        return res.json({ message: "Status zaktualizowany" });
    } catch (err) {
        console.error("POST /chores/:id/status error", err);
        return res.status(500).json({ error: "Błąd serwera" });
    }
});

// POST /chores/:id/complete - oznacz jako wykonane (DONE)
app.post("/chores/:id/complete", async (req, res) => {
    try {
        const { user } = await getUserAndFamily(req);
        if (!user) return res.status(401).json({ error: "Brak sesji" });

        const taskId = parseInt(req.params.id, 10);

        const now = new Date().toISOString();

        // status zadania
        await supabaseAdmin
            .from("tasks")
            .update({ status: "done" })
            .eq("id", taskId);

        // completed_at w przypisaniu
        await supabaseAdmin
            .from("task_assignments")
            .update({ completed_at: now })
            .eq("task_id", taskId);

        // historia
        await supabaseAdmin.from("task_history").insert({
            task_id: taskId,
            user_id: user.id,
            action: "completed",
        });

        return res.json({ message: "Zadanie oznaczone jako wykonane" });
    } catch (err) {
        console.error("POST /chores/:id/complete error", err);
        return res.status(500).json({ error: "Błąd serwera" });
    }
});

// POST /chores/:id/fail - ręczne oznaczenie jako FAILED (opcjonalne)
app.post("/chores/:id/fail", async (req, res) => {
    try {
        const { user } = await getUserAndFamily(req);
        if (!user) return res.status(401).json({ error: "Brak sesji" });

        const taskId = parseInt(req.params.id, 10);

        await supabaseAdmin
            .from("tasks")
            .update({ status: "failed" })
            .eq("id", taskId);

        await supabaseAdmin.from("task_history").insert({
            task_id: taskId,
            user_id: user.id,
            action: "failed_manual",
        });

        return res.json({ message: "Zadanie oznaczone jako niewykonane" });
    } catch (err) {
        console.error("POST /chores/:id/fail error", err);
        return res.status(500).json({ error: "Błąd serwera" });
    }
});

// GET /chores/members (stare użycie — członkowie rodziny dla modala)
app.get("/chores/members", async (req, res) => {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return res.status(401).json({ error: "Not logged in" });

        const { data: fm, error: fmErr } = await supabaseAdmin
            .from("family_members")
            .select("family_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (fmErr) {
            console.error("family_members lookup error", fmErr);
            return res.status(500).json({ error: "Cannot load family" });
        }

        if (!fm) {
            return res.json({ members: [] });
        }

        const { data, error } = await supabaseAdmin
            .from("family_members")
            .select("id, name, role, avatar_color")
            .eq("family_id", fm.family_id);

        if (error) {
            console.error("members error", error);
            return res.status(500).json({ error: "Cannot load members" });
        }

        res.json({ members: data || [] });
    } catch (err) {
        console.error("members error", err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /chores/:id/take - zgłoszenie się do zadania
app.post("/chores/:id/take", async (req, res) => {
    try {
        const { user } = await getUserAndFamily(req);
        if (!user) return res.status(401).json({ error: "Not logged in" });

        const taskId = Number(req.params.id);

        // 1) wstaw assignment (dla aktualnego usera)
        const { error: assignErr } = await supabaseAdmin
            .from("task_assignments")
            .insert({
                task_id: taskId,
                user_id: user.id,
                assigned_at: new Date().toISOString(),
            });

        if (assignErr) {
            console.error("assign error", assignErr);
            return res.status(500).json({ error: "Cannot assign task" });
        }

        // 2) ustaw status na "assigned"
        const { error: statusErr } = await supabaseAdmin
            .from("tasks")
            .update({ status: "assigned" })
            .eq("id", taskId);

        if (statusErr) {
            console.error("status update error", statusErr);
            return res.status(500).json({ error: "Cannot update task status" });
        }

        // 3) wpis do historii
        await supabaseAdmin.from("task_history").insert({
            task_id: taskId,
            user_id: user.id,
            action: "taken",
        });

        res.json({ ok: true });
    } catch (err) {
        console.error("take task error", err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET /chores/:id/history – historia jednego zadania (na potrzeby obecnego frontu)
app.get("/chores/:id/history", async (req, res) => {
    try {
        const taskId = Number(req.params.id);

        const { data, error } = await supabaseAdmin
            .from("task_history")
            .select("*")
            .eq("task_id", taskId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("task history error", error);
            return res.status(500).json({ error: "Błąd pobierania historii" });
        }

        return res.json({ history: data || [] });
    } catch (err) {
        console.error("GET /chores/:id/history error", err);
        return res.status(500).json({ error: "Błąd serwera" });
    }
});

// GET /chores/history — ostateczna wersja, JEDYNA jaka ma być w pliku
app.get("/chores/history", async (req, res) => {
    try {
        const { user, familyId } = await getUserAndFamily(req);
        if (!user) return res.status(401).json({ error: "Brak sesji" });
        if (!familyId) return res.json({ tasks: [] });

        const now = new Date();

        // pobierz wszystkie zadania
        const { data: tasks } = await supabaseAdmin
            .from("tasks")
            .select("*")
            .eq("family_id", familyId);

        const taskIds = tasks.map((t) => t.id);

        // przypisania
        const { data: assigns } = await supabaseAdmin
            .from("task_assignments")
            .select("*")
            .in("task_id", taskIds);

        // członkowie (dla imion wykonawców)
        const { data: members } = await supabaseAdmin
            .from("family_members")
            .select("user_id, name, avatar_color");

        const nameByUserId = new Map();
        members.forEach((m) => {
            if (m.user_id) nameByUserId.set(m.user_id, m.name);
        });

        // wszystkie wpisy historii
        const { data: histRows } = await supabaseAdmin
            .from("task_history")
            .select("*")
            .in("task_id", taskIds)
            .order("created_at");

        const timelineByTask = new Map();
        histRows.forEach((h) => {
            if (!timelineByTask.has(h.task_id)) {
                timelineByTask.set(h.task_id, []);
            }
            timelineByTask.get(h.task_id).push(h);
        });

        // budowanie listy historycznych zadań
        const historyTasks = tasks
            .map((t) => {
                let finalStatus = t.status;

                // oznaczenie jako missed
                if (
                    (t.status === "unassigned" || t.status === "assigned") &&
                    t.due_date &&
                    new Date(t.due_date) < now
                ) {
                    finalStatus = "missed";
                }

                if (!["done", "verified", "failed", "missed"].includes(finalStatus)) {
                    return null;
                }

                // assignee
                const a = assigns.find((x) => x.task_id === t.id);
                const assigneeName = a?.user_id
                    ? nameByUserId.get(a.user_id) || "—"
                    : "—";

                return {
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    due_date: t.due_date,
                    status: finalStatus,
                    assignee: assigneeName,
                    completed_at: a?.completed_at || null,
                    timeline: timelineByTask.get(t.id) || [],
                };
            })
            .filter(Boolean);

        return res.json({ tasks: historyTasks });
    } catch (err) {
        console.error("GET /chores/history error:", err);
        return res.status(500).json({ error: "Błąd serwera" });
    }
});



// -------------------------------------
// START SERVER
// -------------------------------------
app.listen(Number(PORT), () => {
    console.log(`✅ Backend działa: http://localhost:${PORT}`);
});
