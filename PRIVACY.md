# PureShield Privacy Policy

**Last Updated:** September 2026

PureShield is built on the fundamental principle that **privacy is a human right**. PureShield is designed to protect your privacy without compromising it in return.

---

## 1. Zero Data Collection & Zero Telemetry
- PureShield **does NOT collect, store, transmit, or sell** any personal information, browsing history, DNS queries, visited URLs, IP addresses, or device identifiers.
- All filtering, rule evaluation, and popup detection take place **100% locally on your device** using Chrome's native Declarative Net Request API and local content scripts.

## 2. Permissions & Why They Are Needed
- **`storage`**: Used exclusively to store your local settings, whitelisted domains, and custom cosmetic element hiding rules on your device.
- **`declarativeNetRequest` & `declarativeNetRequestFeedback`**: Used to block tracking domains, popup ad networks, and strip URL tracking parameters via high-speed native browser rules.
- **`privacy`**: Used to enforce WebRTC IP leak protection (`default_public_interface_only`).
- **`contextMenus`**: Used to provide the right-click "Zap Element on Page" and "Whitelist Site" shortcuts.
- **`scripting` & `tabs`**: Used to inject the Element Zapper overlay when requested and display blocked item badge counts per tab.
- **`<all_urls>` Host Permission**: Required to defuse popunders, auto-dismiss cookie banners, and strip marketing tracking tokens across all visited websites.

## 3. Voluntary Community Donations
- PureShield is 100% free and contains no paid tiers, subscriptions, or feature locks.
- Voluntary donations made through external third-party platforms (Buy Me a Coffee, Ko-fi, GitHub Sponsors, Crypto networks) are subject to the privacy policies of those respective third-party payment providers. PureShield itself processes no financial transactions.

---

## 4. Open Source & Transparency
PureShield's source code is open and verifiable. You can inspect all rulesets, background service workers, and injected scripts directly.
