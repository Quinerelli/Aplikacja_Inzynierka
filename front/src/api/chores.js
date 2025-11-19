// src/api/chores.js
import { api } from "./auth.js";

export function getChores() {
    return api.get("/chores");
}

export function createChore(payload) {
    return api.post("/chores", payload);
}

export function updateChoreStatus(id, status) {
    return api.post(`/chores/${id}/status`, { status });
}

export function completeChoreRequest(id) {
    return api.post(`/chores/${id}/complete`);
}

export function getChoreHistory(id) {
    return api.get(`/chores/${id}/history`);
}

export function getFamilyMembers() {
    return api.get("/families/me/members");
}

export function takeChoreRequest(taskId) {
    return api.post(`/chores/${taskId}/take`);
}

export function getChoreHistoryList() {
    return api.get("/chores/history");
}
