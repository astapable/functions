// Source: https://stackoverflow.com/questions/16096482/what-does-http-https-and-all-urls-mean-in-the-context-of-ch
// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Source: https://developer.chrome.com/docs/extensions/reference/api/tabs#event-onActivated
chrome.tabs.onActivated.addListener(() => {
  chrome.runtime.sendMessage({ action: "tabSwitched" })
  // Error occured due to the  worker.js was sending sendMessage but my reveel wasnt opened yet. 
  // As I understand it .catch(() => {}) helps to just ignore the error until reveel.html opened.
  // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch 
    .catch(() => {}); 
});