# 🛡️ ExtremeShield: Ultimate Tracker & Popup Blocker

> **High-Performance Manifest V3 Privacy Armor**  
> Combines the best features of **uBlock Origin**, **Poper Blocker**, **Privacy Badger**, **Ghostery**, and **AdGuard** into a 100% free, community-donation-powered Chrome Extension.

![ExtremeShield Banner](icon128.png)

---

## ✨ Features Overview

## ✨ Features Overview

### 🚫 1. Aggressive Popup, Popunder & Fullscreen Defuser
- **Main World Execution Hook**: Overrides `window.open` at `document_start` to intercept unauthorized popup spam while preserving legitimate user-initiated actions.
- **Fullscreen Hijack Defense**: Overrides `requestFullscreen` to block deceptive full-screen phishing scams while allowing video players and user interactions.
- **Popunder & Background Tab Defuser**: Traps `window.blur()`, `window.focus()`, and window order manipulation tricks.
- **Synthetic Click Trapper**: Neutralizes hidden dynamic `<a>` anchor exploits (`target="_blank"` triggers).
- **Discreet Toast Alert**: Floating bottom-right chip allowing instant 1-click **Allow Once** or **Whitelist Site**.

### 🔀 2. Anti-Redirect, Tab-Under & History Trapping Defense
- **History Trapping Defense**: Intercepts abusive `history.pushState` loops that maliciously hijack and trap the browser's "Back" button while supporting legitimate SPAs (YouTube, Twitter, Gmail).
- **Interception of Timer Redirects**: Prevents timer-based forced redirects (`location.replace`, `location.assign`, meta refresh).
- **Tab-Under Guard**: Stops inactive tabs from silently navigating to malicious or advertising websites.

### 🎬 3. Video Pre-Roll & VAST Defuser (Fix Error 224003)
- **VAST Interception**: Returns standard empty `<VAST version="4.0"/>` on video ad network endpoints via fetch and XHR to permanently solve **Error Code: 224003**.
- **JWPlayer Ad Sanitization**: Automatically defuses JWPlayer advertising setups, bypasses `playAd()`, and gracefully catches `adError` and `setupError`.
- **Pre-Roll Skipper**: Automatically clears pre-roll countdown timers on KVS, HTML5, and web video players.

### 🕵️ 4. Anti-Tracking, Fingerprint Shield & Deep Shadow DOM Scanner
- **Declarative Net Request (DNR) Rulesets**: Pre-compiled, ultra-fast filter lists blocking cross-site trackers, ad telemetry pixels, analytics beacons, and behavioral profiling networks.
- **Deep Shadow DOM Scanner**: Recursively inspects open shadow roots (`element.shadowRoot`) up to 3 levels deep to detect and eliminate hidden trackers and ad components.
- **URL Parameter Stripper**: Automatically strips tracking query params (`utm_*`, `fbclid`, `gclid`, `twclid`, `mc_cid`, `msclkid`, etc.) from links and redirects.
- **Canvas & Audio Fingerprinting Shield**: Injects imperceptible, deterministic noise into `toDataURL()`, `getImageData()`, and `AudioBuffer` to defeat cross-site device fingerprinting.
- **WebRTC IP Leak Defense**: Enforces `default_public_interface_only` policy to prevent local and public IP disclosures.

### 🍪 5. Intrusive Overlay, Cookie Wall Hunter & Scroll Recovery
- **Cookie Consent Banner Auto-Dismissal**: Automatically removes GDPR/CCPA cookie walls without accepting tracking cookies.
- **Reactive Scroll Lock Restorer**: Continuously watches `html` and `body` attributes to instantly clear `overflow: hidden` and remove `position: fixed` scroll-locking without breaking sticky headers or layout.
- **Anti-Adblock Defuser**: Neutralizes adblock detector traps (`window.canRunAds`, `window.isAdBlockActive = false`) to prevent page breakage.

### ⚡ 6. Prominent Element Zapper (Core Action - Alt+Shift+Z)
- **Point-and-Click Highlighter**: Laser-guided selector with red highlight box (`Alt+Shift+Z`).
- **Permanent Vaporization**: Click to remove the element and automatically save domain-specific cosmetic CSS hiding rules.

### 📊 7. Live Telemetry & Tracker Inspector
- **Categorized Drawer**: Visual breakdown of blocked items by **Analytics**, **Advertising**, **Social Trackers**, and **Fingerprinting/Popups**.
- **Real-Time Counters**: Tab-level badges, total popups blocked, trackers blocked, pre-rolls defused, and estimated bandwidth saved.

### 💖 8. 100% Free & Donation-Driven
- **Zero Paywalls**: Every single feature is unlocked and completely free.
- **Zero Telemetry**: No user data collection, no remote logging.
- **StreamGrabber Companion**: Integrated link to our free video companion downloader.
- **Donations**: Official Ko-fi widget button and 1-click crypto copy boxes (BTC, BNB/USDT).

---

## 🚀 Installation & Loading (Developer Mode)

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** and select the folder:
   ```
   c:\Users\yesua\PY\Browser\ExtremeShield
   ```
5. Pin **ExtremeShield** to your Chrome toolbar.

---

## 📦 Building Production Zip Package

To generate a clean, production-ready `.zip` package for the Chrome Web Store:

```powershell
powershell -ExecutionPolicy Bypass -File ./package.ps1
```

This will produce `ExtremeShield-v1.0.0.zip` ready for store submission.

---

## 📄 License & Community Support

ExtremeShield is licensed under the [MIT License](LICENSE).
Supported 100% by voluntary community donations.
