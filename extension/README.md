# SpeakUp Chrome Extension

Captures page context from any website and opens SpeakUp with it pre-loaded, so you can practice discussing what you just read.

## Installation

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `extension/` folder

## Usage

1. Browse to any article or page you want to discuss
2. Click the **SpeakUp** extension icon in your toolbar
3. Select a conversation partner
4. Click **Open with [Partner] →**

SpeakUp will open in a new tab with the page context pre-loaded. You'll go straight to the pre-session brief — no need to pick a topic.

## Configuration

To point the extension at a different app URL, edit the top of `popup.js`:

```js
const APP_URL = "https://speakup-alexisamp.vercel.app";
```

## Notes

- The extension reads up to 600 characters of article/main content from the page
- No data is stored or sent anywhere except your SpeakUp app
- Works best on article pages (news, blogs, Wikipedia, etc.)
