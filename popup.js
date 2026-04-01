console.log("This is a popup!")

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
    // Wait until line 9_getTabId() is finished and return it as a variable here
    const tabId = await getTabId();
    const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            const allElements = document.querySelectorAll("*"); // Select all the elements in the tab. Spirce: https://developer.mozilla.org/en-US/docs/Web/API/Document/all
            const data = []; // Now I need an empty array to store upcoming data. Source: https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array

            allElements.forEach((el) => { // I need to run through all the element in the tab. Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle
                const elStyle = getComputedStyle(el); // This picks the element and returns its properties data applied in CSS. Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle. ChatGPT link where I accidentally found this function: https://chatgpt.com/share/69cc26c7-e5ac-8325-80d5-40bb5e8833c0
                data.push({ // While im running throug the elements in line 25, this picks data array and add elements to the end of data array until it runs out of the elements described in lines 28-34. Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push
                    color: elStyle.color,
                    backgroundColor: elStyle.backgroundColor,
                    borderColor: elStyle.borderColor,
                    fontFamily: elStyle.fontFamily,
                    fontSize: elStyle.fontSize,
                    fontWeight: elStyle.fontWeight,
                    lineHeight: elStyle.lineHeight
                });
            });

            return data; // Give me thar data from lines 28-34
        }
    });

    // Here I keep all my results from pulling data from lines 28-34 and make it variable. Thus, I make it appropriate for reuse
    // I use result[0] since Im pulling data from single tab/page.
    // JS arrays starts from 0, so 1 frame/tab = [0]. 
    const retDataRaw = result[0].result; 
    
    // I used the knowledge I got from my other JS class. We used Array.from to merge data into one array to sort it later
    // The difference here is ther data in other class is taken from the same objects. So its like differen properties of the same thing
    // Source_Line 41-48: https://github.com/astapable/into-data-viz/blob/main/02_quantities/02_stacked_bars/bar_stacked.js
    // Here I have all unique independant elements so I make an Array.from for every element Im pulling from lines 28-34 to get only unique ones
    // Source Set(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
    // Source new Set(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new
    // Source Array.from(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
    // ChatGPT link: https://chatgpt.com/share/69cc847f-0c98-8329-b513-9815df07996a
    // FOR FUTURE UPDATES_Source about spread: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
    const uniColors = Array.from(new Set(retDataRaw.map(el => el.color)));
    const uniBackColors = Array.from(new Set(retDataRaw.map(el => el.backgroundColor)));
    const uniBorderColors = Array.from(new Set(retDataRaw.map(el => el.borderColor)));
    const uniFontFamilies = Array.from(new Set(retDataRaw.map(el => el.fontFamily)));
    const uniFontSizes = Array.from(new Set(retDataRaw.map(el => el.fontSize)));
    const uniFontWeights = Array.from(new Set(retDataRaw.map(el => el.fontWeight)));
    const uniLineHeights = Array.from(new Set(retDataRaw.map(el => el.lineHeight)));
    
    console.log(uniColors);
    console.log(uniBackColors);
    console.log(uniBorderColors);
    console.log(uniFontFamilies);
    console.log(uniFontSizes);
    console.log(uniFontWeights);
    console.log(uniLineHeights);
}

// Called out the function denoted in line 16
// The browser read the core from top to bottom
// When it sees the function from line 16 it accnowledge it but not stert it
// When browser reads scanTab() that is when it starts it. This was mentioned by Eric in the extension loom demo
// Line 9_async function getTabId() doesnt need to start as it is called in line 16
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions
scanTab();