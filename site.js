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
    }

    applyLang(getLang());

    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            applyLang(btn.getAttribute("data-set-lang"));
        });
    });
})();
