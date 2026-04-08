// https://stackoverflow.com/questions/16096482/what-does-http-https-and-all-urls-mean-in-the-context-of-ch
// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));