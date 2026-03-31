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

            allElements.forEach((element) => { // I need to run through all the element in the tab. Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle
                const elementStyle = getComputedStyle(element); // This picks the element and returns its properties data applied in CSS. Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle. ChatGPT link where I accidentally found this function: https://chatgpt.com/share/69cc26c7-e5ac-8325-80d5-40bb5e8833c0
                data.push({ // While im running throug the elements in line 25, this picks data array and add elements to the end of data array until it runs out of the elements described in lines 28-34. Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push
                    // ChatGPT link about CSS data i can potentially get: https://chatgpt.com/share/69cc26c7-e5ac-8325-80d5-40bb5e8833c0
                    color: elementStyle.color,
                    backgroundColor: elementStyle.backgroundColor,
                    borderColor: elementStyle.borderColor,
                    fontFamily: elementStyle.fontFamily,
                    fontSize: elementStyle.fontSize,
                    fontWeight: elementStyle.fontWeight,
                    lineHeight: elementStyle.lineHeight
                });
            });

            return data; // Give me thar data from lines 28-34
        }
    });
    console.log(result[0].result); // Check if it works
}

// Called out the function dented in line 16
// Line 9_async function getTabId() doesnt need to start as it is called in line 16
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions
//ChatGPT link about splitting functions: https://chatgpt.com/share/69cc31f3-0e98-8332-be15-e81e8bbcc447
scanTab();