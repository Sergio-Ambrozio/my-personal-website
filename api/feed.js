/**
 * Live @s_ambrozio feed for the homepage.
 *
 * Preferred: X user timeline (GET /2/users/:id/tweets).
 * Fallback: Notion Editorial rows with Status=Published and an X status URL.
 *
 * Vercel env (Project → Settings → Environment Variables):
 *   X_BEARER_TOKEN                 required for live X posts (app Bearer token)
 *   NOTION_TOKEN                   fallback if X is missing or blocked
 *   NOTION_EDITORIAL_DATABASE_ID   optional; defaults to the Editorial board
 *
 * With no credentials the endpoint returns an empty feed (HTTP 200). The
 * homepage then points at https://x.com/s_ambrozio.
 */
import { buildFeedResponse } from "../lib/feed.mjs";

export async function GET() {
    return buildFeedResponse(process.env);
}

export default {
    async fetch(request) {
        var method = request && request.method;
        if (method && method !== "GET" && method !== "HEAD") {
            return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
        }
        return buildFeedResponse(process.env);
    }
};
