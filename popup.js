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

document.querySelector('#ext-refresh').addEventListener('click', () => {
    scanTab(); // same thing as in line 27-31, just another button do refresh
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
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const scanNameResult = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.title
    });
    document.querySelector('#scanned-website-name').textContent = scanNameResult[0].result || 'Ooops, no title here';
    document.querySelector('#scanned-website-link').href = activeTab.url;
    document.querySelector('#back-to-tab').dataset.tabId = activeTab.id;

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

    // Note for myself - Text instance counrer is here
    const tagCount = {};
    retTextRaw.forEach(el => {
        tagCount[el.tag] = (tagCount[el.tag] || 0) + 1;
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

    // Note for self - Color instances counter is here
    const colorInstance = {};
    retColorRaw.forEach(el => {
        [el.color, el.backgroundColor, el.borderColor].forEach(c => {
            colorInstance[c] = (colorInstance[c] || 0) + 1;
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
            <div class="color-box-text">
                <h4 style="color:${getContrastColor(rgbStringToHex(el))}">${rgbStringToHex(el)}</h4>
                <p class="footnote" style="color:${getContrastColor(rgbStringToHex(el))}">${colorInstance[el] || 0} instances</p>
            </div>
                <button class="copy-to-clipboard" style="color:${getContrastColor(rgbStringToHex(el))};">
                    <div class="icon-wrapper">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <g clip-path="url(#clip0_72_7)"> <path d="M9.45454 8.14349C9.45454 7.72498 9.45431 7.45438 9.4375 7.24861C9.4214 7.05162 9.39394 6.97836 9.37571 6.9425C9.30623 6.80614 9.19467 6.69497 9.05752 6.62503C9.02154 6.60669 8.94814 6.57937 8.75071 6.56324C8.54471 6.5464 8.27372 6.54548 7.8544 6.54548H3.78196C3.36265 6.54548 3.0918 6.5464 2.88565 6.56324C2.68797 6.57939 2.61474 6.60673 2.57883 6.62503C2.44202 6.69475 2.33108 6.80569 2.26136 6.9425C2.24306 6.97841 2.21572 7.05164 2.19957 7.24932C2.18273 7.45547 2.18181 7.72632 2.18181 8.14562V12.2181C2.18181 12.6374 2.18273 12.9084 2.19957 13.1144C2.21571 13.3118 2.24302 13.3852 2.26136 13.4212C2.3313 13.5583 2.44247 13.6699 2.57883 13.7394C2.61469 13.7576 2.68795 13.7851 2.88494 13.8012C3.09071 13.818 3.36132 13.8182 3.77982 13.8182H7.85724C8.27569 13.8182 8.54582 13.818 8.75142 13.8012C8.94848 13.785 9.02165 13.7577 9.05752 13.7394C9.19414 13.6698 9.30587 13.5575 9.37571 13.4205C9.39397 13.3845 9.42143 13.3113 9.4375 13.1151C9.45431 12.9094 9.45454 12.6387 9.45454 12.2202V8.14349ZM10.9091 9.45457H12.2202C12.6387 9.45457 12.9094 9.45434 13.1151 9.43753C13.3113 9.42146 13.3845 9.394 13.4204 9.37574C13.5574 9.30594 13.6697 9.19422 13.7393 9.05755C13.7577 9.02161 13.785 8.94818 13.8011 8.75074C13.818 8.54467 13.8182 8.27374 13.8182 7.85443V3.78199C13.8182 3.36276 13.818 3.09173 13.8011 2.88568C13.785 2.68843 13.7577 2.61488 13.7393 2.57886C13.6699 2.4425 13.5583 2.33133 13.4212 2.26139C13.3852 2.24305 13.3118 2.21574 13.1143 2.1996C12.9083 2.18276 12.6374 2.18184 12.218 2.18184H8.14559C7.72629 2.18184 7.45544 2.18276 7.24929 2.1996C7.05161 2.21575 6.97838 2.24309 6.94247 2.26139C6.80566 2.33111 6.69471 2.44205 6.625 2.57886C6.6067 2.61477 6.57935 2.68801 6.56321 2.88568C6.54637 3.09183 6.54545 3.36268 6.54545 3.78199V5.09093H7.8544C8.2497 5.09093 8.59033 5.09015 8.86931 5.11295C9.15678 5.13645 9.44292 5.18868 9.71804 5.32886C10.128 5.53781 10.4618 5.87122 10.6712 6.28199C10.8113 6.55698 10.8636 6.84285 10.8871 7.13C10.9098 7.40875 10.9091 7.74896 10.9091 8.14349V9.45457ZM15.2727 7.85443C15.2727 8.24974 15.2735 8.59031 15.2507 8.86934C15.2272 9.1567 15.1749 9.44232 15.0348 9.71736C14.8255 10.128 14.4913 10.4621 14.081 10.6712C13.806 10.8113 13.5201 10.8636 13.2329 10.8871C12.9544 10.9099 12.6145 10.9091 12.2202 10.9091H10.9091V12.2202C10.9091 12.6145 10.9098 12.9544 10.8871 13.233C10.8636 13.5201 10.8113 13.806 10.6712 14.081C10.4622 14.4912 10.1286 14.8255 9.71804 15.0348C9.4431 15.1749 9.15717 15.2273 8.87002 15.2507C8.59142 15.2735 8.2517 15.2728 7.85724 15.2728H3.77982C3.3853 15.2728 3.04508 15.2735 2.76633 15.2507C2.47918 15.2273 2.19331 15.1749 1.91832 15.0348C1.50756 14.8255 1.17414 14.4916 0.965194 14.0817C0.825018 13.8066 0.772786 13.5204 0.749285 13.233C0.726485 12.954 0.727268 12.6134 0.727268 12.2181V8.14562C0.727268 7.75031 0.726489 7.4098 0.749285 7.13071C0.772778 6.84323 0.82499 6.55715 0.965194 6.28199C1.17436 5.87154 1.50787 5.53802 1.91832 5.32886C2.19348 5.18866 2.47957 5.13644 2.76704 5.11295C3.04614 5.09016 3.38664 5.09093 3.78196 5.09093H5.0909V3.78199C5.0909 3.38667 5.09012 3.04617 5.11292 2.76707C5.13641 2.4796 5.18863 2.19351 5.32883 1.91835C5.53799 1.5079 5.87151 1.17439 6.28196 0.965224C6.55712 0.825021 6.8432 0.772808 7.13068 0.749315C7.40977 0.726519 7.75027 0.727298 8.14559 0.727298H12.218C12.6133 0.727298 12.954 0.726516 13.2329 0.749315C13.5204 0.772816 13.8066 0.825049 14.0817 0.965224C14.4916 1.17417 14.8255 1.50758 15.0348 1.91835C15.175 2.19352 15.2272 2.47956 15.2507 2.76707C15.2735 3.0461 15.2727 3.38668 15.2727 3.78199V7.85443Z" fill="currentColor"/> </g> <defs> <clipPath id="clip0_72_7"> <rect width="16" height="16" fill="currentColor"/> </clipPath> </defs> </svg>
                    </div>
                </button>
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
                <p class="tag">${tagCount[tag] || 0} instances</p>
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

document.querySelector('#back-to-tab').addEventListener('click', () => {
    const tabId = document.querySelector('#back-to-tab').dataset.tabId;
    if (tabId) chrome.tabs.update(parseInt(tabId), { active: true });
});

// Source: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard
document.addEventListener('click', e => {
    const clipButton = e.target.closest('.copy-to-clipboard');
    if (!clipButton) return;
    const hex = clipButton.closest('li').querySelector('h4').textContent;
    navigator.clipboard.writeText(hex).then(
        () => { clipButton.classList.add('copied'); setTimeout(() => clipButton.classList.remove('copied'), 1000); },
        () => { console.error('ooops, failed'); }
    );
});

