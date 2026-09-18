(function () {
    var STORAGE_KEY = "site-lang";
    var META = {
        en: "AI hype from the US. What dies in a real company. For people who run IT in Brazil.",
        pt: "Hype de IA nos EUA. O que morre numa empresa de verdade. Pra quem decide TI no Brasil."
    };

    function getLang() {
        var current = document.documentElement.getAttribute("data-lang");
        if (current === "pt" || current === "en") return current;
        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (stored === "pt" || stored === "en") return stored;
        } catch (e) {}
        return "pt";
    }

    function pageCopy(lang, enAttr, ptAttr, fallbackEn, fallbackPt) {
        var en = document.documentElement.getAttribute(enAttr);
        var pt = document.documentElement.getAttribute(ptAttr);
        if (lang === "pt") return pt || fallbackPt;
        return en || fallbackEn;
    }

    function applyLang(lang) {
        document.documentElement.lang = lang;
        document.documentElement.setAttribute("data-lang", lang);
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {}

        var desc = pageCopy(lang, "data-desc-en", "data-desc-pt", META.en, META.pt);
        var metaDesc = document.querySelector('meta[name="description"]');
        var ogDesc = document.querySelector('meta[property="og:description"]');
        var twDesc = document.querySelector('meta[name="twitter:description"]');
        if (metaDesc) metaDesc.setAttribute("content", desc);
        if (ogDesc) ogDesc.setAttribute("content", desc);
        if (twDesc) twDesc.setAttribute("content", desc);

        var title = pageCopy(
            lang,
            "data-title-en",
            "data-title-pt",
            document.title,
            document.title
        );
        if (title) {
            document.title = title;
            var ogTitle = document.querySelector('meta[property="og:title"]');
            var twTitle = document.querySelector('meta[name="twitter:title"]');
            if (ogTitle) ogTitle.setAttribute("content", title);
            if (twTitle) twTitle.setAttribute("content", title);
        }

        document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
            btn.setAttribute("aria-pressed", btn.getAttribute("data-set-lang") === lang ? "true" : "false");
        });

        document.querySelectorAll("[data-alt-en]").forEach(function (el) {
            el.alt = lang === "pt" ? el.getAttribute("data-alt-pt") : el.getAttribute("data-alt-en");
        });

        var langNav = document.querySelector(".lang-switch");
        if (langNav) {
            langNav.setAttribute("aria-label", lang === "pt" ? "Idioma" : "Language");
        }

        var skip = document.querySelector(".skip-link");
        if (skip) {
            skip.setAttribute("aria-label", lang === "pt" ? "Ir para o conteúdo" : "Skip to main content");
        }

        document.querySelectorAll("[data-feed-date]").forEach(function (el) {
            el.textContent = formatFeedDate(el.getAttribute("datetime"), lang);
        });
    }

    var MONTHS = {
        en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    };

    function formatFeedDate(iso, lang) {
        var parts = String(iso || "").slice(0, 10).split("-");
        if (parts.length !== 3) return iso || "";
        var day = parseInt(parts[2], 10);
        var month = parseInt(parts[1], 10) - 1;
        var months = MONTHS[lang] || MONTHS.pt;
        if (!months[month] || !day) return iso || "";
        return day + " " + months[month] + " " + parts[0];
    }

    function featuredUrls() {
        var skip = {};
        document.querySelectorAll(".lead-x a[href]").forEach(function (a) {
            skip[a.getAttribute("href")] = true;
        });
        return skip;
    }

    function emptyFeedMessage() {
        var p = document.createElement("p");
        p.className = "feed-status";
        var en = document.createElement("span");
        en.className = "i18n-en";
        en.textContent = "Posts go out on X. Open ";
        var pt = document.createElement("span");
        pt.className = "i18n-pt";
        pt.textContent = "Os posts saem no X. Abra ";
        var link = document.createElement("a");
        link.href = "https://x.com/s_ambrozio";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "@s_ambrozio";
        p.appendChild(en);
        p.appendChild(pt);
        p.appendChild(link);
        p.appendChild(document.createTextNode("."));
        return p;
    }

    function renderFeed(payload) {
        var list = document.querySelector("[data-feed-list]");
        if (!list) return;
        list.innerHTML = "";
        var posts = (payload && payload.posts) || [];
        var skip = featuredUrls();
        var shown = 0;
        posts.forEach(function (post) {
            if (!post || !post.url || skip[post.url]) return;
            shown += 1;
            var li = document.createElement("li");
            var a = document.createElement("a");
            a.className = "post-row";
            a.href = post.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            var time = document.createElement("time");
            time.className = "post-date";
            time.setAttribute("datetime", post.date || "");
            time.setAttribute("data-feed-date", "");
            time.textContent = formatFeedDate(post.date, getLang());
            var title = document.createElement("span");
            title.className = "post-title feed-excerpt";
            title.textContent = post.text || post.url;
            var arrow = document.createElement("span");
            arrow.className = "post-arrow";
            arrow.setAttribute("aria-hidden", "true");
            arrow.textContent = "→";
            a.appendChild(time);
            a.appendChild(title);
            a.appendChild(arrow);
            li.appendChild(a);
            list.appendChild(li);
        });
        if (!shown) {
            var empty = document.createElement("li");
            empty.appendChild(emptyFeedMessage());
            list.appendChild(empty);
        }
    }

    function loadFeed() {
        var list = document.querySelector("[data-feed-list]");
        if (!list) return;
        fetch("/api/feed")
            .then(function (res) {
                if (!res.ok) throw new Error("feed_" + res.status);
                return res.json();
            })
            .then(renderFeed)
            .catch(function () {
                renderFeed({ posts: [] });
            });
    }

    applyLang(getLang());

    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            applyLang(btn.getAttribute("data-set-lang"));
        });
    });

    loadFeed();
})();
