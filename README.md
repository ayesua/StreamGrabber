# StreamGrabber (Chrome Extension - Manifest V3)

Fast, reliable video, audio, and HLS (`.m3u8`) stream detector and downloader for Google Chrome. 100% free and unlimited.

## 🚀 Features

- **Smart Network Sniffer:** Automatically captures media streams and direct files in the background by inspecting HTTP response headers (`video/mp4`, `application/x-mpegURL`, `application/dash+xml`, `audio/mpeg`, etc.).
- **DOM & Player Detection:** Scans HTML5 `<video>`, `<audio>`, `<source>`, `<noscript>` fallback containers, OpenGraph/Twitter tags, and inline player configs.
- **Pre-Play Detection:** Detects videos immediately upon page load (including players with noscript/poster overlays) without requiring user playback first.
- **Anti-Hotlink Direct Downloader:** Automatically resolves cross-origin 302/301 redirects and injects required `Referer` / `Origin` headers at the network layer to bypass server hotlink protections.
- **Native Chrome Downloads:** Streams video files directly to disk via Chrome's native download manager with zero memory overhead and native transfer speeds.
- **Live Progress & Speed:** Real-time transfer progress bar with speed (MB/s) and percentage in the popup UI and native desktop notifications on completion.
- **Unlimited HLS (`.m3u8`) Engine:** Parses master playlists, downloads `.ts` segments via parallel workers, handles AES-128 decryption, and merges into an intact file.
- **Customizable Options:** Toggle whether to prompt for filename/destination before downloading, filter minimum file sizes, adjust concurrent connections, and set default formats (MP4, MKV, TS).
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

## 📄 License

MIT License. Free and open source.
