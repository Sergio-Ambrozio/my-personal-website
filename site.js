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
        return "en";
    }

    function applyLang(lang) {
        document.documentElement.lang = lang;
        document.documentElement.setAttribute("data-lang", lang);
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {}

        var desc = META[lang] || META.en;
        var metaDesc = document.querySelector('meta[name="description"]');
        var ogDesc = document.querySelector('meta[property="og:description"]');
        if (metaDesc) metaDesc.setAttribute("content", desc);
        if (ogDesc) ogDesc.setAttribute("content", desc);

        var titleEn = document.documentElement.getAttribute("data-title-en");
        var titlePt = document.documentElement.getAttribute("data-title-pt");
        if (titleEn && titlePt) {
            document.title = lang === "pt" ? titlePt : titleEn;
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
