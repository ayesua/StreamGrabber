# ExtremeShield: Chrome Web Store Submission & Metadata Guide

---

## 📌 1. Essential Store Metadata

* **Extension Title:** `ExtremeShield: Ultimate Tracker & Popup Blocker`
* **Short Description (Summary, max 132 chars):**  
  `Extreme defense against popups, trackers, fingerprinting, and redirects. 100% free with zero paywalls & zero telemetry.`
* **Category:** `Privacy & Security` *(Alternative: Productivity / Tools)*
* **Pricing:** Free (No in-app purchases, no subscriptions, no locked tiers)
* **Website / Support URL:** `https://ko-fi.com/yesuag`
* **Privacy Policy URL:** `https://github.com/ayesua/StreamGrabber/blob/extremeshield/PRIVACY.md`

---

## 📝 2. Full Store Description (English & Spanish)

### 🇺🇸 English Listing Description

```markdown
🛡️ **ExtremeShield: The Ultimate Tracker, Popup & Privacy Armor (Manifest V3)**

Experience extreme browsing speed, total privacy, and complete protection from malicious advertising. ExtremeShield combines the advanced capabilities of uBlock Origin, Privacy Badger, Ghostery, Poper Blocker, and AdGuard into an ultra-fast, 100% free Chrome extension with **zero paywalls, zero telemetry, and zero tracking**.

---

### ⚡ KEY DEFENSE ENGINES

🚫 **Aggressive Popup & Popunder Defuser**
- Intercepts unauthorized `window.open` calls at document_start.
- Traps popunders, synthetic link click exploits, and background window refocusing.
- Discrete toast notification with 1-click "Allow Once" or "Whitelist Site".

🔀 **Anti-Redirect & Tab-Under Hijack Shield**
- Neutralizes timer-based redirects (`location.replace`, `location.assign`, meta refresh).
- Stops inactive background tabs from quietly redirecting to ad landing pages or fake download traps.

🕵️ **Anti-Tracking & Fingerprint Spoofing**
- Blocks cross-site ad networks, telemetry pixels (Meta, TikTok, Criteo, Google), and session replay heatmaps.
- Injects deterministic, imperceptible micro-noise into Canvas 2D and AudioContext APIs to defeat cross-site device fingerprinting.
- WebRTC IP Leak Defense prevents local and public IP disclosures over non-proxied UDP connections.
- Automatically strips tracking parameters (`utm_*`, `fbclid`, `gclid`, `mc_cid`, etc.) from clicked URLs.

⚡ **Prominent Element Zapper (Core Action - Alt+Shift+Z)**
- Point, laser-target, and vaporize any annoying floating banner, video overlay, or newsletter modal with 1 click.
- Permanently remembers and applies cosmetic CSS hiding rules across domain visits.

🍪 **Cookie Consent Auto-Dismissal & Anti-Adblock Defuser**
- Automatically detects and dismisses intrusive GDPR/CCPA cookie walls without accepting tracking.
- Restores locked scrolling on news and media sites.
- Neutralizes adblock detector traps (`canRunAds`) to prevent page breakage.

📊 **Live Telemetry & Categorized Tracker Inspector**
- Real-time transparent breakdown of blocked requests per tab (Analytics, Advertising, Social Pixels, Fingerprinting).
- Lifetime counters for popups blocked, bandwidth saved, and speed gained.

---

### 🔒 100% FREE & ZERO-LOG PRIVACY PROMISE

- **Zero Data Collection:** We do not track, collect, store, or sell your browsing history, visited URLs, or IP addresses.
- **100% Local Processing:** Every single rule evaluation and filter check runs natively on your machine using Chrome's native Declarative Net Request (DNR) engine.
- **Zero Paywalls:** Every single feature is unlocked for everyone. Supported entirely by voluntary community donations (Ko-fi & Crypto).

---

### ⌨️ KEYBOARD SHORTCUTS
- **Alt + Shift + Z:** Activate Element Zapper
- **Alt + Shift + P:** Master Protection Toggle (ON / OFF)
```

---

### 🇪🇸 Spanish Listing Description (Español)

```markdown
🛡️ **ExtremeShield: El Bloqueador Definitivo de Rastreadores, Popups y Huella Digital**

Navega a máxima velocidad con privacidad absoluta. ExtremeShield combina las mejores tecnologías de uBlock Origin, Privacy Badger, Ghostery, Poper Blocker y AdGuard en una extensión Manifest V3 ultra optimizada, 100% gratuita, sin muros de pago y con **cero telemetría**.

---

### ⚡ MOTORES DE PROTECCIÓN NÚCLEO

🚫 **Bloqueador Agresivo de Popups y Popunders**
- Neutraliza ventanas emergentes no solicitadas antes de que se abran.
- Detiene tácticas de popunder y clics trampa sintéticos en enlaces ocultos.
- Alerta flotante discreta para permitir excepciones en 1 solo clic.

🔀 **Escudo Anti-Redirecciones & Secuestro de Pestañas (Tab-Under)**
- Detiene redirecciones automáticas por temporizadores invisibles y enlaces de descarga falsos.
- Evita que páginas en segundo plano secuestren tu navegación hacia portales de apuestas o phishing.

🕵️ **Blindaje Anti-Rastreo y Máscara de Huella Digital (Fingerprint Spoofing)**
- Bloquea más de 50 redes publicitarias, píxeles de seguimiento (Meta, TikTok, Criteo) y mapas de calor (Hotjar, Clarity).
- Inyecta ruido microscópico imperceptible en Canvas 2D y AudioContext para impedir que identifiquen tu dispositivo.
- Escudo contra fugas de IP por WebRTC para proteger tu dirección IP real.
- Limpiador automático de parámetros de rastreo en URLs (`utm_*`, `fbclid`, `gclid`, etc.).

⚡ **Element Zapper Destacado (Función Principal - Alt+Shift+Z)**
- Mira láser interactiva para vaporizar y ocultar permanentemente cualquier anuncio, banner flotante o banner de noticias.

🍪 **Auto-Cierre de Banners de Cookies y Anti-Adblock Defuser**
- Oculta avisos GDPR/CCPA sin aceptar cookies invasivas y restaura el scroll bloqueado.
- Neutraliza los scripts que detectan bloqueadores para que las páginas no se rompan.

📊 **Inspector de Rastreadores en Tiempo Real**
- Visualiza exactamente qué empresas y rastreadores intentaban seguirte en cada pestaña.
- Estadísticas en vivo de popups bloqueados, ancho de banda ahorrado y tiempo ganado.

---

### 🔒 100% GRATIS Y PRIVACIDAD TOTAL SIN REGISTROS
- **Cero Recopilación de Datos:** No almacenamos ni enviamos tu historial a ningún servidor.
- **Procesamiento 100% Local:** Todo funciona en tu propio navegador mediante la API Declarative Net Request de Chrome.
```

---

## 🎯 3. Single Purpose Statement (Declaración de Propósito Único para CWS)

> **Single Purpose Description:**  
> *"ExtremeShield protects user privacy and browsing performance by intercepting unrequested popups, blocking cross-site tracking networks, spoofing canvas/audio device fingerprinting, and preventing malicious navigation redirects using native Chrome Declarative Net Request and content scripts."*

---

## 🔑 4. Permission Justifications (Para el Formulario de la Consola CWS)

| Permiso | Justificación para el Revisor de Google (Copiar y Pegar) |
| :--- | :--- |
| **`declarativeNetRequest`** | Used to block known third-party tracking domains, ad telemetry pixels, and popup ad networks at the network layer with zero latency. |
| **`declarativeNetRequestFeedback`** | Used in background debug telemetry to report the exact count and categories of blocked trackers to the user in the popup interface. |
| **`storage`** | Used strictly to store user preferences, domain whitelist settings, and custom cosmetic CSS hiding selectors locally on the device. |
| **`privacy`** | Used to enforce the `default_public_interface_only` WebRTC IP handling policy to prevent local and public IP disclosures over non-proxied connections. |
| **`scripting`** | Used to inject the interactive Element Zapper laser HUD when triggered by the user via toolbar or hotkey (Alt+Shift+Z). |
| **`tabs`** | Used to query active tab URLs for whitelist verification and display live badge counts of blocked items per tab. |
| **`contextMenus`** | Used to provide quick right-click context menu options to "Zap Element on this Page" and "Whitelist this Site". |
| **`<all_urls>` Host Permission** | Required to inspect DOM elements for invasive GDPR cookie banners, defuse synthetic anchor click exploits, and strip URL query tracking parameters across arbitrary websites the user navigates to. |

---

## 🛡️ 5. User Data & Privacy Declarations in CWS Console

* **Do you collect personal data?** `No`
* **Do you sell user data to third parties?** `No`
* **Do you use user data for purposes unrelated to the item's core functionality?** `No`
* **Do you use user data for lending or creditworthiness?** `No`
* **Account / Authentication required?** `No`

---

## 🖼️ 6. Promotional & Graphic Assets Checklist

Todos los archivos generados cumplen con las especificaciones exactas de Google (24-bit RGB, sin canal alfa):

1. **Small Promo Tile (440x280 px):**
   * [`small_promo_tile_440x280.jpg`](file:///c:/Users/yesua/PY/Browser/ExtremeShield/small_promo_tile_440x280.jpg)
   * [`small_promo_tile_440x280.png`](file:///c:/Users/yesua/PY/Browser/ExtremeShield/small_promo_tile_440x280.png)
2. **Marquee Promo Tile (1400x560 px):**
   * [`marquee_promo_tile_1400x560.jpg`](file:///c:/Users/yesua/PY/Browser/ExtremeShield/marquee_promo_tile_1400x560.jpg)
   * [`marquee_promo_tile_1400x560.png`](file:///c:/Users/yesua/PY/Browser/ExtremeShield/marquee_promo_tile_1400x560.png)
3. **5 High-Res Screenshots (1280x800 px):**
   * Screenshot 1: [`screenshot_1_control_center_1280x800.jpg`](file:///c:/Users/yesua/PY/Browser/ExtremeShield/screenshot_1_control_center_1280x800.jpg)
   * Screenshot 2: [`screenshot_2_element_zapper_1280x800.jpg`](file:///c:/Users/yesua/PY/Browser/ExtremeShield/screenshot_2_element_zapper_1280x800.jpg)
   * Screenshot 3: [`screenshot_3_anti_redirect_1280x800.jpg`](file:///c:/Users/yesua/PY/Browser/ExtremeShield/screenshot_3_anti_redirect_1280x800.jpg)
   * Screenshot 4: [`screenshot_4_tracker_inspector_1280x800.jpg`](file:///c:/Users/yesua/PY/Browser/ExtremeShield/screenshot_4_tracker_inspector_1280x800.jpg)
   * Screenshot 5: [`screenshot_5_advanced_shields_1280x800.jpg`](file:///c:/Users/yesua/PY/Browser/ExtremeShield/screenshot_5_advanced_shields_1280x800.jpg)
4. **Production Package:**
   * [`ExtremeShield-v1.0.0.zip`](file:///c:/Users/yesua/PY/Browser/ExtremeShield/ExtremeShield-v1.0.0.zip) (74.8 KB)
