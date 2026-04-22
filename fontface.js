// Per Michael's approval made this separate .js file as a library. Slack link to the chat - https://mpscd.slack.com/archives/C09A1HDNBBN/p1776093400459879
// Source: https://javascript.info/modules-dynamic-imports#the-import-expression
export function scanFonts() {
    // ChatGPT request: https://chatgpt.com/share/69dd0884-dec0-83ea-981d-0c816b0dbe5d            
    // Since the font can be applied to a site in a multiple ways I need to check all of thouse ways first.
    // Most common are - <link rel="stylesheet">, @import, @font-face
    // 1. Check <link rel="stylesheet">
    const fontSources = [];
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

    // 2. Check @import + @font-face + @layer
    // Some stylesheets has cross-origin so I try to catch skips those
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
        } catch (e) { // Catching cross-origin here
        }
    });
            
            // 3. Check @font-face
            Array.from(document.styleSheets).forEach(sheet => {
                try {
                    Array.from(sheet.cssRules || []).forEach(rule => {
                        // check in @font-face
                        if (rule instanceof CSSFontFaceRule) {
                            const fontStyle = rule.style.getPropertyValue('font-style') || 'normal'; // Seems that I was gettin italics firs. SO I check it first and make sure Im not getting empty
                            const weight = rule.style.getPropertyValue('font-weight') || 'normal'; //Same mainly for empty
                            if (fontStyle !== 'normal') return; //  Skip italic and non-normal
                            const family = rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim(); // get font name
                            const source = rule.style.getPropertyValue('src'); // get font URL ie where it lives
                            if (!source || !source.includes('url(')) return; // skip prev rule if URL is empty
                            // 'cut out' the URL and skip url( stage
                            const start = source.indexOf('url(') + 4;
                            const end = source.indexOf(')', start);
                            const rawUrl = source.slice(start, end).replace(/['"]/g, '').trim();
                            const absoluteUrl = new URL(rawUrl, document.baseURI).href; // now cnvert relative path to absolute
                            fontSources.push({ type: 'fontface', family, weight, src: `url("${absoluteUrl}")` }); // adding founded fonts to the push
                        }

                        // check in @import
                        if (rule instanceof CSSImportRule && rule.styleSheet) {
                            try {
                                Array.from(rule.styleSheet.cssRules || []).forEach(importedRule => {
                                    if (importedRule instanceof CSSFontFaceRule) {
                                        const fontStyle = importedRule.style.getPropertyValue('font-style') || 'normal';
                                        const weight = importedRule.style.getPropertyValue('font-weight') || 'normal';
                                        if (fontStyle !== 'normal') return;
                                        const family = importedRule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim();
                                        const source = importedRule.style.getPropertyValue('src');
                                        if (!source || !source.includes('url(')) return;
                                        const start = source.indexOf('url(') + 4;
                                        const end = source.indexOf(')', start);
                                        const rawUrl = source.slice(start, end).replace(/['"]/g, '').trim();
                                        const absoluteUrl = new URL(rawUrl, document.baseURI).href;
                                        fontSources.push({ type: 'fontface', family, weight, src: `url("${absoluteUrl}")` });
                                    }
                                    // check in @layer inside @import
                                    if (importedRule.cssRules) {
                                        Array.from(importedRule.cssRules).forEach(layerRule => {
                                            if (layerRule instanceof CSSFontFaceRule) {
                                                const fontStyle = layerRule.style.getPropertyValue('font-style') || 'normal';
                                                const weight = layerRule.style.getPropertyValue('font-weight') || 'normal';
                                                if (fontStyle !== 'normal') return;
                                                const family = layerRule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim();
                                                const source = layerRule.style.getPropertyValue('src');
                                                if (!source || !source.includes('url(')) return;
                                                const start = source.indexOf('url(') + 4;
                                                const end = source.indexOf(')', start);
                                                const rawUrl = source.slice(start, end).replace(/['"]/g, '').trim();
                                                const absoluteUrl = new URL(rawUrl, document.baseURI).href;
                                                fontSources.push({ type: 'fontface', family, weight, src: `url("${absoluteUrl}")` });
                                            }
                                        });
                                    }
                                });
                            } catch(e) {}
                        }

                        // check in @layer
                        if (rule.cssRules) {
                            try {
                                Array.from(rule.cssRules).forEach(layerRule => {
                                    if (layerRule instanceof CSSFontFaceRule) {
                                        const fontStyle = layerRule.style.getPropertyValue('font-style') || 'normal';
                                        const weight = layerRule.style.getPropertyValue('font-weight') || 'normal';
                                        if (fontStyle !== 'normal') return;
                                        const family = layerRule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim();
                                        const source = layerRule.style.getPropertyValue('src');
                                        if (!source || !source.includes('url(')) return;
                                        const start = source.indexOf('url(') + 4;
                                        const end = source.indexOf(')', start);
                                        const rawUrl = source.slice(start, end).replace(/['"]/g, '').trim();
                                        const absoluteUrl = new URL(rawUrl, document.baseURI).href;
                                        fontSources.push({ type: 'fontface', family, weight, src: `url("${absoluteUrl}")` });
                                    }
                                });
                            } catch(e) {}
                        }
                    });

        } catch (e) {}
    });

    // This will kill all duplicate URLs if have multiple origins
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

export function addFontSources(fontSources) {
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

