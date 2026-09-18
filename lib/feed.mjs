const X_USER_ID = "1784662234188189696";
const X_HANDLE = "s_ambrozio";
const X_PROFILE = "https://x.com/s_ambrozio";
const DEFAULT_NOTION_DB = "df9eafe858ea49209f3935a1ecfe844e";
const FEED_LIMIT = 8;
const FETCH_MS = 8000;

const CACHE_HEADERS = {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    "Content-Type": "application/json; charset=utf-8"
};

export const FEED_META = {
    userId: X_USER_ID,
    handle: X_HANDLE,
    profile: X_PROFILE,
    defaultNotionDatabaseId: DEFAULT_NOTION_DB,
    limit: FEED_LIMIT,
    env: {
        xBearer: "X_BEARER_TOKEN",
        notionToken: "NOTION_TOKEN",
        notionDatabase: "NOTION_EDITORIAL_DATABASE_ID"
    }
};

function timeoutSignal() {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        return AbortSignal.timeout(FETCH_MS);
    }
    return undefined;
}

export function excerpt(text, max) {
    var cleaned = String(text || "")
        .replace(/https?:\/\/t\.co\/\S+/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!cleaned) return "";
    var limit = max || 180;
    if (cleaned.length <= limit) return cleaned;
    var slice = cleaned.slice(0, limit);
    var cut = slice.lastIndexOf(" ");
    if (cut > 80) slice = slice.slice(0, cut);
    return slice.replace(/[.,;:–—-]+$/, "") + "…";
}

export function isoDate(value) {
    if (!value) return "";
    var text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    var parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
}

function isXStatusUrl(url) {
    return /^https?:\/\/(www\.)?(x|twitter)\.com\/[^/]+\/status\/\d+/i.test(String(url || ""));
}

export function isOriginalPost(tweet) {
    if (!tweet || !tweet.id || !tweet.text) return false;
    if (tweet.in_reply_to_user_id) return false;
    var refs = tweet.referenced_tweets || [];
    for (var i = 0; i < refs.length; i++) {
        var type = refs[i] && refs[i].type;
        if (type === "replied_to" || type === "retweeted") return false;
    }
    if (tweet.conversation_id && String(tweet.conversation_id) !== String(tweet.id)) return false;
    var text = String(tweet.text).trim();
    if (!text) return false;
    if (/^fonte:/i.test(text)) return false;
    return true;
}

export function mapXPosts(payload, limit) {
    var rows = (payload && payload.data) || [];
    var out = [];
    for (var i = 0; i < rows.length && out.length < (limit || FEED_LIMIT); i++) {
        var tweet = rows[i];
        if (!isOriginalPost(tweet)) continue;
        var url = tweet.url || (X_PROFILE + "/status/" + tweet.id);
        out.push({
            id: String(tweet.id),
            date: isoDate(tweet.created_at),
            url: url,
            text: excerpt(tweet.text)
        });
    }
    return out;
}

function notionPlain(rich) {
    if (!rich) return "";
    if (typeof rich === "string") return rich;
    var pieces = rich.title || rich.rich_text || [];
    var text = "";
    for (var i = 0; i < pieces.length; i++) {
        text += pieces[i].plain_text || "";
    }
    return text.trim();
}

export function mapNotionPages(payload, limit) {
    var rows = (payload && payload.results) || [];
    var out = [];
    for (var i = 0; i < rows.length && out.length < (limit || FEED_LIMIT); i++) {
        var page = rows[i];
        var props = (page && page.properties) || {};
        var url = (props.URL && props.URL.url) || "";
        var platform = props.Platform && props.Platform.select && props.Platform.select.name;
        if (!isXStatusUrl(url)) continue;
        if (platform && platform !== "X") continue;
        var title = notionPlain(props.Name);
        var statusId = String(url).match(/status\/(\d+)/);
        out.push({
            id: (statusId && statusId[1]) || page.id,
            date: isoDate(props.Date && props.Date.date && props.Date.date.start),
            url: url,
            text: excerpt(title, 140)
        });
    }
    return out;
}

async function fetchJson(url, options) {
    var res = await fetch(url, options);
    var body = await res.json().catch(function () {
        return null;
    });
    if (!res.ok) {
        var err = new Error("upstream_" + res.status);
        err.status = res.status;
        err.body = body;
        throw err;
    }
    return body;
}

export async function fetchXTimeline(token) {
    var url = new URL("https://api.twitter.com/2/users/" + X_USER_ID + "/tweets");
    url.searchParams.set("max_results", "20");
    url.searchParams.set("exclude", "retweets,replies");
    url.searchParams.set("tweet.fields", "created_at,conversation_id,lang");
    return fetchJson(url, {
        headers: { Authorization: "Bearer " + token },
        signal: timeoutSignal()
    });
}

export async function fetchNotionPublished(token, databaseId) {
    return fetchJson("https://api.notion.com/v1/databases/" + databaseId + "/query", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + token,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filter: {
                and: [
                    { property: "Status", select: { equals: "Published" } },
                    { property: "URL", url: { is_not_empty: true } }
                ]
            },
            sorts: [{ property: "Date", direction: "descending" }],
            page_size: 20
        }),
        signal: timeoutSignal()
    });
}

export async function buildFeed(env, fetchers) {
    var xToken = env.X_BEARER_TOKEN && String(env.X_BEARER_TOKEN).trim();
    var notionToken = env.NOTION_TOKEN && String(env.NOTION_TOKEN).trim();
    var notionDb = (env.NOTION_EDITORIAL_DATABASE_ID && String(env.NOTION_EDITORIAL_DATABASE_ID).trim()) || DEFAULT_NOTION_DB;
    var getX = (fetchers && fetchers.x) || fetchXTimeline;
    var getNotion = (fetchers && fetchers.notion) || fetchNotionPublished;

    if (xToken) {
        try {
            var xPayload = await getX(xToken);
            var xPosts = mapXPosts(xPayload, FEED_LIMIT);
            if (xPosts.length) {
                return { source: "x", profile: X_PROFILE, posts: xPosts };
            }
        } catch (err) {
            console.error("feed: X timeline failed", err && err.status, err && err.message);
        }
    }

    if (notionToken) {
        try {
            var notionPayload = await getNotion(notionToken, notionDb);
            var notionPosts = mapNotionPages(notionPayload, FEED_LIMIT);
            if (notionPosts.length) {
                return { source: "notion", profile: X_PROFILE, posts: notionPosts };
            }
        } catch (err) {
            console.error("feed: Notion fallback failed", err && err.status, err && err.message);
        }
    }

    return {
        source: "none",
        profile: X_PROFILE,
        posts: [],
        reason: xToken || notionToken ? "upstream" : "unconfigured"
    };
}

export async function buildFeedResponse(env, fetchers) {
    var payload = await buildFeed(env || process.env, fetchers);
    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: CACHE_HEADERS
    });
}
