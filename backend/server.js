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
    COOKIE_SECURE = "false",   // false w dev
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
        if (!user)
            return res.status(401).json({ error: "Brak zalogowanego użytkownika" });

        const { name } = req.body || {};
        if (!name || !name.trim())
            return res.status(400).json({ error: "Nazwa rodziny jest wymagana" });

        // 1. Tworzymy rodzinę
        const { data: family, error: famError } = await supabaseAdmin
            .from("families")
            .insert({ name })
            .select("id")
            .single();

        if (famError) {
            console.error("families insert error:", famError);
            return res
                .status(500)
                .json({ error: "Nie udało się utworzyć rodziny" });
        }

        // 2. Dodajemy usera jako parent
        const { error: memError } = await supabaseAdmin
            .from("family_members")
            .insert({
                family_id: family.id,
                user_id: user.id,
                role: "parent",
            });

        if (memError) {
            console.error("family_members insert error:", memError);
            return res.status(500).json({
                error:
                    "Rodzina utworzona, ale nie udało się dodać użytkownika",
            });
        }

        res.json({
            message: "Rodzina utworzona",
            familyId: family.id,
        });
    } catch (err) {
        console.error("families error:", err);
        res.status(500).json({ error: "Błąd serwera" });
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

// -------------------------------------
// START SERVER
// -------------------------------------
app.listen(Number(PORT), () => {
    console.log(`✅ Backend działa: http://localhost:${PORT}`);
});
