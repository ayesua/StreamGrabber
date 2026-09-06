# 🛡️ ExtremeShield: Ultimate Tracker & Popup Blocker

> **High-Performance Manifest V3 Privacy Armor**  
> Combines the best features of **uBlock Origin**, **Poper Blocker**, **Privacy Badger**, **Ghostery**, and **AdGuard** into a 100% free, community-donation-powered Chrome Extension.

![ExtremeShield Banner](icon128.png)

---

## ✨ Features Overview

### 🚫 1. Aggressive Popup & Popunder Interceptor
- **Main World Execution Hook**: Overrides `window.open` at `document_start` to intercept unauthorized popup spam while preserving legitimate user-initiated actions.
- **Popunder & Background Tab Defuser**: Traps `window.blur()`, `window.focus()`, and window order manipulation tricks.
- **Synthetic Click Trapper**: Neutralizes hidden dynamic `<a>` anchor exploits (`target="_blank"` triggers).
- **Discreet Toast Alert**: Floating bottom-right chip allowing instant 1-click **Allow Once** or **Whitelist Site**.

### 🔀 2. Anti-Redirect & Tab-Under Hijack Defense
- **Interception of Timer Redirects**: Prevents timer-based forced redirects (`location.replace`, `location.assign`, meta refresh).
- **Tab-Under Guard**: Stops inactive tabs from silently navigating to malicious or advertising websites.

### 🕵️ 3. Comprehensive Anti-Tracking & Fingerprint Shield
- **Declarative Net Request (DNR) Rulesets**: Pre-compiled, ultra-fast filter lists blocking cross-site trackers, ad telemetry pixels, analytics beacons, and behavioral profiling networks.
- **URL Parameter Stripper**: Automatically strips tracking query params (`utm_*`, `fbclid`, `gclid`, `twclid`, `mc_cid`, `msclkid`, etc.) from links and redirects.
- **Canvas & Audio Fingerprinting Shield**: Injects imperceptible, deterministic noise into `toDataURL()`, `getImageData()`, and `AudioBuffer` to defeat cross-site canvas & acoustic fingerprint hashes.
- **WebRTC IP Leak Defense**: Enforces `default_public_interface_only` policy to prevent local and public IP disclosures.

### 🍪 4. Intrusive Overlay & Cookie Wall Hunter
- **Cookie Consent Banner Auto-Dismissal**: Automatically removes GDPR/CCPA cookie walls without accepting tracking cookies.
- **Scroll Lock Restorer**: Automatically detects anti-adblock / newsletter overlays locking the page (`overflow: hidden`) and unlocks natural scrolling.
- **Anti-Adblock Defuser**: Neutralizes adblock detector traps (`window.canRunAds`, `window.isAdBlockActive = false`) to prevent page breakage.

### ⚡ 5. Prominent Element Zapper (Core Action)
- **Point-and-Click Highlighter**: Laser-guided selector with red highlight box (`Alt+Shift+Z`).
- **Permanent Vaporization**: Click to remove the element and automatically save domain-specific cosmetic CSS hiding rules.

### 📊 6. Live Telemetry & Tracker Inspector
- **Categorized Drawer**: Visual breakdown of blocked items by **Analytics**, **Advertising**, **Social Trackers**, and **Fingerprinting/Popups**.
- **Real-Time Counters**: Tab-level badges, total popups blocked, trackers blocked, annoyances dismissed, and estimated bandwidth/time saved.

### 💖 7. 100% Free & Donation-Driven
- **Zero Paywalls**: Every single feature is unlocked and completely free.
- **Zero Telemetry**: No user data collection, no remote logging.
- **Hardcoded Donations**: Official Ko-fi widget button and 1-click crypto copy boxes (BTC, BNB/USDT).

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
