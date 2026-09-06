# StreamGrabber Privacy Policy

**Last Updated:** September 2026

StreamGrabber is committed to user privacy and transparency. We believe you should have total control over your browsing experience without being tracked, profiled, or monetized.

---

## 1. Zero Data Collection & Zero Telemetry
- StreamGrabber **does NOT collect, record, transmit, share, or sell** any personal information, browsing history, downloaded media files, video URLs, IP addresses, or device identifiers.
- All media detection, stream decryption, orientation rotation, and downloading processes run **100% locally on your device** inside your Google Chrome browser.
- No analytics trackers, telemetry libraries, or third-party tracking scripts are bundled with or used by StreamGrabber.

---

## 2. Browser Permissions & Purpose
StreamGrabber requests only the necessary permissions required to detect and download media streams as directed by the user:

- **`storage`**: Used strictly to store user preferences locally on your computer (e.g., default download format, concurrent connections, minimum file size filter, and floating button visibility).
- **`downloads`**: Used to save detected media files, audio tracks, and assembled HLS/DASH video streams directly to your local Downloads directory.
- **`notifications`**: Used to display desktop completion notifications when a background video download finishes.
- **`webRequest`**: Used passively to inspect HTTP response headers (`video/*`, `application/x-mpegURL`, `application/dash+xml`) to identify downloadable video/audio streams for the popup list without collecting user data.
- **`tabs`**: Used to associate detected media streams with the current tab, display the stream count badge on the icon, and retrieve page titles to name downloaded video files.
- **`scripting`**: Used to scan for in-page video elements, calculate dimensions for thumbnail previews, and attach the optional floating download button on HTML5 players.
- **`declarativeNetRequest`**: Used to filter out third-party ad network video beacons and pre-roll announcement clips so only authentic full-length media streams are captured.
- **`offscreen`**: Used to process decrypted HLS video segments and generate Blob URLs for Chrome's native download manager without Service Worker memory limits.
- **`<all_urls>` Host Permission**: Required to detect and capture video/audio streams across any website you choose to visit.

---

## 3. Voluntary Community Support
- StreamGrabber is 100% free with no paid subscriptions, locked tiers, or premium paywalls.
- Voluntary donations made through external third-party services (Ko-fi, PayPal, or Crypto) are handled entirely on those platforms under their respective privacy policies. StreamGrabber never processes or stores financial data.

---

## 4. Policy Updates
Any future updates to this policy will be posted directly to this document in our official repository.

---

## 5. Contact
If you have any questions or feedback regarding this Privacy Policy, you can reach out directly via email at `ayesua@gmail.com`.
