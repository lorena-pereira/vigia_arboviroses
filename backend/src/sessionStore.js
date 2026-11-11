export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_WARNING_MS = 5 * 60 * 1000;

export const sessions = new Map();

export function purgeExpiredSessions() {
    const agora = Date.now();

    for (const [sessionId, session] of sessions.entries()) {
        if ((session.expiresAt ?? 0) <= agora) {
            sessions.delete(sessionId);
        }
    }
}
