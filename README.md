# StreamGrabber (Chrome Extension - Manifest V3)

Fast, reliable video, audio, and HLS (`.m3u8`) stream detector and downloader for Google Chrome.

## 🚀 Features

- **In-Popup Video Preview Player:** Click on any video thumbnail or the Preview button to watch and verify streams directly inside the extension popup before downloading.
- **Multi-Bitrate HLS Quality Selector:** Choose your preferred video resolution and bitrate (e.g. 1080p, 720p, 480p) from a dropdown on multi-variant streams.
- **In-Page Floating Download Button:** Sleek on-hover download button attached directly to HTML5 video players on websites for instant 1-click downloading (configurable in Settings).
- **Smart Network Sniffer:** Automatically captures media streams and direct files in the background by inspecting HTTP response headers (`video/mp4`, `application/x-mpegURL`, `application/dash+xml`, `audio/mpeg`, etc.).
- **DOM & Player Detection:** Scans HTML5 `<video>`, `<audio>`, `<source>`, `<noscript>` fallback containers, OpenGraph/Twitter tags, and inline player configs.
- **Pre-Play Detection:** Detects videos immediately upon page load (including players with noscript/poster overlays) without requiring user playback first.
- **Anti-Hotlink Direct Downloader:** Automatically resolves cross-origin 302/301 redirects and injects required `Referer` / `Origin` headers at the network layer to bypass server hotlink protections.
- **Native Chrome Downloads:** Streams video files directly to disk via Chrome's native download manager with zero memory overhead and native transfer speeds.
- **Live Progress & Speed:** Real-time transfer progress bar with speed (MB/s) and percentage in the popup UI and native desktop notifications on completion.
- **Unlimited HLS (`.m3u8`) Engine:** Parses master playlists, downloads `.ts` segments via parallel workers, handles AES-128 decryption, and merges into an intact file.
- **Customizable Options:** Toggle whether to prompt for filename, enable/disable the in-page floating button, filter minimum file sizes, adjust concurrent connections, and set default formats (MP4, MKV, TS).
- **Creator Support:** Built-in PayPal donation support (`paypal.me/yesarts`) requiring zero setup.

---

## 🛠️ Installation in Google Chrome

1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** (Cargar descomprimida).
4. Select this project directory:
   ```
   c:\Users\yesua\PY\Browser\Extension
   ```
5. Pin the **StreamGrabber** icon to your Chrome toolbar.

---

## 📦 Packaging for Chrome Web Store

To generate the clean, lightweight production archive ready for upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole):

```powershell
# Using npm
npm run package

# Or directly via PowerShell
powershell -ExecutionPolicy Bypass -File .\package.ps1
```

This generates `StreamGrabber-v3.2.0.zip` (~213 KB) containing strictly the 15 production runtime files while automatically excluding `node_modules`, git artifacts, development config, and promotional assets.

---

## 🛡️ Chrome Web Store Policy Compliance

* **YouTube Policy:** In strict compliance with Google Chrome Web Store Developer Program Policies and YouTube Terms of Service, downloading videos from YouTube is not supported.
* **Single Purpose:** StreamGrabber focuses exclusively on detecting and downloading user-authorized multimedia streams.
* **Privacy & Security:** StreamGrabber does not collect, transmit, or monetize any user personal data, browsing history, or keystrokes. All stream detection occurs locally within the user's browser.

---

## 📄 License

MIT License.
