# Project 5: Functions by Evgenii Astapov
## About
This Chrome extension was created as a final Project 5 for Typography & Interaction Course at Parsons School of Design in 2026.

Tendril is a browser extension that turns any website into a quick design reference — inspect fonts, text styles, and colors in your browser side panel.

I called the product Tendril as the name felt right for something flexible, light, and able to reach exactly where it needs to.  A tendril naturally stretches out, grabs onto things, and finds what it needs — which is pretty close to what the extension does. It pulls the useful design data out of a live website exactly when you need it, without making the process feel heavy or overcomplicated.


For the brand elements, I used a more classic doodle-like shape paired with a digital color palette. 
I wanted it to feel playful and recognizable, but still subtle enough to let the scanned content stand out as the key piece of information.

## Who is it for?
Designers, product people, graphic designers, and honestly anyone who’s into design and wants to better understand how websites are built.

## What I'm solving with Tendril?
Every respectable product or web designer spends millions of hours looking for references. 
And when they finally find something that can actually serve as an inspiration for their project, they spend another million hours collecting all those references. That includes keeping a ridiculous number of tabs open and manually pulling data out of them.  The list is huge and includes things like color pairs used across the website, its design system, typography pairs, which fonts are used for which semantic elements, sizes, and all that stuff.

Usually all of this is done for one reason: to put together a moodboard for the next presentation.
My extension, Tendril, is built to make that painful path a lot easier.

Open a website, click the extension icon, and pull data from the already analyzed DOM that you can later use in your Figma. No screenshots, no color-picking one element at a time, no installing 10 different extensions just to figure out which font is being used and where. Everything important and actually useful is in one place.

There are few things awailable now:
1. Fonts Summary — an overview of the main typeface categories found on the page: Heading 1-3, and Bodycopy, rendered in their actual fonts and weights.
2. Fonts — a detailed breakdown of semantic text elements (h1–h6, p, li, a, span, label) with font family, size, line height, weight, and letter spacing.
3. Colors — a full color palette extracted from text, backgrounds, and borders across the page.
   Colors are deduplicated and sorted from most used to least used, with usage counts. Each color can be copied to clipboard.

Tendril can also help identify development issues related to semantics and SEO. Since it scans the actual DOM structure of a live page, it only displays elements that are truly present. So if a website is missing an h1, uses an inconsistent heading structure, or lacks expected semantic text elements, that will be reflected in the extension output right away.

## How to Install
1. Download or clone this repository
2. Open Chrome and go to chrome://extensions
3. Enable Developer Mode in the top right
4. Click Load unpacked and select the project folder in the extension
6. Click the Tendril icon in the toolbar to open the side panel

That’s it — the extension is ready to use.

## Learnings
Key learning for this very challengin project:
1. Building a new kind of product — a Chrome extension
2. Scanning and processing computed styles across all DOM elements
3. Converting RGB values to HEX by parsing color strings
4. Dynamic font rendering using @font-face injection from scanned pages — this part was especially hard
5. Sorting and filtering data before rendering it into HTML
6. Improving the overall code structure and CSS variable system
7. Last but not least - time management.I handled this project better then previous ones in terms of time quatity

## Sources
Key resources that helped bring this project to life:
Chrome Extensions API (What kind of bast extension is) — https://developer.chrome.com/docs/extensions/reference/api/scripting
Chrome Side Panel API (User experience defining) — https://developer.chrome.com/docs/extensions/reference/api/sidePanel
MDN (overal coding resource) - https://developer.mozilla.org/en-US/docs/Web/JavaScript
MDN getComputedStyle (most important) — https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle
Nav indicator animation (Nothing can beat YouTube 1) — https://www.youtube.com/shorts/s0iqAUbxuBs
RGB to HEX explanation (Nothing can beat YouTube 1) — https://www.youtube.com/watch?v=5wMGpvglcfg

## Typography License

Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git)
This Font Software is licensed under the SIL Open Font License, Version 1.1.
https://openfontlicense.org

Copyright 2024 The Doto Project Authors
This Font Software is licensed under the SIL Open Font License, Version 1.1.
https://openfontlicense.org
