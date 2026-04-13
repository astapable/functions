// ChatGPT request: https://chatgpt.com/share/69dd0884-dec0-83ea-981d-0c816b0dbe5d
// Since the font can be applied to a site in multiple ways I need to check all of those ways first.
// Most common are - <link rel="stylesheet">, @import, @font-face
// This function runs in the tab context via executeScript — must be self-contained (no external refs)
export function scanFontSources() {
    const fontSources = [];

    // Helper to extract one @font-face rule and push it to fontSources
    function checkFontFace(rule) {
        const fontStyle = rule.style.getPropertyValue('font-style') || 'normal'; // Seems that I was getting italics first. So I check it first and make sure Im not getting empty
        const weight = rule.style.getPropertyValue('font-weight') || 'normal'; // Same mainly for empty
        if (fontStyle !== 'normal') return; // Skip italic and non-normal
        const family = rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim(); // get font name
        const source = rule.style.getPropertyValue('src'); // get font URL ie where it lives
        if (!source || !source.includes('url(')) return; // skip if URL is empty
        // 'cut out' the URL and skip url( stage
        const start = source.indexOf('url(') + 4;
        const end = source.indexOf(')', start);
        const rawUrl = source.slice(start, end).replace(/['"]/g, '').trim();
        const absoluteUrl = new URL(rawUrl, document.baseURI).href; // convert relative path to absolute
        fontSources.push({ type: 'fontface', family, weight, src: `url("${absoluteUrl}")` });
    }

    // 1. Check <link rel="stylesheet">
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const href = link.href;
        if (
            href.includes('fonts.googleapis.com') ||
            href.includes('use.typekit.net') ||
            href.includes('fonts.adobe.com') ||
            href.includes('use.fontawesome.com')
        ) {
            fontSources.push({ type: 'link', url: href });
        }
    });

    // 2. Check @import
    // Some stylesheets has cross-origin so I try to catch and skip those
    Array.from(document.styleSheets).forEach(sheet => {
        try {
            Array.from(sheet.cssRules || []).forEach(rule => {
                if (rule instanceof CSSImportRule) {
                    const href = rule.href;
                    if (
                        href.includes('fonts.googleapis.com') ||
                        href.includes('use.typekit.net') ||
                        href.includes('fonts.adobe.com')
                    ) {
                        fontSources.push({ type: 'link', url: href });
                    }
                }
            });
        } catch (e) {} // Catching cross-origin here
    });

    // 3. Check @font-face / @import / @layer
    // So fonts could be loaded via <link>, @import, or @font-face. But once I started testing on real websites,
    // it turned out that simply checking @font-face inside stylesheets was not enough.
    // CSS rules were structured like matreshka: @import pointing to another file, and inside that file
    // the @font-face was hidden inside an @layer block. So to get the font, I had to go inside
    // @import via rule.styleSheet.cssRules first, then go one level deeper into @layer via importedRule.cssRules.
    // Source: https://developer.mozilla.org/en-US/docs/Web/API/CSSImportRule
    Array.from(document.styleSheets).forEach(sheet => {
        try {
            Array.from(sheet.cssRules || []).forEach(rule => {
                // check in @font-face
                if (rule instanceof CSSFontFaceRule) {
                    checkFontFace(rule);
                }
                // check in @import
                if (rule instanceof CSSImportRule && rule.styleSheet) {
                    try {
                        Array.from(rule.styleSheet.cssRules || []).forEach(importedRule => {
                            if (importedRule instanceof CSSFontFaceRule) {
                                checkFontFace(importedRule);
                            }
                            // check in @layer inside @import. Found it in the typo course site
                            if (importedRule.cssRules) {
                                Array.from(importedRule.cssRules).forEach(layerRule => {
                                    if (layerRule instanceof CSSFontFaceRule) checkFontFace(layerRule);
                                });
                            }
                        });
                    } catch(e) {}
                }
                // check in @layer
                if (rule.cssRules) {
                    try {
                        Array.from(rule.cssRules).forEach(layerRule => {
                            if (layerRule instanceof CSSFontFaceRule) checkFontFace(layerRule);
                        });
                    } catch(e) {}
                }
            });
        } catch (e) {}
    });

    // Kill all duplicate URLs if have multiple origins
    const seenUrls = new Set();
    const uniqueFontSources = fontSources.filter(source => {
        if (source.type === 'link') {
            if (seenUrls.has(source.url)) return false;
            seenUrls.add(source.url);
        }
        return true;
    });

    return uniqueFontSources;
}

export function applyFontSources(fontSources) {
    // after checking sources I need to apply font sources to my popup so fonts appear correctly in the extension
    fontSources.forEach(source => {
        if (source.type === 'link') {
            if (!document.querySelector(`link[href="${source.url}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = source.url;
                document.head.appendChild(link);
            }
        } else if (source.type === 'fontface') {
            const style = document.createElement('style');
            style.textContent = `@font-face { font-family: "${source.family}"; font-weight: ${source.weight}; src: ${source.src}; }`;
            document.head.appendChild(style);
        }
    });
}
