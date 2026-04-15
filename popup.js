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

function getContrastColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness > 128) {
        return 'var(--primary-black)';
    } else {
        return 'var(--primary-white)';
    }
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

            // MVP UPD_Ths is basically the same as line 30-32, the only diff is that Im calling out semantic elements related to text
            const textTags = ["h1","h2","h3","h4", "h5","h6","p","li","a","span","label"]; // Ok, this is a little different from line. 30. Here Im just calling for tag names (Might miss some, double chek later)
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

            return { colorData, textData }; // Give me thar data from lines 35-37 and 47-53
        }
    });

    // Here I keep all my results from pulling data from lines 35-37 and 47-53 and make it variable. Thus, I make it appropriate for reuse
    // I use result[0] since Im pulling data from single tab/page.
    // JS arrays starts from 0, so 1 frame/tab = [0]. 
    const retColorRaw = result[0].result.colorData;
    const retTextRaw = result[0].result.textData;
    
    // FONTFACE LIBRARY
    const { scanFonts, addFontSources } = await import('./fontface.js');
    const fontResult = await chrome.scripting.executeScript({
        target: { tabId },
        func: scanFonts,
    });
    addFontSources(fontResult[0].result);
    // FONTFACE LIBRARY

    const tagData = {}; // I create normal object  for the future dynamic keys. Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object 
    retTextRaw.forEach(el => { 
        if (!tagData[el.tag]) { // firs, I check if there are tag like h1, if there are not (logical NOT (!)) - move on. If there are, I add it to the {} from linr 60 and un throug other elements of forEach.
            tagData[el.tag] = el; // This what allow to put element with tag in the key and its properties in the value of the key. Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_accessors#property_names
        }
    });

    const fontCategories = {
        "Heading 1": ["h1"],
        "Heading 2": ["h2"],
        "Heading 3": ["h3, h4, h5, h6"],
        "Bodycopy": ["p","li","a","span","label"],
    };

    document.querySelector("#typo-summary").innerHTML =
        Object.entries(fontCategories).map(([category, tags]) => {
            const fonts = [...new Set(
                tags // tags are specified in line 42 and categorized in line 75-77
                    .filter(tag => tagData[tag])
                    .map(tag => tagData[tag].fontFamily.replaceAll('"', '').split(',')[0].trim()) // Changed substring(0... to split to cut off all '' and ,
                    .filter(f => f !== '' && !f.startsWith('-') && f !== 'system-ui') // I was still getting -apple-system sometimes so removed it
            )];
             // FONTFACE LIBRARY
            const firstTag = tags.find(t => tagData[t]);
            const weight = firstTag ? tagData[firstTag].fontWeight : 'normal';
            const fontName = fonts[0] || '';
            // FONTFACE LIBRARY

            return`
                <li>
                    <div class="text-category-wrapper">
                        <p class="font-category">${category}</p>
                        <p class="font-title" style="font-family: ${fontName}; font-weight: ${weight};">${fonts.join(", ") || "N/A"}</p> 
                    </div>
                </li>
            `;
        }).join(""); // || means OR. If font.joint is empty JS will return as - (N/A)

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

    // Note for self - Instances counter is here
    const colorCount = {};
    retColorRaw.forEach(el => {
        [el.color, el.backgroundColor, el.borderColor].forEach(c => {
            colorCount[c] = (colorCount[c] || 0) + 1;
        });
    });

    // I need empty separator betveen data elements so I use .join() to remove default comma as I wrap it in <li> with flex colun=mn in HTML
    // Moreover, .join() required to merge all elements in one string for HTML use. 
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join
    // COLOR SPEC
    document.querySelector("#all-colors").innerHTML = allUniColors.map(el =>
        `
        <li>
            <div class="color-box" style="--bg-color:${rgbStringToHex(el)};">
                <p style="color:${getContrastColor(rgbStringToHex(el))}">${rgbStringToHex(el)}</p>
                <p class="footnote" style="color:${getContrastColor(rgbStringToHex(el))}">${colorCount[el] || 0} instances</p>
            </div>  
        </li>
        `
    ).join("");

    document.querySelector("#color-summary").innerHTML = allUniColors.map(el =>
        `
        <li>
            <div class="summary-color-box" style="--bg-color:${rgbStringToHex(el)}"></div>  
        </li>
        `
    ).join("");

    // MVP UPD_This was hard to find to be honest. I went through this the Working with Objects at some point in my research
    // I fin this line of text talking about listing obj propertiess - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects#enumerating_properties
    // I find this line of text which made me think about using this function - "If you need both the property keys and values, use Object.entries() instead.
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys#description
    // ChatGPT link to clarify the difference in terms of my task: https://chatgpt.com/share/69d56cb5-33f4-8326-b4aa-aedaa2654205
    // TYPO SPEC
    // Added some sorting befor getting into HTML. I didnt like how random it was across mmultiple sites
    const tagOrder = ["h1","h2","h3","h4","h5","h6","p","li","a","span","label"];

    document.querySelector("#typography").innerHTML =
    Object.entries(tagData)
        .sort(([a], [b]) => tagOrder.indexOf(a) - tagOrder.indexOf(b))
        .map(([tag, data]) =>
        //line 135 - example from Michael's link - substring(indexStart, indexEnd). M's Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring
        // In my case indexStart = 0 (ie first element, remeber 0 is always first number), indexEnd = indexOf(",")
        // indexOf(",") looking for value before (",") and take it to my execution. Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/indexOf#using_indexof
        `
        <li class="text-category-wrapper">
            <header class="box-title">
                <p class="tag">${tag}</p>
                <p class="footnote">Number of instances</p>
            </header>
            <dl>
                <dt>Font Family</dt>
                <dd>${data.fontFamily.replaceAll('"', '').split(',')[0].trim()}</dd>
            </dl>
            <dl>
                <dt>Font Size</dt>
                <dd>${data.fontSize}</dd>
            </dl>
            <dl>
                <dt>Line Height</dt>
                <dd>${data.lineHeight}</dd>
            </dl>
            <dl>
                <dt>Font Weight</dt>
                <dd>${data.fontWeight}</dd>
            </dl>
            <dl>
                <dt>Spacing</dt>
                <dd>${data.letterSpacing}</dd>
            </dl>
            <dl>
                <dt>Text Color</dt>
                <dd class="text-color">
                    <div class="text-color-box" style="--bg-color:${rgbStringToHex(data.color)}"></div>
                    <p>${rgbStringToHex(data.color)}</p>
                </dd>
            </dl>
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

// Youtube tutorial source: https://www.youtube.com/shorts/s0iqAUbxuBs
const navButtons = document.querySelectorAll('.nav-wrapper-bottom button');
const indicator = document.querySelector('.on');

// Note for self - filter here
document.querySelector('.bottom').addEventListener('click', e => {
    const tabButton = e.target.closest('button[data-filter]');
    if (!tabButton) return;

    document.querySelectorAll('.bottom button').forEach(b => b.classList.remove('active'));
    tabButton.classList.add('active');

    // Note for myself - slider here
    const buttonIndex = Array.from(navButtons).indexOf(tabButton);
    indicator.style.left = (100 / navButtons.length) * buttonIndex + (50 / navButtons.length) + '%';

    const filter = tabButton.dataset.filter;
    document.querySelectorAll('main section').forEach(section => {
        section.classList.toggle('hidden', section.dataset.category !== filter);
    });
});

document.querySelector('.bottom button[data-filter="home"]').click();

