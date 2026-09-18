import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFeed } from "../lib/feed.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const fixture = [
    {
        id: "2100898751074250833",
        date: "2026-09-18",
        url: "https://x.com/s_ambrozio/status/2100898751074250833",
        text: "SAP soltou (ainda restrito) um agente de provisões no fechamento: lê a política, calcula e propõe o lançamento no S/4HANA Cloud. Contador aceita, ajusta ou rejeita antes de postar. E se o agente inventar um número?"
    },
    {
        id: "2100606626659217835",
        date: "2026-09-17",
        url: "https://x.com/s_ambrozio/status/2100606626659217835",
        text: "Diogo Almeida (ex-OpenAI, pesquisa do ChatGPT) soltou o Jev: modelo pra decisão com formato fixo dentro do software, não pra conversa. Promessa: bem mais rápido e bem mais barato que LLM frontier."
    },
    {
        id: "2100099001076912521",
        date: "2026-09-16",
        url: "https://x.com/s_ambrozio/status/2100099001076912521",
        text: "Quantos agentes a sua empresa tem ligados agora? Não o roadmap. Não o slide de “estratégia de IA”. A lista: o que a área ligou sem TI, com a senha de quem, e quem desliga se sair do trilho."
    },
    {
        id: "2099751725045268897",
        date: "2026-09-15",
        url: "https://x.com/s_ambrozio/status/2099751725045268897",
        text: "Builder Central: shadow IT dentro do SFDC."
    },
    {
        id: "2093702599186755637",
        date: "2026-08-29",
        url: "https://x.com/s_ambrozio/status/2093702599186755637",
        text: "Sandbox não contém agente."
    }
];

const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
    ".ico": "image/x-icon"
};

function send(res, status, headers, body) {
    res.writeHead(status, headers);
    res.end(body);
}

async function serveFeed(url) {
    var forceEmpty = url.searchParams.get("empty") === "1" || process.env.FEED_EMPTY === "1";
    if (forceEmpty) {
        return { source: "none", profile: "https://x.com/s_ambrozio", posts: [], reason: "unconfigured" };
    }
    var payload = await buildFeed(process.env);
    if (payload.posts && payload.posts.length) return payload;
    if (process.env.FEED_FIXTURE === "0") return payload;
    return { source: "fixture", profile: "https://x.com/s_ambrozio", posts: fixture };
}

createServer(async function (req, res) {
    try {
        var url = new URL(req.url || "/", "http://127.0.0.1");
        if (url.pathname === "/api/feed") {
            var feed = await serveFeed(url);
            send(res, 200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, JSON.stringify(feed));
            return;
        }

        var path = url.pathname === "/" ? "/index.html" : url.pathname;
        if (path.endsWith("/")) path += "index.html";
        var file = normalize(join(root, path));
        if (!file.startsWith(root)) {
            send(res, 403, { "Content-Type": "text/plain" }, "Forbidden");
            return;
        }
        var body = await readFile(file);
        send(res, 200, { "Content-Type": types[extname(file)] || "application/octet-stream" }, body);
    } catch (err) {
        if (err && err.code === "ENOENT") {
            send(res, 404, { "Content-Type": "text/plain" }, "Not found");
            return;
        }
        console.error(err);
        send(res, 500, { "Content-Type": "text/plain" }, "Error");
    }
}).listen(port, "127.0.0.1", function () {
    console.log("dev server on http://127.0.0.1:" + port);
});
