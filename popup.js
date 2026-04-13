// Same as I end up with but oldscool (no (x) => - Eric mentioned that it is the modern way): https://www.youtube.com/shorts/0x4Ig5tOIQo
// Youube RGB to HEX with regular expression explanation:https://www.youtube.com/watch?v=5wMGpvglcfg
function rgbToHex(r, g, b) {
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbStringToHex(rgbString) {
    const [r, g, b] = rgbString.match(/\d+/g).map(Number);
    return rgbToHex(r, g, b);
}

// Source: https://developer.chrome.com/docs/extensions/reference/api/tabs#open_an_extension_page_in_a_new_tab
// Source: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'tabSwitched') {
        scanTab(); // When user switch tab run scanTab()
    }
});

// Removed content_scripts from original demo manifest.json since I will use executeScript
// Why executeScript? My popup.js will control the outcome
// The extension will not work automatically after the page loads
// It will work after User opened my popup.js by clicking on the extension icon
// Also executeScript can return data to my popup.js. On contrary content_scripts requires sendMessage to do so
// Source: https://developer.chrome.com/docs/extensions/reference/api/scripting
async function getTabId() {
    // async means 'There are something you need to wait for'
    // await means 'Wait for me'
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab.id;
}

async function scanTab() {
    // Wait until line 7_getTabId() is finished and return it as a variable here
    const tabId = await getTabId();
    const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            // Select all the elements in the tab. Spirce: https://developer.mozilla.org/en-US/docs/Web/API/Document/all
            // So I decided to bring all colors and typo spec colors as a separete callouts. This decision was made to male my life easier.
            const allColors = document.querySelectorAll("*"); // I need to run through all the element in the tab. Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle
            const colorData = []; // Now I need an empty array to store upcoming data. Source: https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array
            allColors.forEach((el) => { 
                const elStyle = getComputedStyle(el); // This picks the element and returns its properties data applied in CSS. Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle. ChatGPT link where I accidentally found this function: https://chatgpt.com/share/69cc26c7-e5ac-8325-80d5-40bb5e8833c0
                colorData.push({ // While im running throug the elements in line 32, this picks data array and add elements to the end of data array until it runs out of the elements described in lines 27-29. Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push
                    color: elStyle.color,
                    backgroundColor: elStyle.backgroundColor,
                    borderColor: elStyle.borderColor,
                });
            });

            // Ths is basically the same as line 30-32, the only diff is that Im calling out semantic elements related to text
            const textTags = ["h1","h2","h3","h4","h5","h6","p","li","a","span","label"]; // Ok, this is a little different from line. 30. Here Im just calling for tag names (Might miss some, double chek later)
            const textData = []; 
            document.querySelectorAll(textTags.join(",")).forEach((el) => { // Heres where I turn line 42 tags into selectors
                const elStyle = getComputedStyle(el);
                textData.push({ 
                    tag: el.tagName.toLowerCase(),
                    fontFamily: elStyle.fontFamily,
                    fontSize: elStyle.fontSize,
                    lineHeight: elStyle.lineHeight,
                    fontWeight: elStyle.fontWeight,
                    letterSpacing: elStyle.letterSpacing,
                    color: elStyle.color,
                });
            });
            
// NEW NEW NEW
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

            // 2. Check @import
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
            function checkFontFace(rule) {
                const family = rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim(); // get font name
                const source = rule.style.getPropertyValue('src'); // get font URL ie where it lives
                if (!source || !source.includes('url(')) return; // skip prev rule if URL is empty
                // 'cut out' the URL and skip url( stage and skip url( stage
                const start = source.indexOf('url(') + 4; 
                const end = source.indexOf(')', start);
                const rawUrl = source.slice(start, end).replace(/['"]/g, '').trim();
                const absoluteUrl = new URL(rawUrl, document.baseURI).href; // now cnvert relative path to absolute
                fontSources.push({ type: 'fontface', family, src: `url("${absoluteUrl}")` }); // adding founded fonts to the push
            }

            Array.from(document.styleSheets).forEach(sheet => {
                try {
                    Array.from(sheet.cssRules || []).forEach(rule => {

                        // check in @font-face
                        if (rule instanceof CSSFontFaceRule) {
                            checkFontFace(rule);
                        }
                        // So fonts could be loaded via <link>, @import, or @font-face. But once I started testing on real websites, it turned out that simply checking @font-face inside stylesheets was not enough
                        // Spec in typo course site using the console, I found that CSS rules were structured like matreshka:
                        // @import pointing to another file, and inside that file the @font-face was hidden inside an @layer block. So to get font, I had to go inside @import via rule.styleSheet.cssRules first, then go one level deeper into @layer via importedRule.cssRules
                        // Only there did I finally find the @font-face.
                        // check in @import
                        if (rule instanceof CSSImportRule && rule.styleSheet) {
                            try {
                                Array.from(rule.styleSheet.cssRules || []).forEach(importedRule => {
                                    if (importedRule instanceof CSSFontFaceRule) {
                                        checkFontFace(importedRule);
                                    }
                                    // check in @layer inside @import. Find it in the typo course site
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

            // This will kill all duplicate URLs if have multiple origins
            const seenUrls = new Set();
            const uniqueFontSources = fontSources.filter(source => {
                if (source.type === 'link') {
                    if (seenUrls.has(source.url)) return false;
                    seenUrls.add(source.url);
                }
                return true;
            });

            return { colorData, textData, fontSources: uniqueFontSources }; // Give me thar data from lines 35-37 and 47-53
        }
    });
// NEW NEW NEW

    // Here I keep all my results from pulling data from lines 35-37 and 47-53 and make it variable. Thus, I make it appropriate for reuse
    // I use result[0] since Im pulling data from single tab/page.
    // JS arrays starts from 0, so 1 frame/tab = [0]. 
    if (!result[0].result) return;
    const retColorRaw = result[0].result.colorData;
    const retTextRaw = result[0].result.textData;

// NEW NEW NEW
    const retFontSources = result[0].result.fontSources;
    // after checking sources in line 7--137 I need to apply font sources to my  popup so fonts appear correctly in the extension
    retFontSources.forEach(source => {
        if (source.type === 'link') {
            if (!document.querySelector(`link[href="${source.url}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = source.url;
                document.head.appendChild(link);
            }
        } else if (source.type === 'fontface') {
            const style = document.createElement('style');
            style.textContent = `@font-face { font-family: "${source.family}"; src: ${source.src}; }`;
            document.head.appendChild(style);
        }
    });
// NEW NEW NEW  

    const tagData = {}; // I create normal object  for the future dynamic keys. Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object 
    retTextRaw.forEach(el => { 
        if (!tagData[el.tag]) { // firs, I check if there are tag like h1, if there are not (logical NOT (!)) - move on. If there are, I add it to the {} from linr 60 and un throug other elements of forEach.
            tagData[el.tag] = el; // This what allow to put element with tag in the key and its properties in the value of the key. Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_accessors#property_names
        }
    });

    const fontCategories = {
        Display: ["h1"],
        Heading: ["h2", "h3", "h4", "h5", "h6"],
        Body: ["p","li","a","span","label"],
    };

    document.querySelector("#typo-summary").innerHTML =
        Object.entries(fontCategories).map(([category, tags]) => {
            const fonts = [...new Set(
                tags // tags are specified in line 42 and categorized in line 75-77
                    .filter(tag => tagData[tag])
                    .map(tag => tagData[tag].fontFamily.replaceAll('"', '').split(',')[0].trim()) // Changed substring(0... to split to cut off all '' and ,
                        .filter(f => f !== '' && !f.startsWith('-') && f !== 'system-ui') // I was still getting -apple-system sometimes so removed it
            )];
            return`
                <li>
                    <div class="text-category-wrapper">
                        <p class="font-category">${category}</p>
                        <p class="font-title">${fonts.join(", ") || "N/A"}</p>
                    </div>
                </li>
            `;
        }).join(""); // || means OR. If font.joint is empty JS will return as - (N/A)

// NEW NEW NEW  
        // Trying to apply source URL font to .font-title
        document.querySelectorAll('.font-title').forEach(el => {
            const fontName = el.textContent.split(',')[0].trim();
            el.style.fontFamily = fontName;
        });
// NEW NEW NEW  
    // I used the knowledge I got from my other JS class. We used Array.from to merge data into one array to sort it later
    // The difference here is ther data in other class is taken from the same objects. So its like differen properties of the same thing
    // Source_Line 41-48: https://github.com/astapable/into-data-viz/blob/main/02_quantities/02_stacked_bars/bar_stacked.js
    // Here I have all unique independant elements so I make an Array.from for every element Im pulling from lines 35-37 and 47-53 to get only unique ones

    // Source Set(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
    // Source new Set(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new
    // Source Array.from(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
    // ChatGPT link: https://chatgpt.com/share/69cc847f-0c98-8329-b513-9815df07996a
    // FOR FUTURE UPDATES_Source about spread: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
    // COLOR SPEC
    // ChatGPT link: https://chatgpt.com/share/69d5808c-6a78-832a-a0c1-b0f049a9d6c1
    const uniColors = Array.from(new Set(retColorRaw.map(el => el.color)));
    const uniBackColors = Array.from(new Set(retColorRaw.map(el => el.backgroundColor)));
    const uniBorderColors = Array.from(new Set(retColorRaw.map(el => el.borderColor)));
    const allUniColors = Array.from(new Set([
        ...uniColors,
        ...uniBackColors,
        ...uniBorderColors
    ]));

    // I need empty separator betveen data elements so I use .join() to remove default comma as I wrap it in <li> with flex colun=mn in HTML
    // Moreover, .join() required to merge all elements in one string for HTML use. 
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join
    // COLOR SPEC
    document.querySelector("#all-colors").innerHTML = allUniColors.map(el =>
        `
        <li>
            <div class="color-box" style="background-color:${rgbStringToHex(el)}">
                <p>${rgbStringToHex(el)}</p>
                <p class="footnote">Number of instances</p>
            </div>  
        </li>
        `
    ).join("");

    document.querySelector("#color-summary").innerHTML = allUniColors.map(el =>
        `
        <li>
            <div class="summary-color-box" style="background-color:${rgbStringToHex(el)}"></div>  
        </li>
        `
    ).join("");

    // MVP UPD_This was hard to find to be honest. I went through this the Working with Objects at some point in my research
    // I fin this line of text talking about listing obj propertiess - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects#enumerating_properties
    // I find this line of text which made me think about using this function - "If you need both the property keys and values, use Object.entries() instead.
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys#description
    // ChatGPT link to clarify the difference in terms of my task: https://chatgpt.com/share/69d56cb5-33f4-8326-b4aa-aedaa2654205
    // TYPO SPEC
    document.querySelector("#typography").innerHTML = 
    Object.entries(tagData).map(([tag, data]) => 
        //line 135 - example from Muchael's link - substring(indexStart, indexEnd). M's Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring
        // In my case indexStart = 0 (ie first element, remeber 0 is always first number), indexEnd = indexOf(",")
        // indexOf(",") looking for value before (",") and take it to my execution. Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/indexOf#using_indexof
        `
        <li class="text-category-wrapper">
            <header class="box-title">
                <p class="tag">${tag}</p>
                <p class="footnote">Number of instances</p>
            </header>
            <div class="data-wrapper">
                <p class="label">Font Family</p>
                <p class="value">${data.fontFamily.replaceAll('"', '').substring(0, data.fontFamily.indexOf(","))}</p>
            </div>
            <div class="data-wrapper">
                <p class="label">Font Size</p>
                <p class="value">${data.fontSize}</p>
            </div>
            <div class="data-wrapper">
                <p class="label">Line Height</p>
                <p class="value">${data.lineHeight}</p>
            </div>
            <div class="data-wrapper">
                <p class="label">Font Weight</p>
                <p class="value">${data.fontWeight}</p>
            </div>
            <div class="data-wrapper">
                <p class="label">Letter Spacing</p>
                <p class="value">${data.letterSpacing}</p>
            </div>
            <div class="data-wrapper">
                <p class="label">Text Color</p>
                <div class="text-color">
                    <div class="text-color-box" style="background-color:${rgbStringToHex(data.color)}"></div>
                    <p>${rgbStringToHex(data.color)}</p>
                </div>
            </div>
        </li>
        `
    ).join("");
}

// Called out the function denoted in line 22
// The browser read the core from top to bottom
// When it sees the function from line 22 it accnowledge it but not stert it
// When browser reads scanTab() that is when it starts it. This was mentioned by Eric in the extension loom demo
// Line 15_async function getTabId() doesnt need to start as it is called in line 22
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions
scanTab();



