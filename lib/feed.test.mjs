import assert from "node:assert/strict";
import test from "node:test";
import { buildFeed, excerpt, isOriginalPost, mapNotionPages, mapXPosts } from "./feed.mjs";

const xPayload = {
    data: [
        {
            id: "2100898858695877041",
            conversation_id: "2100898751074250833",
            created_at: "2026-09-18T10:44:55.000Z",
            in_reply_to_user_id: "1784662234188189696",
            referenced_tweets: [{ id: "2100898751074250833", type: "replied_to" }],
            text: "Fonte: https://t.co/TvhB5m44Xf"
        },
        {
            id: "2100898751074250833",
            conversation_id: "2100898751074250833",
            created_at: "2026-09-18T10:44:29.000Z",
            text: "SAP soltou um agente de provisões. É cook the books com SLA. https://t.co/abcd",
            url: "https://x.com/s_ambrozio/status/2100898751074250833"
        },
        {
            id: "2100606626659217835",
            conversation_id: "2100606626659217835",
            created_at: "2026-09-17T15:23:41.000Z",
            text: "Diogo Almeida soltou o Jev: modelo pra decisão com formato fixo dentro do software.",
            url: "https://x.com/s_ambrozio/status/2100606626659217835"
        }
    ]
};

test("drops thread replies and Fonte posts", () => {
    assert.equal(isOriginalPost(xPayload.data[0]), false);
    assert.equal(isOriginalPost(xPayload.data[1]), true);
    var posts = mapXPosts(xPayload, 8);
    assert.equal(posts.length, 2);
    assert.equal(posts[0].id, "2100898751074250833");
    assert.equal(posts[0].date, "2026-09-18");
    assert.equal(posts[0].text.includes("t.co"), false);
});

test("excerpt trims to a word boundary", () => {
    var long = "aaaa " + "bbbb ".repeat(50);
    var out = excerpt(long, 40);
    assert.ok(out.endsWith("…"));
    assert.ok(out.length <= 42);
});

test("maps Notion Published X rows and skips other platforms", () => {
    var payload = {
        results: [
            {
                id: "page-li",
                properties: {
                    Name: { title: [{ plain_text: "LinkedIn only" }] },
                    Status: { select: { name: "Published" } },
                    Platform: { select: { name: "LinkedIn" } },
                    URL: { url: "https://linkedin.com/in/x" },
                    Date: { date: { start: "2026-09-18" } }
                }
            },
            {
                id: "page-x",
                properties: {
                    Name: { title: [{ plain_text: "SAP Accruals: cook the books com SLA" }] },
                    Status: { select: { name: "Published" } },
                    Platform: { select: { name: "X" } },
                    URL: { url: "https://x.com/s_ambrozio/status/2100898751074250833" },
                    Date: { date: { start: "2026-09-18" } }
                }
            }
        ]
    };
    var posts = mapNotionPages(payload, 8);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].id, "2100898751074250833");
    assert.match(posts[0].text, /SAP Accruals/);
});

test("buildFeed prefers X, then Notion, then empty", async () => {
    var x = await buildFeed(
        { X_BEARER_TOKEN: "x" },
        { x: async () => xPayload }
    );
    assert.equal(x.source, "x");
    assert.equal(x.posts.length, 2);

    var notion = await buildFeed(
        { X_BEARER_TOKEN: "x", NOTION_TOKEN: "n" },
        {
            x: async () => {
                throw new Error("x_api_403");
            },
            notion: async () => ({
                results: [
                    {
                        properties: {
                            Name: { title: [{ plain_text: "Carta não é controle" }] },
                            Platform: { select: { name: "X" } },
                            URL: { url: "https://x.com/s_ambrozio/status/2093980260459037026" },
                            Date: { date: { start: "2026-08-30" } }
                        }
                    }
                ]
            })
        }
    );
    assert.equal(notion.source, "notion");
    assert.equal(notion.posts[0].id, "2093980260459037026");

    var empty = await buildFeed({});
    assert.equal(empty.source, "none");
    assert.equal(empty.reason, "unconfigured");
    assert.deepEqual(empty.posts, []);
    assert.equal(empty.profile, "https://x.com/s_ambrozio");

    var xEmptyThenNotion = await buildFeed(
        { X_BEARER_TOKEN: "x", NOTION_TOKEN: "n" },
        {
            x: async () => ({ data: [] }),
            notion: async () => ({
                results: [
                    {
                        properties: {
                            Name: { title: [{ plain_text: "Sandbox não contém agente" }] },
                            Platform: { select: { name: "X" } },
                            URL: { url: "https://x.com/s_ambrozio/status/2093702599186755637" },
                            Date: { date: { start: "2026-08-29" } }
                        }
                    }
                ]
            })
        }
    );
    assert.equal(xEmptyThenNotion.source, "notion");
    assert.equal(xEmptyThenNotion.posts[0].id, "2093702599186755637");
});
