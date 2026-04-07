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
            // MVP UPD_So I decided to bring all colors and typo spec colors as a separete callouts. This decision was made to male my life easier.
            const allColors = document.querySelectorAll("*"); // I need to run through all the element in the tab. Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle
            const colorData = []; // Now I need an empty array to store upcoming data. Source: https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array
            allColors.forEach((el) => { 
                const elStyle = getComputedStyle(el); // This picks the element and returns its properties data applied in CSS. Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle. ChatGPT link where I accidentally found this function: https://chatgpt.com/share/69cc26c7-e5ac-8325-80d5-40bb5e8833c0
                colorData.push({ // While im running throug the elements in line 25, this picks data array and add elements to the end of data array until it runs out of the elements described in lines 27-29. Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push
                    color: elStyle.color,
                    backgroundColor: elStyle.backgroundColor,
                    borderColor: elStyle.borderColor,
                });
            });

            // MVP UPD_Ths is basically the same as line 22-32, the only diff is that Im calling out semantic elements related to text
            const textTags = ["h1","h2","h3","h4","h5","h6","p","li","a","span","label"]; // MVP UPD_ok, this is a little different from line. 22. Here Im just calling for tag names (Might miss some, double chek later)
            const textData = []; 
            document.querySelectorAll(textTags.join(",")).forEach((el) => { // MVP UPD_heres where I turn line 35 tags into selectors
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


            return { colorData, textData }; // Give me thar data from lines 27-29 and 39-45
        }
    });

    // Here I keep all my results from pulling data from lines 27-29 and 39-45 and make it variable. Thus, I make it appropriate for reuse
    // I use result[0] since Im pulling data from single tab/page.
    // JS arrays starts from 0, so 1 frame/tab = [0]. 
    const retColorRaw = result[0].result.colorData;
    const retTextRaw = result[0].result.textData;

    
    // I used the knowledge I got from my other JS class. We used Array.from to merge data into one array to sort it later
    // The difference here is ther data in other class is taken from the same objects. So its like differen properties of the same thing
    // Source_Line 41-48: https://github.com/astapable/into-data-viz/blob/main/02_quantities/02_stacked_bars/bar_stacked.js
    // Here I have all unique independant elements so I make an Array.from for every element Im pulling from lines 27-29 and 39-45 to get only unique ones

    // Source Set(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
    // Source new Set(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new
    // Source Array.from(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
    // ChatGPT link: https://chatgpt.com/share/69cc847f-0c98-8329-b513-9815df07996a
    // FOR FUTURE UPDATES_Source about spread: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
    // COLOR SPEC
    const uniColors = Array.from(new Set(retColorRaw.map(el => el.color)));
    const uniBackColors = Array.from(new Set(retColorRaw.map(el => el.backgroundColor)));
    const uniBorderColors = Array.from(new Set(retColorRaw.map(el => el.borderColor)));
    // TEXT SPEC
    const uniFontFamilies = Array.from(new Set(retTextRaw.map(el => el.fontFamily)));
    const uniFontSizes = Array.from(new Set(retTextRaw.map(el => el.fontSize)));
    const uniLineHeights = Array.from(new Set(retTextRaw.map(el => el.lineHeight)));
    const uniFontWeights = Array.from(new Set(retTextRaw.map(el => el.fontWeight)));
    const uniLetterSpacings = Array.from(new Set(retTextRaw.map(el => el.letterSpacing)));
    const uniTextColors = Array.from(new Set(retTextRaw.map(el => el.color)));

    // I need empty separator betveen data elements so I use .join() to remove default comma as I wrap it in <li> with flex colun=mn in HTML
    // Moreover, .join() required to merge all elements in one string for HTML use. 
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join
    // COLOR SPEC
    const uniColorsList = document.querySelector("#uniColors");
    uniColorsList.innerHTML = uniColors.map(el => `<li>${el}</li>`).join(""); 

    const uniBackColorsList = document.querySelector("#uniBackColors");
    uniBackColorsList.innerHTML = uniBackColors.map(el => `<li>${el}</li>`).join("");

    const uniBorderColorsList = document.querySelector("#uniBorderColors");
    uniBorderColorsList.innerHTML = uniBorderColors.map(el => `<li>${el}</li>`).join("");

    // TEST SPEC
    const uniFontFamiliesList = document.querySelector("#uniFontFamilies");
    uniFontFamiliesList.innerHTML = uniFontFamilies.map(el =>
        `
        <li>
            <p>Font Family</p>
            <p>${el}</p>
        </li>
        `
    ).join("");

    const uniFontSizesList = document.querySelector("#uniFontSizes");
    uniFontSizesList.innerHTML = uniFontSizes.map(el =>
        `
        <li>
            <p>Font Size</p>
            <p>${el}</p>
        </li>
        `
    ).join("");

    const uniLineHeightsList = document.querySelector("#uniLineHeights");
    uniLineHeightsList.innerHTML = uniLineHeights.map(el =>
        `
        <li>
            <p>Line Height</p>
            <p>${el}</p>
        </li>
        `
    ).join("");

    const uniFontWeightsList = document.querySelector("#uniFontWeights");
    uniFontWeightsList.innerHTML = uniFontWeights.map(el => 
        `
        <li>
            <p>Weight</p>
            <p>${el}</p>
        </li>
        `
    ).join("");

    const uniLetterSpacingsList = document.querySelector("#uniLetterSpacings");
    uniLetterSpacingsList.innerHTML = uniLetterSpacings.map(el => 
        `
        <li>
            <p>Letter Spacing</p>
            <p>${el}</p>
        </li>
        `
    ).join("");

    const uniTextColorsList = document.querySelector("#uniTextColors");
    // uniTextColorsList.innerHTML = uniTextColors.map(el => `<li>${el}</li>`).join("");
    uniTextColorsList.innerHTML = uniTextColors.map(el => 
        `
        <li>
            <p>Text Color</p>
            <div class="text-color">
                <div class="color-box" style="background-color:${el}"></div>
                <p>${el}</p>
            </div>
        </li>
        `
    ).join("");
}

// Called out the function denoted in line 14
// The browser read the core from top to bottom
// When it sees the function from line 14 it accnowledge it but not stert it
// When browser reads scanTab() that is when it starts it. This was mentioned by Eric in the extension loom demo
// Line 7_async function getTabId() doesnt need to start as it is called in line 14
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions
scanTab();