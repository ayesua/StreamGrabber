window.TRANSLATIONS = {};
window.TRANSLATIONS.en = {
  "header_title": "ExtremeShield Settings",
  "header_subtitle": "Manifest V3 Extreme High-Performance Popup & Tracker Armor",
  "btn_update_now": "Update Now",
  "checking_update": "Checking...",
  "update_available": "Update Available! Reloading...",
  "update_latest": "Latest Version",
  "update_throttled": "Checked Recently",
  "tab_protections": "🛡️ Protections",
  "tab_whitelist": "🌐 Whitelist & Custom",
  "tab_logs": "📜 Live Activity Log",
  "tab_backup": "💾 Backup & Restore",
  "tab_donations": "💖 Support & Donations",
  "core_engines_title": "Core Defense Engines",
  "advanced_shields_title": "Advanced Experimental Shields (Optional)",
  "companion_badge": "COMPANION EXTENSION",
  "companion_desc": "From the creators of ExtremeShield: Download streaming videos, m3u8 playlists, and audio streams directly at maximum speed.",
  "companion_btn": "Try StreamGrabber",
  "whitelist_title": "Trusted Whitelisted Domains",
  "whitelist_desc": "ExtremeShield will remain completely disabled on these websites.",
  "whitelist_placeholder": "e.g. internal.company.com or example.org",
  "btn_add_domain": "Add Domain",
  "whitelist_empty": "No whitelisted domains yet.",
  "btn_remove": "Remove",
  "zapped_title": "Zapped Elements (Custom Cosmetic Filters)",
  "zapped_desc": "Selectors hidden permanently using the Element Zapper tool.",
  "zapped_empty": "No custom hidden elements saved yet.",
  "logs_title": "Recent Blocked Events",
  "logs_desc": "Real-time stream of intercepted popups, blocked trackers, and stripped URLs.",
  "btn_clear_logs": "Clear Log",
  "logs_empty": "No events recorded in this session.",
  "backup_title": "Export & Import Configuration",
  "backup_desc": "Easily transfer your custom rules, whitelist, and settings across devices.",
  "btn_export_json": "📥 Export Settings JSON",
  "btn_import_json": "📤 Import Settings JSON",
  "reset_title": "Reset to Factory Defaults",
  "reset_desc": "Wipes all custom rules, whitelists, and restores original recommended protection settings.",
  "btn_reset_defaults": "Reset All Settings",
  "reset_confirm": "Are you sure you want to reset all ExtremeShield settings to defaults? This will clear custom rules and whitelists.",
  "import_success": "ExtremeShield configuration successfully imported!",
  "import_error": "Invalid JSON file format.",
  "copied": "Copied!",
  "rec_tool_title": "🎬 Recommended Extension: StreamGrabber",
  "rec_tool_desc": "Need to download videos, audio streams, or HLS (.m3u8) clips for offline playback? Try <strong>StreamGrabber</strong>, our high-speed video sniffer and downloader extension.",
  "rec_tool_btn": "🚀 Try StreamGrabber Free",
  "donations_title": "💖 100% Free & Open Privacy Model",
  "donations_desc": "Unlike commercial adblockers that sell user telemetry or charge monthly subscriptions for \"premium\" features, <strong>ExtremeShield is 100% free, forever, with zero paywalls</strong>. We rely strictly on voluntary community donations from users who value high-speed, private browsing.",
  "donations_ways": "Ways to Support ExtremeShield",
  "donations_kofi": "☕ Support me on Ko-fi",
  "donations_crypto": "CRYPTO DONATIONS",
  "btn_copy": "Copy",
  "modal_title": "Feature Information",
  "modal_what": "🔍 What it does",
  "modal_benefit": "🛡️ Privacy & Security Benefit",
  "modal_compat": "⚙️ Compatibility & Experience",
  "modal_ok": "Got it",
  "info_button_title": "Detailed Information",
  "features": {
    "blockPopups": {
      "title": "Aggressive Popup & Popunder Blocker",
      "desc": "Traps unrequested window spawns, synthetic anchor clicks, popunders, and zero-click redirects."
    },
    "blockRedirects": {
      "title": "Anti-Redirect & Tab-Under Hijack Shield",
      "desc": "Neutralizes timer-based redirects, tab-unders, and location assignment hijacks."
    },
    "historyTrapDefense": {
      "title": "Anti-History Trapping & Back-Button Hijack Defense",
      "desc": "Rate-limits rapid history.pushState and replaceState loops preventing sites from freezing the Back button."
    },
    "fullscreenDefense": {
      "title": "Deceptive Fullscreen Hijack Defense",
      "desc": "Suppresses unauthorized requestFullscreen calls outside explicit video interactions to prevent lockout phishing."
    },
    "tabWatchdog": {
      "title": "Background Ad Tab Watchdog",
      "desc": "Instantly terminates newly spawned background popunder and ad network tabs before they execute malicious scripts."
    },
    "blockTrackers": {
      "title": "Tracking & Telemetry Armor",
      "desc": "Blocks cross-site trackers, ad telemetry pixels, analytics beacons, and behavioral profiling scripts."
    },
    "shadowDomScanner": {
      "title": "Deep Shadow DOM Tracker Scanner",
      "desc": "Recursively traverses open Shadow DOM trees to discover and neutralize stealth advertising trackers and hidden banners."
    },
    "stripParams": {
      "title": "URL Tracking Parameter Stripper",
      "desc": "Automatically cleans query tracking tokens (utm_*, fbclid, gclid, mc_cid, etc.) from clicked links and URLs."
    },
    "blockFingerprinting": {
      "title": "Canvas & Audio Fingerprint Randomizer",
      "desc": "Injects imperceptible deterministic noise into canvas and AudioContext APIs to defeat device fingerprinting."
    },
    "blockWebRTCLeaks": {
      "title": "WebRTC IP Leak Defense",
      "desc": "Eliminates WebRTC local and public IP address disclosure on non-proxied UDP connections."
    },
    "dismissCookieBanners": {
      "title": "Cookie Consent Banner Auto-Dismissal",
      "desc": "Automatically dismisses or hides intrusive GDPR/CCPA cookie consent banners without accepting tracking."
    },
    "removeOverlays": {
      "title": "Overlay, Backdrop & Scroll Lock Defense",
      "desc": "Vaporizes transparent click-jack backdrops and automatically restores page scrolling when websites freeze overflow."
    },
    "defuseAntiAdblock": {
      "title": "Anti-Adblock Defuser",
      "desc": "Neutralizes anti-adblock traps and provides safe dummy variables to prevent page breakage."
    },
    "blockMediaPrerolls": {
      "title": "Video Pre-roll & VAST Defuser (Fix Error 224003)",
      "desc": "Neutralizes broken video prerolls, skips VAST ad crashes (Error Code 224003), and ensures smooth playback on JWPlayer and HTML5 players."
    },
    "showToastNotifications": {
      "title": "Popup Blocked Toast Notifications",
      "desc": "Displays a subtle floating badge at the bottom corner when a popup is intercepted with 1-click allow/whitelist."
    },
    "stripPingAttributes": {
      "title": "Hyperlink Auditing Stripper (<a ping=\"...\">)",
      "desc": "Removes stealth click-tracking ping beacons embedded in links by search engines and social platforms."
    },
    "trimReferrers": {
      "title": "Strict Referrer Policy Enforcement",
      "desc": "Limits the HTTP Referer header on cross-origin navigations so destination sites cannot see exact page URLs."
    },
    "unlockRightClick": {
      "title": "Unlock Right-Click & Text Selection",
      "desc": "Re-enables right-click context menu, text highlighting, and clipboard copy on sites attempting to disable them."
    },
    "blockAutoplay": {
      "title": "Anti-Autoplay Video Shield",
      "desc": "Prevents background floating video players from auto-playing loud media without your explicit click."
    }
  },
  "feature_details": {
    "popups": {
      "title": "🚫 Aggressive Popup & Popunder Blocker",
      "whatItDoes": "Intercepts window.open, synthetic anchor click triggers, popunders, and zero-click background spawn attempts before new browser contexts can open.",
      "benefit": "Eliminates 100% of deceptive ads, malicious casino/scam spawns, and unwanted browser tab storms.",
      "compat": "Legitimate user-intended popups (such as \"Sign in with Google\" or OAuth authorization dialogs) are permitted seamlessly."
    },
    "redirect": {
      "title": "🔀 Anti-Redirect & Tab-Under Hijack Shield",
      "whatItDoes": "Intercepts timer-based location changes (location.replace, location.href, and location.assign) and cross-domain navigations triggered without trusted user interaction.",
      "benefit": "Prevents download, tube, and streaming sites from stealthily navigating your active tab away to phishing or ad networks.",
      "compat": "Standard web browsing, Single Page Applications (YouTube, GitHub, X), and direct link clicks work with zero lag."
    },
    "history-trap": {
      "title": "⏪ Anti-History Trapping & Back-Button Hijack Defense",
      "whatItDoes": "Enforces strict rate-limiting on rapid history.pushState and replaceState bursts that abuse the HTML5 History API to flood browser history.",
      "benefit": "Ensures clicking the browser's \"Back\" button always returns you to the previous page instead of trapping you in an endless ad loop.",
      "compat": "Legitimate client-side routers (React, Vue, Next.js) continue functioning normally without interruption."
    },
    "fullscreen": {
      "title": "🖥️ Deceptive Fullscreen Hijack Defense",
      "whatItDoes": "Blocks unauthorized requestFullscreen calls on fake system warnings or page overlays that lack genuine user video interaction gestures.",
      "benefit": "Protects against tech-support lockout scams, fake browser update screens, and fullscreen phishing overlays.",
      "compat": "Full-screen video playback on YouTube, Netflix, and HTML5 video players works smoothly upon clicking full-screen controls."
    },
    "tab-watchdog": {
      "title": "🐕 Background Ad Tab Watchdog",
      "whatItDoes": "Monitors browser tab creation and navigation events in the service worker, immediately terminating ad networks and popunder destinations.",
      "benefit": "Instantly destroys unwanted tabs before they consume system memory, download payloads, or execute tracking scripts.",
      "compat": "Bypassed when protection is disabled, paused, or when initiated from whitelisted domains."
    },
    "trackers": {
      "title": "🛡️ Tracking & Telemetry Armor",
      "whatItDoes": "Blocks network requests and DOM elements associated with cross-site tracking pixels, analytics beacons, heatmaps, and advertising profiling scripts.",
      "benefit": "Stops corporations from harvesting your browsing history and speeds up page load times by up to 40%.",
      "compat": "Recommended to keep permanently enabled."
    },
    "shadow-dom": {
      "title": "🔍 Deep Shadow DOM Tracker Scanner",
      "whatItDoes": "Recursively traverses open Web Component Shadow DOM roots to uncover and remove tracking scripts, tracking pixels, and stealth ad banners.",
      "benefit": "Extends ad and tracking neutralization into modern modular web applications that hide ad elements within isolated Shadow DOM boundaries.",
      "compat": "Optimized with node caching to ensure zero CPU overhead during page scrolling."
    },
    "url-params": {
      "title": "🧹 URL Tracking Parameter Stripper",
      "whatItDoes": "Automatically cleans query tracking tokens (such as utm_source, fbclid, gclid, mc_cid, and msclkid) from clicked links and web addresses.",
      "benefit": "Prevents cross-site behavioral correlation, preserves your privacy when sharing links with friends, and keeps URLs clean.",
      "compat": "Does not alter essential parameters required for site navigation or checkout processes."
    },
    "fingerprint": {
      "title": "🕵️ Canvas & Audio Fingerprint Randomizer",
      "whatItDoes": "Injects imperceptible deterministic microscopic noise into HTML5 Canvas 2D and Web Audio API buffer calculations.",
      "benefit": "Frustrates device fingerprinting scripts by ensuring your browser presents a distinct, untrackable hardware signature on each session.",
      "compat": "Completely imperceptible to human senses; does not distort images, games, or audio playback."
    },
    "webrtc": {
      "title": "🔒 WebRTC IP Leak Defense",
      "whatItDoes": "Restricts WebRTC media routing to default public internet interfaces, preventing local private IP address disclosure on non-proxied UDP connections.",
      "benefit": "Keeps your real internal and VPN-shielded IP addresses concealed from snooping websites.",
      "compat": "Fully compatible with Google Meet, Zoom, Discord, and browser video conferencing tools."
    },
    "cookies": {
      "title": "🍪 Cookie Consent Banner Auto-Dismissal",
      "whatItDoes": "Detects intrusive GDPR and CCPA cookie consent banners (OneTrust, Cookiebot, Didomi, etc.) and auto-dismisses or rejects them without accepting tracking.",
      "benefit": "Clean, unobstructed browsing experience without clicking through annoying consent popups on every site.",
      "compat": "Automatically restores page scrolling if a cookie overlay had locked the document body."
    },
    "overlays": {
      "title": "🪟 Overlay, Backdrop & Scroll Lock Defense",
      "whatItDoes": "Detects transparent click-trap overlays, deceptive paywall backdrops, and restores scrolling when websites freeze overflow.",
      "benefit": "Allows seamless reading and navigation on pages that attempt to lock content behind intrusive sign-up or paywall modals.",
      "compat": "Safe for standard dialogs; only unlocks pages when scrolling has been artificially frozen."
    },
    "adblock-defuse": {
      "title": "🛠️ Anti-Adblock Defuser",
      "whatItDoes": "Neutralizes scripts designed to detect ad blockers and provides safe dummy variables to avert page breakage.",
      "benefit": "Bypasses \"Disable your ad blocker to continue\" paywalls and nag screens on news and utility portals.",
      "compat": "Recommended to keep enabled for uninterrupted browsing."
    },
    "media-prerolls": {
      "title": "🎬 Video Pre-roll & VAST Defuser (Fix Error 224003)",
      "whatItDoes": "Neutralizes broken video prerolls, skips VAST ad crashes (Error Code 224003), and provides empty compliant VAST XML to video players.",
      "benefit": "Eliminates \"This video file cannot be played (Error Code: 224003)\" failures and allows immediate video playback without commercials.",
      "compat": "Highly recommended for JWPlayer, Video.js, and HTML5 video streaming websites."
    },
    "toasts": {
      "title": "💬 Popup Blocked Toast Notifications",
      "whatItDoes": "Displays a sleek, discrete floating notification at the bottom corner of the viewport whenever a popup is neutralized, offering 1-click allow or whitelist.",
      "benefit": "Provides transparent real-time feedback on what ExtremeShield is blocking, with instant unblock controls.",
      "compat": "Can be toggled off if you prefer completely silent, background-only blocking."
    },
    "ping-audit": {
      "title": "🔗 Hyperlink Auditing Stripper (<a ping>)",
      "whatItDoes": "Strips ping attributes from HTML hyperlinks embedded by search engines and social networks.",
      "benefit": "Prevents background telemetry beacons from dispatching click-telemetry payloads to analytics servers when you click a search result.",
      "compat": "Optional. Highly recommended for users prioritizing maximum click privacy."
    },
    "referrer": {
      "title": "🌐 Strict Referrer Policy Enforcement",
      "whatItDoes": "Trims cross-origin HTTP Referer headers so external destination websites cannot inspect the exact article or query path you arrived from.",
      "benefit": "Prevents destination servers from learning your specific search queries or internal browsing paths.",
      "compat": "Optional. In rare instances, legacy authentication gateways may require full referrer URLs."
    },
    "unlock-rightclick": {
      "title": "🔓 Unlock Right-Click & Text Selection",
      "whatItDoes": "Restores the browser context menu, text highlighting, and clipboard copy operations on websites that attempt to disable them with event listeners.",
      "benefit": "Restores complete browser control, allowing you to freely copy text, inspect elements, and open links in new tabs.",
      "compat": "Optional. Useful when visiting recipe, academic, or news sites that restrict selection."
    },
    "autoplay": {
      "title": "🔇 Anti-Autoplay Video Shield",
      "whatItDoes": "Prevents unprompted floating or background video players from starting playback with audio upon page load.",
      "benefit": "Saves laptop battery life, reduces network bandwidth consumption, and prevents unexpected loud noise.",
      "compat": "Optional. Media you explicitly start via play buttons will play normally."
    }
  }
};
window.TRANSLATIONS.es = {
  "header_title": "Configuración de ExtremeShield",
  "header_subtitle": "Armadura de Alto Rendimiento contra Popups y Rastreadores en Manifest V3",
  "btn_update_now": "Actualizar Ahora",
  "checking_update": "Buscando...",
  "update_available": "¡Actualización lista! Reiniciando...",
  "update_latest": "Versión más reciente",
  "update_throttled": "Comprobado recientemente",
  "tab_protections": "🛡️ Protecciones",
  "tab_whitelist": "🌐 Lista Blanca y Personalizados",
  "tab_logs": "📜 Registro de Actividad",
  "tab_backup": "💾 Copia de Seguridad",
  "tab_donations": "💖 Apoyo y Donaciones",
  "core_engines_title": "Motores Principales de Defensa",
  "advanced_shields_title": "Escudos Experimentales Avanzados (Opcionales)",
  "companion_badge": "EXTENSIÓN COMPAÑERA",
  "companion_desc": "De los creadores de ExtremeShield: Descarga videos en streaming, listas m3u8 y pistas de audio a máxima velocidad.",
  "companion_btn": "Probar StreamGrabber",
  "whitelist_title": "Dominios de Confianza (Lista Blanca)",
  "whitelist_desc": "ExtremeShield permanecerá completamente deshabilitado en estos sitios web.",
  "whitelist_placeholder": "ej. interno.empresa.com o ejemplo.org",
  "btn_add_domain": "Agregar Dominio",
  "whitelist_empty": "Aún no hay dominios en la lista blanca.",
  "btn_remove": "Eliminar",
  "zapped_title": "Elementos Eliminados (Filtros Cosméticos)",
  "zapped_desc": "Selectores ocultos permanentemente usando la herramienta Element Zapper.",
  "zapped_empty": "No hay elementos personalizados ocultos guardados.",
  "logs_title": "Eventos Bloqueados Recientemente",
  "logs_desc": "Flujo en tiempo real de ventanas interceptadas, rastreadores bloqueados y URLs limpiadas.",
  "btn_clear_logs": "Borrar Registro",
  "logs_empty": "No hay eventos registrados en esta sesión.",
  "backup_title": "Exportar e Importar Configuración",
  "backup_desc": "Transfiere fácilmente tus reglas personalizadas, lista blanca y configuración entre dispositivos.",
  "btn_export_json": "📥 Exportar Ajustes JSON",
  "btn_import_json": "📤 Importar Ajustes JSON",
  "reset_title": "Restablecer a Valores de Fábrica",
  "reset_desc": "Borra todas las reglas personalizadas, listas blancas y restaura la configuración original recomendada.",
  "btn_reset_defaults": "Restablecer Todo",
  "reset_confirm": "¿Estás seguro de que deseas restablecer la configuración de ExtremeShield? Esto borrará tus reglas y listas blancas.",
  "import_success": "¡Configuración de ExtremeShield importada con éxito!",
  "import_error": "Formato de archivo JSON inválido.",
  "copied": "¡Copiado!",
  "rec_tool_title": "🎬 Extensión Recomendada: StreamGrabber",
  "rec_tool_desc": "¿Necesitas descargar videos, transmisiones de audio o clips HLS (.m3u8) para ver sin conexión? Prueba <strong>StreamGrabber</strong>, nuestro descargador de video de alta velocidad.",
  "rec_tool_btn": "🚀 Probar StreamGrabber Gratis",
  "donations_title": "💖 Modelo de Privacidad 100% Gratuito y Libre",
  "donations_desc": "A diferencia de bloqueadores comerciales que venden tus datos de navegación o cobran suscripciones mensuales, <strong>ExtremeShield es 100% gratuito, para siempre, sin muros de pago</strong>. Dependemos únicamente de donaciones voluntarias de usuarios que valoran una navegación privada y rápida.",
  "donations_ways": "Formas de Apoyar a ExtremeShield",
  "donations_kofi": "☕ Apóyame en Ko-fi",
  "donations_crypto": "DONACIONES EN CRIPTO",
  "btn_copy": "Copiar",
  "modal_title": "Información de la Función",
  "modal_what": "🔍 Qué hace",
  "modal_benefit": "🛡️ Beneficio de Privacidad y Seguridad",
  "modal_compat": "⚙️ Compatibilidad y Experiencia",
  "modal_ok": "Entendido",
  "info_button_title": "Información Detallada",
  "features": {
    "blockPopups": {
      "title": "Bloqueador Agresivo de Popups y Popunders",
      "desc": "Intercepta ventanas no solicitadas, clics sintéticos en enlaces, popunders y redirecciones automáticas."
    },
    "blockRedirects": {
      "title": "Escudo Anti-Redirección y Secuestro Tab-Under",
      "desc": "Neutraliza redirecciones basadas en temporizadores, tab-unders y secuestros de navegación."
    },
    "historyTrapDefense": {
      "title": "Defensa Anti-Atrapamiento de Historial y Botón Atrás",
      "desc": "Limita bucles de history.pushState y replaceState evitando que los sitios congelen el botón Atrás."
    },
    "fullscreenDefense": {
      "title": "Defensa contra Pantalla Completa Engañosa",
      "desc": "Suprime llamadas no autorizadas a requestFullscreen fuera de videos legítimos para evitar bloqueos y estafas."
    },
    "tabWatchdog": {
      "title": "Vigilante de Pestañas Publicitarias en Segundo Plano",
      "desc": "Cierra de inmediato pestañas secundarias y popunders antes de que ejecuten scripts maliciosos."
    },
    "blockTrackers": {
      "title": "Armadura contra Rastreadores y Telemetría",
      "desc": "Bloquea rastreadores entre sitios, píxeles de telemetría publicitaria, balizas de analítica y perfiles de comportamiento."
    },
    "shadowDomScanner": {
      "title": "Escáner Profundo de Rastreadores en Shadow DOM",
      "desc": "Recorre árboles Shadow DOM abiertos para descubrir y neutralizar rastreadores ocultos y banners publicitarios."
    },
    "stripParams": {
      "title": "Limpiador de Parámetros de Rastreo en URLs",
      "desc": "Elimina automáticamente tokens de seguimiento (utm_*, fbclid, gclid, etc.) de enlaces visitados y URLs."
    },
    "blockFingerprinting": {
      "title": "Aleatorizador de Huella Digital Canvas y Audio",
      "desc": "Inyecta ruido imperceptible en Canvas y AudioContext para frustrar la creación de huellas de hardware."
    },
    "blockWebRTCLeaks": {
      "title": "Defensa contra Fugas de IP por WebRTC",
      "desc": "Evita la revelación de tu dirección IP pública o local a través de conexiones WebRTC."
    },
    "dismissCookieBanners": {
      "title": "Cierre Automático de Avisos de Cookies",
      "desc": "Cierra u oculta avisos molestos de cookies (GDPR/CCPA) sin aceptar el rastreo publicitario."
    },
    "removeOverlays": {
      "title": "Defensa contra Capas Superpuestas y Bloqueo de Scroll",
      "desc": "Elimina fondos transparentes trampa y restaura el scroll cuando las páginas congelan la lectura."
    },
    "defuseAntiAdblock": {
      "title": "Desactivador Anti-Adblock",
      "desc": "Neutraliza scripts diseñados para detectar bloqueadores y provee variables señuelo seguras para evitar errores."
    },
    "blockMediaPrerolls": {
      "title": "Neutralizador de Anuncios de Video y VAST (Corrige Error 224003)",
      "desc": "Evita bloqueos de video VAST (Código 224003) y asegura reproducción fluida en JWPlayer y HTML5."
    },
    "showToastNotifications": {
      "title": "Notificaciones Flotantes de Popups Bloqueados",
      "desc": "Muestra un aviso discreto en la esquina inferior cuando se bloquea un popup, con opción de permitir en 1 clic."
    },
    "stripPingAttributes": {
      "title": "Limpiador de Auditoría de Enlaces (<a ping=\"...\">)",
      "desc": "Elimina balizas de seguimiento de clics insertadas en enlaces por buscadores y redes sociales."
    },
    "trimReferrers": {
      "title": "Política Estricta de Cabecera Referer",
      "desc": "Limita la cabecera HTTP Referer en navegación entre sitios para que no vean la URL exacta de origen."
    },
    "unlockRightClick": {
      "title": "Desbloquear Clic Derecho y Selección de Texto",
      "desc": "Reactiva el menú contextual, selección de texto y copiado en sitios que intentan bloquearlos."
    },
    "blockAutoplay": {
      "title": "Escudo Anti-Reproducción Automática de Video",
      "desc": "Evita que reproductores flotantes o en segundo plano reproduzcan videos ruidosos sin tu clic explícito."
    }
  },
  "feature_details": {
    "popups": {
      "title": "🚫 Bloqueador Agresivo de Popups y Popunders",
      "whatItDoes": "Intercepta llamadas a window.open, clics sintéticos, popunders e intentos de apertura en segundo plano antes de que se creen nuevas ventanas.",
      "benefit": "Elimina anuncios engañosos, ventanas de apuestas/estafas y tormentas de pestañas no deseadas.",
      "compat": "Las ventanas emergentes legítimas del usuario (como inicio de sesión con Google o diálogos OAuth) funcionan sin problemas."
    },
    "redirect": {
      "title": "🔀 Escudo Anti-Redirección y Secuestro Tab-Under",
      "whatItDoes": "Intercepta cambios de URL automáticos (location.replace, location.href, location.assign) y navegaciones entre dominios sin interacción real del usuario.",
      "benefit": "Evita que sitios de descargas o streaming desvíen silenciosamente tu pestaña activa hacia sitios de phishing o redes publicitarias.",
      "compat": "Navegación estándar, aplicaciones SPA (YouTube, GitHub, X) y clics directos funcionan sin ningún retraso."
    },
    "history-trap": {
      "title": "⏪ Defensa Anti-Atrapamiento de Historial y Botón Atrás",
      "whatItDoes": "Aplica límites estrictos a ráfagas de pushState y replaceState que abusan de la API de historial para inundar la navegación.",
      "benefit": "Garantiza que pulsar el botón \"Atrás\" siempre regrese a la página anterior en lugar de atraparte en bucles de publicidad.",
      "compat": "Los enrutadores legítimos (React, Vue, Next.js) continúan funcionando con total normalidad."
    },
    "fullscreen": {
      "title": "🖥️ Defensa contra Pantalla Completa Engañosa",
      "whatItDoes": "Bloquea llamadas a requestFullscreen en falsas alertas de sistema o capas que carecen de interacción directa con videos.",
      "benefit": "Protege contra estafas de soporte técnico falso, avisos falsos de actualización y phishing a pantalla completa.",
      "compat": "La reproducción en pantalla completa en YouTube, Netflix y reproductores HTML5 funciona a la perfección al pulsar los controles."
    },
    "tab-watchdog": {
      "title": "🐕 Vigilante de Pestañas Publicitarias en Segundo Plano",
      "whatItDoes": "Monitorea la creación y navegación de pestañas en el service worker, cerrando de inmediato redes de publicidad y destinos popunder.",
      "benefit": "Destruye pestañas no deseadas antes de que consuman memoria RAM, descarguen archivos o ejecuten rastreadores.",
      "compat": "Se desactiva cuando la protección está pausada, apagada o en dominios de la lista blanca."
    },
    "trackers": {
      "title": "🛡️ Armadura contra Rastreadores y Telemetría",
      "whatItDoes": "Bloquea solicitudes de red y elementos del DOM vinculados a píxeles de rastreo, mapas de calor y scripts de perfilado publicitario.",
      "benefit": "Impide que las empresas recopilen tu historial de navegación y acelera la carga de páginas hasta en un 40%.",
      "compat": "Se recomienda mantener siempre activado."
    },
    "shadow-dom": {
      "title": "🔍 Escáner Profundo de Rastreadores en Shadow DOM",
      "whatItDoes": "Recorre de forma recursiva raíces Shadow DOM de Web Components para detectar y eliminar scripts, píxeles y anuncios ocultos.",
      "benefit": "Extiende la neutralización de publicidad a aplicaciones web modernas que ocultan elementos dentro de Shadow DOM aislados.",
      "compat": "Optimizado con caché de nodos para garantizar cero consumo de CPU durante el desplazamiento."
    },
    "url-params": {
      "title": "🧹 Limpiador de Parámetros de Rastreo en URLs",
      "whatItDoes": "Limpia automáticamente parámetros de consulta (utm_source, fbclid, gclid, mc_cid, etc.) al hacer clic o abrir enlaces.",
      "benefit": "Evita la correlación de perfiles entre sitios, protege tu privacidad al compartir enlaces y mantiene las URLs limpias.",
      "compat": "Conserva todos los parámetros esenciales necesarios para la navegación o procesos de compra."
    },
    "fingerprint": {
      "title": "🕵️ Aleatorizador de Huella Digital Canvas y Audio",
      "whatItDoes": "Añade micro-ruido determinista imperceptible en cálculos de Canvas 2D y búferes de la Web Audio API.",
      "benefit": "Invalida scripts de huella digital asegurando una firma de hardware única y no rastreable en cada sesión.",
      "compat": "Imperceptible para los sentidos humanos; no altera imágenes, juegos ni reproducción de sonido."
    },
    "webrtc": {
      "title": "🔒 Defensa contra Fugas de IP por WebRTC",
      "whatItDoes": "Restringe el enrutamiento de medios WebRTC a interfaces públicas por defecto, protegiendo IPs privadas y de VPN.",
      "benefit": "Mantiene tu IP real y tu red privada ocultas de sitios web espía.",
      "compat": "Totalmente compatible con Google Meet, Zoom, Discord y herramientas de videollamada."
    },
    "cookies": {
      "title": "🍪 Cierre Automático de Avisos de Cookies",
      "whatItDoes": "Detecta banners de consentimiento (OneTrust, Cookiebot, Didomi, etc.) y los rechaza o cierra automáticamente.",
      "benefit": "Navegación limpia y despejada sin tener que cerrar manualmente avisos en cada sitio web.",
      "compat": "Restaura automáticamente el desplazamiento si el aviso había bloqueado la página."
    },
    "overlays": {
      "title": "🪟 Defensa contra Capas Superpuestas y Bloqueo de Scroll",
      "whatItDoes": "Detecta capas de clic-trampa, fondos de muros de registro y restaura el desplazamiento si el sitio bloquea el scroll.",
      "benefit": "Permite leer y navegar sin trabas en páginas que intentan forzar registros o suscripciones invasivas.",
      "compat": "Seguro para diálogos normales; solo desbloquea cuando el scroll ha sido congelado artificialmente."
    },
    "adblock-defuse": {
      "title": "🛠️ Desactivador Anti-Adblock",
      "whatItDoes": "Neutraliza scripts diseñados para detectar bloqueadores y provee variables señuelo seguras para evitar errores.",
      "benefit": "Evita pantallas de \"Desactiva tu bloqueador para continuar\" en portales de noticias y descargas.",
      "compat": "Recomendado mantener activado para navegación sin interrupciones."
    },
    "media-prerolls": {
      "title": "🎬 Neutralizador de Anuncios de Video y VAST (Corrige Error 224003)",
      "whatItDoes": "Neutraliza anuncios pre-roll rotos, salta caídas de anuncios VAST (Error 224003) y provee XML compatible vacío a los reproductores.",
      "benefit": "Elimina el error \"No se puede reproducir el archivo de video (Código de error: 224003)\" y reproduce videos al instante.",
      "compat": "Altamente recomendado para sitios de streaming con JWPlayer, Video.js y reproductores HTML5."
    },
    "toasts": {
      "title": "💬 Notificaciones Flotantes de Popups Bloqueados",
      "whatItDoes": "Muestra una notificación elegante y discreta al neutralizar un popup, ofreciendo permitir o añadir a lista blanca en 1 clic.",
      "benefit": "Brinda información transparente en tiempo real sobre bloqueos, con control inmediato para desbloquear si lo deseas.",
      "compat": "Puedes desactivarlo si prefieres un bloqueo 100% silencioso en segundo plano."
    },
    "ping-audit": {
      "title": "🔗 Limpiador de Auditoría de Enlaces (<a ping>)",
      "whatItDoes": "Elimina el atributo ping de enlaces HTML incrustados por motores de búsqueda y plataformas sociales.",
      "benefit": "Evita que se envíe telemetría en segundo plano a servidores analíticos cuando haces clic en un resultado de búsqueda.",
      "compat": "Opcional. Muy recomendado para quienes buscan máxima privacidad al hacer clic."
    },
    "referrer": {
      "title": "🌐 Política Estricta de Cabecera Referer",
      "whatItDoes": "Recorta las cabeceras HTTP Referer entre orígenes para que los sitios de destino no conozcan la URL exacta ni consultas de procedencia.",
      "benefit": "Impide que servidores externos conozcan tus búsquedas o rutas internas de navegación.",
      "compat": "Opcional. En casos excepcionales, algunas pasarelas antiguas pueden requerir la URL completa."
    },
    "unlock-rightclick": {
      "title": "🔓 Desbloquear Clic Derecho y Selección de Texto",
      "whatItDoes": "Restaura el menú contextual nativo, resaltado de texto y copia al portapapeles en páginas que intentan bloquearlos mediante eventos.",
      "benefit": "Recupera el control total del navegador, permitiéndote copiar texto libremente e inspeccionar elementos.",
      "compat": "Opcional. Muy útil en blogs de recetas, portales académicos o sitios de noticias restrictivos."
    },
    "autoplay": {
      "title": "🔇 Escudo Anti-Reproducción Automática de Video",
      "whatItDoes": "Impide que reproductores flotantes inicien reproducción de video y audio automáticamente al cargar la página.",
      "benefit": "Ahorra batería en portátiles, reduce el consumo de datos de red y evita sobresaltos por ruido imprevisto.",
      "compat": "Opcional. Los videos que inicies manualmente con el botón Play funcionarán con normalidad."
    }
  }
};
window.TRANSLATIONS.zh = {
  "header_title": "ExtremeShield 设置与控制中心",
  "header_subtitle": "Manifest V3 极致性能弹窗拦截与全方位反追踪装甲",
  "btn_update_now": "立即检查更新",
  "checking_update": "正在检查...",
  "update_available": "发现新版本！正在重载...",
  "update_latest": "已是最新版本",
  "update_throttled": "近期已检查过",
  "tab_protections": "🛡️ 防护引擎",
  "tab_whitelist": "🌐 信任名单与自定义",
  "tab_logs": "📜 实时拦截日志",
  "tab_backup": "💾 备份与还原",
  "tab_donations": "💖 支持与赞助",
  "core_engines_title": "核心防御引擎",
  "advanced_shields_title": "高级实验性防护（可选）",
  "companion_badge": "推荐搭档扩展",
  "companion_desc": "由 ExtremeShield 团队匠心打造：极速嗅探并直接下载各类在线流媒体视频、m3u8 播放列表及音频资源。",
  "companion_btn": "体验 StreamGrabber",
  "whitelist_title": "信任网站名单（白名单）",
  "whitelist_desc": "ExtremeShield 将在这些网站上完全处于停用状态，不做任何拦截与脚本注入。",
  "whitelist_placeholder": "例如 internal.company.com 或 example.org",
  "btn_add_domain": "添加域名",
  "whitelist_empty": "暂无白名单域名。",
  "btn_remove": "移除",
  "zapped_title": "网页元素消除器记录（自定义滤镜）",
  "zapped_desc": "使用 Element Zapper 元素消除工具永久隐藏的 CSS 选择器规则。",
  "zapped_empty": "暂无已保存的自定义隐藏元素。",
  "logs_title": "近期拦截事件",
  "logs_desc": "实时展示被拦截的弹窗、受阻的追踪探针及已清洗的跟踪 URL。",
  "btn_clear_logs": "清空日志",
  "logs_empty": "本次会话中暂无拦截记录。",
  "backup_title": "配置导出与导入",
  "backup_desc": "跨电脑或浏览器轻松迁移您的自定义规则、信任名单及全部配置选项。",
  "btn_export_json": "📥 导出配置 (JSON)",
  "btn_import_json": "📤 导入配置 (JSON)",
  "reset_title": "恢复出厂推荐设置",
  "reset_desc": "清除所有自定义白名单与规则，并将所有保护选项恢复为初始最佳推荐状态。",
  "btn_reset_defaults": "恢复所有默认设置",
  "reset_confirm": "确定要将 ExtremeShield 的所有设置重置为默认值吗？这将清空白名单和自定义规则。",
  "import_success": "ExtremeShield 配置已成功导入！",
  "import_error": "JSON 文件格式无效，请检查文件。",
  "copied": "已复制！",
  "rec_tool_title": "🎬 推荐扩展：StreamGrabber",
  "rec_tool_desc": "想要将网页视频、音乐或 HLS (.m3u8) 分段流下载到本地离线观看？试试 <strong>StreamGrabber</strong>，我们的高速视频嗅探与下载伴侣扩展。",
  "rec_tool_btn": "🚀 免费体验 StreamGrabber",
  "donations_title": "💖 100% 永久免费与开源隐私理念",
  "donations_desc": "与收集用户浏览足迹贩卖数据、或针对核心功能收取订阅费的商业插件不同，<strong>ExtremeShield 始终 100% 免费，无任何付费墙</strong>。我们完全依靠珍视隐私与极速冲浪体验的社区用户自愿赞助。",
  "donations_ways": "赞助与支持方式",
  "donations_kofi": "☕ 在 Ko-fi 上请我喝杯咖啡",
  "donations_crypto": "加密货币捐赠 (CRYPTO)",
  "btn_copy": "复制",
  "modal_title": "功能详细信息",
  "modal_what": "🔍 功能说明",
  "modal_benefit": "🛡️ 隐私与安全优势",
  "modal_compat": "⚙️ 兼容性与体验",
  "modal_ok": "知道了",
  "info_button_title": "查看详细说明",
  "features": {
    "blockPopups": {
      "title": "强力弹窗与底层弹窗拦截器",
      "desc": "拦截未经请求的新窗口、虚拟点击、底层弹窗（Popunder）和零点击跳转。"
    },
    "blockRedirects": {
      "title": "防重定向与标签页劫持防护",
      "desc": "消除基于定时器的重定向、底层标签页劫持和网址篡改。"
    },
    "historyTrapDefense": {
      "title": "防止历史记录陷阱与返回键劫持",
      "desc": "限制 history.pushState 和 replaceState 循环，防止网站劫持浏览器的“返回”按钮。"
    },
    "fullscreenDefense": {
      "title": "欺诈性全屏劫持防御",
      "desc": "阻止非视频场景下的未授权 requestFullscreen 调用，防止锁屏欺诈与钓鱼。"
    },
    "tabWatchdog": {
      "title": "后台广告标签页看门狗",
      "desc": "在恶意脚本执行前，立即关闭新弹出的后台底层广告标签页。"
    },
    "blockTrackers": {
      "title": "追踪器与遥测防护装甲",
      "desc": "拦截跨站追踪器、广告遥测像素、分析信标以及行为分析脚本。"
    },
    "shadowDomScanner": {
      "title": "深度 Shadow DOM 追踪器扫描",
      "desc": "递归遍历开放的 Shadow DOM 树，揪出并清除隐藏在组件内的隐形追踪器与广告横幅。"
    },
    "stripParams": {
      "title": "URL 追踪参数自动清洗",
      "desc": "自动剥离点击链接和访问地址中的营销追踪参数（utm_*、fbclid、gclid、mc_cid 等）。"
    },
    "blockFingerprinting": {
      "title": "Canvas 与音频指纹随机化保护",
      "desc": "在 Canvas 2D 和 AudioContext API 中注入无感微小扰动，瓦解设备硬件指纹识别。"
    },
    "blockWebRTCLeaks": {
      "title": "WebRTC 真实 IP 泄漏防御",
      "desc": "阻止 WebRTC 通过无代理 UDP 连接泄露本地内网及真实公网 IP 地址。"
    },
    "dismissCookieBanners": {
      "title": "Cookie 授权弹窗自动屏蔽",
      "desc": "自动关闭或隐藏侵扰性的 GDPR/CCPA Cookie 同意弹窗，且绝不接受营销追踪。"
    },
    "removeOverlays": {
      "title": "遮罩层与页面滚动锁定防御",
      "desc": "粉碎透明点击陷阱遮罩，并在网页恶意冻结滚动条时自动恢复顺畅滚动。"
    },
    "defuseAntiAdblock": {
      "title": "反广告拦截检测拆弹器",
      "desc": "瓦解反广告拦截探测陷阱，提供安全虚拟变量防止网页功能损坏。"
    },
    "blockMediaPrerolls": {
      "title": "视频片头广告与 VAST 故障修复器 (修复 224003 错误)",
      "desc": "化解损坏的片头视频广告，跳过 VAST 广告崩溃（错误代码 224003），确保 JWPlayer 与 HTML5 播放器流畅播放。"
    },
    "showToastNotifications": {
      "title": "弹窗拦截气泡轻提示",
      "desc": "拦截弹窗时在页面右下角显示低调的气泡提示，支持一键放行或加入白名单。"
    },
    "stripPingAttributes": {
      "title": "超链接审计属性剥离 (<a ping=\"...\">)",
      "desc": "清除搜索引擎与社交平台在链接中潜藏的点击追踪 ping 信标。"
    },
    "trimReferrers": {
      "title": "严格 Referrer 来源网址隐私策略",
      "desc": "在跨站跳转时限制 HTTP Referer 请求头，禁止目标网站获知精确来源网址与搜索词。"
    },
    "unlockRightClick": {
      "title": "解锁鼠标右键与文字选中复制",
      "desc": "在试图禁用右键的网站上重新恢复右键菜单、文本高亮选中以及剪贴板复制功能。"
    },
    "blockAutoplay": {
      "title": "防视频自动播放护盾",
      "desc": "防止浮动或后台视频播放器在未点击的情况下自动大声播放多媒体内容。"
    }
  },
  "feature_details": {
    "popups": {
      "title": "🚫 强力弹窗与底层弹窗拦截器",
      "whatItDoes": "在创建新浏览器窗口前，拦截 window.open、虚拟链接点击触发器、底层弹窗以及后台自启行为。",
      "benefit": "彻底杜绝欺诈广告、恶意博彩/钓鱼窗口以及网页弹窗风暴。",
      "compat": "正常的用户登录弹窗（如 Google 登录、OAuth 授权窗口）不受影响，顺畅运行。"
    },
    "redirect": {
      "title": "🔀 防重定向与标签页劫持防护",
      "whatItDoes": "拦截未经真实用户交互触发的定时器跳转（location.replace/href/assign）及跨域导航。",
      "benefit": "防止下载站和流媒体站点悄悄将当前活动标签页重定向至钓鱼网站或广告网盟。",
      "compat": "标准网页浏览、单页应用（YouTube、GitHub、X）和正常链接点击均零延迟流畅运行。"
    },
    "history-trap": {
      "title": "⏪ 防止历史记录陷阱与返回键劫持",
      "whatItDoes": "严格限制滥用 HTML5 History API 狂刷历史记录的 pushState/replaceState 爆发调用。",
      "benefit": "确保点击浏览器“返回”按钮时能立即返回上一页，杜绝被困在无限广告循环中。",
      "compat": "正规单页应用路由器（React、Vue、Next.js）正常运行不受影响。"
    },
    "fullscreen": {
      "title": "🖥️ 欺诈性全屏劫持防御",
      "whatItDoes": "屏蔽假冒系统报警或无真实视频手势的恶意 requestFullscreen 全屏请求。",
      "benefit": "防止技术支持锁屏诈骗、伪造浏览器更新提示及全屏钓鱼欺诈。",
      "compat": "在 YouTube、Netflix 及正规 HTML5 播放器上点击全屏按钮依然正常工作。"
    },
    "tab-watchdog": {
      "title": "🐕 后台广告标签页看门狗",
      "whatItDoes": "通过后台 Service Worker 监控新标签页生成与跳转，毫秒级终止已知广告联盟和弹窗网址。",
      "benefit": "在垃圾标签页消耗内存、静默下载或执行追踪脚本之前将其销毁。",
      "compat": "当防护关闭、暂停或在白名单网站中时自动放行。"
    },
    "trackers": {
      "title": "🛡️ 追踪器与遥测防护装甲",
      "whatItDoes": "基于规则在网络层和 DOM 深度拦截跨站追踪像素、行为分析探针及广告画像脚本。",
      "benefit": "阻止数据公司收集你的上网足迹，并将网页加载速度提升高达 40%。",
      "compat": "强烈建议始终保持开启状态。"
    },
    "shadow-dom": {
      "title": "🔍 深度 Shadow DOM 追踪器扫描",
      "whatItDoes": "深入遍历 Web Components 的 Shadow DOM 根节点，查找并清理潜伏在隔离节点内的追踪脚本与广告。",
      "benefit": "使去广告与防追踪覆盖采用现代组件化架构并隐藏在 Shadow DOM 内的复杂网页应用。",
      "compat": "采用高效节点缓存优化，确保页面滚动时零 CPU 负担。"
    },
    "url-params": {
      "title": "🧹 URL 追踪参数自动清洗",
      "whatItDoes": "在页面加载和链接点击时自动清除 URL 查询串中的追踪标记与行为识别参数。",
      "benefit": "杜绝跨平台身份关联与画像，在向好友分享链接时保护隐私，保持网址整洁。",
      "compat": "绝不破坏网站正常导航、搜索或结账支付所需的必要参数。"
    },
    "fingerprint": {
      "title": "🕵️ Canvas 与音频指纹随机化保护",
      "whatItDoes": "对 HTML5 Canvas 渲染像素和 Web Audio 缓冲区计算结果注入确定性微噪点。",
      "benefit": "使指纹追踪脚本每次会话获取到不可关联的伪造硬件特征，彻底粉碎追踪画像。",
      "compat": "人类感官完全无法察觉，绝不影响网页图像渲染、Web 游戏或音频正常播放。"
    },
    "webrtc": {
      "title": "🔒 WebRTC 真实 IP 泄漏防御",
      "whatItDoes": "将 WebRTC 媒体流路由限制在默认公网接口，杜绝旁路探测局域网 IP 和真实 VPN 地址。",
      "benefit": "有效保护用户的真实地理位置及 VPN 隧道后的原始 IP 地址不被恶意探测。",
      "compat": "完全兼容 Google Meet、Zoom、Discord 等主流网页音视频会议系统。"
    },
    "cookies": {
      "title": "🍪 Cookie 授权弹窗自动屏蔽",
      "whatItDoes": "智能识别并自动关闭主流 Cookie 弹窗（OneTrust、Cookiebot、Didomi 等），优先选择拒绝非必要追踪。",
      "benefit": "免去在每个网站都必须手动点击关闭同意弹窗的繁琐体验，浏览更加清爽顺畅。",
      "compat": "若 Cookie 遮罩冻结了页面滚动，系统会自动解除页面滚动锁定。"
    },
    "overlays": {
      "title": "🪟 遮罩层与页面滚动锁定防御",
      "whatItDoes": "侦测透明点击陷阱、强制登录遮罩，并在页面 body 被锁定时强行恢复正常滚动能力。",
      "benefit": "无阻碍阅读那些试图通过浮层弹窗逼迫注册或阻挡文章阅读的流氓网页内容。",
      "compat": "仅在检测到滚动被异常锁死时生效，对正常模态对话框高度兼容。"
    },
    "adblock-defuse": {
      "title": "🛠️ 反广告拦截检测拆弹器",
      "whatItDoes": "阻断探测广告插件的恶意脚本，并模拟合法的空对象变量以确保页面主要逻辑正常运行。",
      "benefit": "自动绕过各大资讯与工具网站“请关闭广告拦截插件方可继续访问”的骚扰拦截弹窗。",
      "compat": "强烈建议开启以获得不被打断的无缝冲浪体验。"
    },
    "media-prerolls": {
      "title": "🎬 视频片头广告与 VAST 故障修复器 (修复 224003 错误)",
      "whatItDoes": "拦截破损的片头广告脚本，绕过 VAST 崩溃逻辑并向播放器注入合规的空响应。",
      "benefit": "根除“无法播放此视频文件（错误代码：224003）”黑屏故障，实现无广告秒播。",
      "compat": "针对 JWPlayer、Video.js 及各类 HTML5 网页视频播放器强烈推荐开启。"
    },
    "toasts": {
      "title": "💬 弹窗拦截气泡轻提示",
      "whatItDoes": "当有恶意弹窗被化解时，在视口角落显示微型浮窗，提供 1 键允许或加入信任名单操作。",
      "benefit": "提供透明直观的拦截反馈，若误拦截关键业务窗口可立即一键放行。",
      "compat": "如果您喜欢完全静默的后台纯净拦截，可随时关闭此提示。"
    },
    "ping-audit": {
      "title": "🔗 超链接审计属性剥离 (<a ping>)",
      "whatItDoes": "自动剥离 HTML 链接上的 ping 审计属性，阻断后台静默发送的点击遥测数据。",
      "benefit": "防止在点击搜索结果或社交动态时向数据中心发送行为跟踪报告。",
      "compat": "可选功能。追求极致点击隐私的用户建议开启。"
    },
    "referrer": {
      "title": "🌐 严格 Referrer 来源网址隐私策略",
      "whatItDoes": "修剪跨源 HTTP Referer 标头，仅保留根域名或最小来源信息。",
      "benefit": "防止目标服务器知晓您先前浏览的具体文章地址、内部参数或私密搜索关键词。",
      "compat": "可选功能。极少数老旧鉴权网关可能需要完整来源网址。"
    },
    "unlock-rightclick": {
      "title": "🔓 解锁鼠标右键与文字选中复制",
      "whatItDoes": "重载并阻止拦截 contextmenu、selectstart、copy 等限制事件的脚本。",
      "benefit": "彻底拿回浏览器自主控制权，自由复制文字内容、检查网页元素并在新标签页中打开链接。",
      "compat": "可选功能。在查阅学术资料、新闻或食谱类限制选中的网站时极为实用。"
    },
    "autoplay": {
      "title": "🔇 防视频自动播放护盾",
      "whatItDoes": "阻止页面加载时未经授权自启播放的悬浮视频和后台音画流。",
      "benefit": "节省笔记本电量、降低蜂窝网络流量开销，避免突然爆发出刺耳音量的惊吓。",
      "compat": "可选功能。用户主动点击播放按钮的视频不受影响，正常播放。"
    }
  }
};
window.TRANSLATIONS.ru = {
  "header_title": "Настройки ExtremeShield",
  "header_subtitle": "Защитная броня против трекеров и всплывающих окон в Manifest V3",
  "btn_update_now": "Обновить сейчас",
  "checking_update": "Проверка...",
  "update_available": "Доступно обновление! Перезапуск...",
  "update_latest": "Последняя версия",
  "update_throttled": "Проверено недавно",
  "tab_protections": "🛡️ Защита",
  "tab_whitelist": "🌐 Белый список и фильтры",
  "tab_logs": "📜 Журнал активности",
  "tab_backup": "💾 Резервная копия",
  "tab_donations": "💖 Поддержка проекта",
  "core_engines_title": "Основные модули защиты",
  "advanced_shields_title": "Дополнительные экспериментальные экраны",
  "companion_badge": "РЕКОМЕНДУЕМОЕ РАСШИРЕНИЕ",
  "companion_desc": "От создателей ExtremeShield: Загружайте потоковые видео, плейлисты m3u8 и аудиофайлы на максимальной скорости.",
  "companion_btn": "Попробовать StreamGrabber",
  "whitelist_title": "Доверенные домены (Белый список)",
  "whitelist_desc": "ExtremeShield будет полностью отключен на этих сайтах.",
  "whitelist_placeholder": "например, internal.company.com или example.org",
  "btn_add_domain": "Добавить домен",
  "whitelist_empty": "В белом списке пока нет доменов.",
  "btn_remove": "Удалить",
  "zapped_title": "Удаленные элементы (Косметические фильтры)",
  "zapped_desc": "CSS-селекторы, скрытые навсегда с помощью инструмента Element Zapper.",
  "zapped_empty": "Нет сохраненных правил скрытия элементов.",
  "logs_title": "Недавние заблокированные события",
  "logs_desc": "Поток перехваченных всплывающих окон, заблокированных трекеров и очищенных URL в реальном времени.",
  "btn_clear_logs": "Очистить журнал",
  "logs_empty": "В этой сессии событий пока не зафиксировано.",
  "backup_title": "Экспорт и импорт настроек",
  "backup_desc": "Удобный перенос ваших правил, белого списка и параметров на другие устройства.",
  "btn_export_json": "📥 Экспорт настроек (JSON)",
  "btn_import_json": "📤 Импорт настроек (JSON)",
  "reset_title": "Сброс до заводских настроек",
  "reset_desc": "Удаляет все правила, белый список и возвращает рекомендованные параметры защиты.",
  "btn_reset_defaults": "Сбросить все настройки",
  "reset_confirm": "Вы уверены, что хотите сбросить все настройки ExtremeShield? Это очистит белый список и персональные правила.",
  "import_success": "Конфигурация ExtremeShield успешно импортирована!",
  "import_error": "Неверный формат файла JSON.",
  "copied": "Скопировано!",
  "rec_tool_title": "🎬 Рекомендуемое расширение: StreamGrabber",
  "rec_tool_desc": "Нужно скачать потоковое видео, аудиодорожки или фрагменты HLS (.m3u8) для офлайн-просмотра? Попробуйте <strong>StreamGrabber</strong> — наш быстрый загрузчик медиафайлов.",
  "rec_tool_btn": "🚀 Попробовать StreamGrabber бесплатно",
  "donations_title": "💖 100% Бесплатная модель приватности",
  "donations_desc": "В отличие от коммерческих блокировщиков, продающих данные пользователей или требующих платную подписку, <strong>ExtremeShield бесплатен навсегда и не содержит платных функций</strong>. Мы существуем исключительно за счет добровольных пожертвований пользователей.",
  "donations_ways": "Способы поддержать ExtremeShield",
  "donations_kofi": "☕ Поддержать на Ko-fi",
  "donations_crypto": "КРИПТОВАЛЮТНЫЕ ДОНАТЫ",
  "btn_copy": "Копировать",
  "modal_title": "Информация о функции",
  "modal_what": "🔍 Что это делает",
  "modal_benefit": "🛡️ Преимущество для приватности и безопасности",
  "modal_compat": "⚙️ Совместимость и работа",
  "modal_ok": "Понятно",
  "info_button_title": "Подробная информация",
  "features": {
    "blockPopups": {
      "title": "Агрессивный блокировщик всплывающих окон и попандеров",
      "desc": "Перехватывает нежелательные окна, синтетические клики, попандеры и автоматические перенаправления."
    },
    "blockRedirects": {
      "title": "Защита от перенаправлений и перехвата вкладок (Tab-Under)",
      "desc": "Нейтрализует таймерные редиректы, подмену адреса и скрытые переходы вкладок."
    },
    "historyTrapDefense": {
      "title": "Защита от ловушек истории и блокировки кнопки «Назад»",
      "desc": "Ограничивает циклические вызовы pushState и replaceState, не позволяя сайтам ломать кнопку «Назад»."
    },
    "fullscreenDefense": {
      "title": "Защита от обманного полноэкранного режима",
      "desc": "Блокирует несанкционированные вызовы requestFullscreen вне видео для предотвращения фишинга."
    },
    "tabWatchdog": {
      "title": "Сторож фоновых рекламных вкладок",
      "desc": "Мгновенно закрывает всплывающие фоновые вкладки и рекламные сети до исполнения скриптов."
    },
    "blockTrackers": {
      "title": "Защита от слежки и телеметрии",
      "desc": "Блокирует межсайтовые трекеры, пиксели телеметрии, аналитику и скрипты профилирования."
    },
    "shadowDomScanner": {
      "title": "Глубокое сканирование трекеров в Shadow DOM",
      "desc": "Рекурсивно сканирует открытые деревья Shadow DOM для нейтрализации скрытой рекламы и трекеров."
    },
    "stripParams": {
      "title": "Очистка параметров отслеживания в URL",
      "desc": "Автоматически удаляет токены слежки (utm_*, fbclid, gclid, mc_cid и др.) из ссылок и адресов."
    },
    "blockFingerprinting": {
      "title": "Рандомизация цифровых отпечатков Canvas и Audio",
      "desc": "Внедряет незаметный шум в API Canvas и AudioContext для защиты от идентификации устройства."
    },
    "blockWebRTCLeaks": {
      "title": "Защита от утечек IP через WebRTC",
      "desc": "Предотвращает раскрытие локального и реального публичного IP через WebRTC UDP-соединения."
    },
    "dismissCookieBanners": {
      "title": "Автозакрытие уведомлений о Cookie",
      "desc": "Автоматически скрывает баннеры согласия на Cookie (GDPR/CCPA) без принятия трекинга."
    },
    "removeOverlays": {
      "title": "Защита от оверлеев и блокировки прокрутки",
      "desc": "Удаляет клик-ловушки и восстанавливает скроллинг, когда сайт блокирует чтение статьи."
    },
    "defuseAntiAdblock": {
      "title": "Деактиватор анти-блокировщиков (Anti-Adblock)",
      "desc": "Нейтрализует детекторы блокировки рекламы и подставляет безопасные фиктивные переменные."
    },
    "blockMediaPrerolls": {
      "title": "Нейтрализатор видеорекламы и VAST (Исправление ошибки 224003)",
      "desc": "Предотвращает зависания VAST рекламы (ошибка 224003) и обеспечивает плавный просмотр в плеерах JWPlayer и HTML5."
    },
    "showToastNotifications": {
      "title": "Всплывающие уведомления о блокировке",
      "desc": "Показывает аккуратное уведомление в углу экрана при перехвате окна с кнопкой разрешения в 1 клик."
    },
    "stripPingAttributes": {
      "title": "Удаление отслеживания кликов (<a ping=\"...\">)",
      "desc": "Удаляет скрытые маяки отслеживания кликов в ссылках поисковых систем и соцсетей."
    },
    "trimReferrers": {
      "title": "Строгая политика заголовка Referer",
      "desc": "Ограничивает передачу HTTP Referer при переходе между сайтами, скрывая точный URL источника."
    },
    "unlockRightClick": {
      "title": "Разблокировка правой кнопки мыши и выделения текста",
      "desc": "Включает контекстное меню, выделение и копирование на сайтах, пытающихся их заблокировать."
    },
    "blockAutoplay": {
      "title": "Защита от автовоспроизведения видео",
      "desc": "Предотвращает автоматический запуск видео со звуком в плавающих и фоновых плеерах."
    }
  },
  "feature_details": {
    "popups": {
      "title": "🚫 Агрессивный блокировщик всплывающих окон и попандеров",
      "whatItDoes": "Блокирует вызовы window.open, программные клики, попандеры и попытки фонового открытия контекстов до их создания.",
      "benefit": "Устраняет навязчивую рекламу, всплывающие окна казино и неконтролируемое открытие множества вкладок.",
      "compat": "Авторизационные окна (например, вход через Google или OAuth) продолжают работать штатно."
    },
    "redirect": {
      "title": "🔀 Защита от перенаправлений и перехвата вкладок (Tab-Under)",
      "whatItDoes": "Блокирует автоматические смены URL (location.replace/href/assign) и междоменные переходы без действий пользователя.",
      "benefit": "Предотвращает незаметный увод активной вкладки на фишинговые и рекламные ресурсы со стриминговых и загрузочных сайтов.",
      "compat": "Обычный веб-серфинг, SPA-сервисы (YouTube, GitHub, X) и прямые клики работают без задержек."
    },
    "history-trap": {
      "title": "⏪ Защита от ловушек истории и блокировки кнопки «Назад»",
      "whatItDoes": "Устанавливает строгий лимит на частоту вызовов HTML5 History API, спамящих историю браузера.",
      "benefit": "Гарантирует, что нажатие кнопки «Назад» возвращает на предыдущую страницу, а не удерживает в цикле рекламы.",
      "compat": "Корректная работа клиентских роутеров (React, Vue, Next.js) полностью сохраняется."
    },
    "fullscreen": {
      "title": "🖥️ Защита от обманного полноэкранного режима",
      "whatItDoes": "Запрещает переход в полноэкранный режим фейковым системным предупреждениям без явного клика по плееру.",
      "benefit": "Защищает от мошеннических экранов техподдержки, фальшивых обновлений и блокирующих окно атак.",
      "compat": "Полноэкранный просмотр видео на YouTube, Netflix и в HTML5-плеерах работает штатно."
    },
    "tab-watchdog": {
      "title": "🐕 Сторож фоновых рекламных вкладок",
      "whatItDoes": "Отслеживает создание и навигацию вкладок в сервис-воркере, немедленно закрывая рекламные домены.",
      "benefit": "Экономит оперативную память и предотвращает скачивание вредоносного ПО и запуск трекеров.",
      "compat": "Отключается при паузе защиты, общем отключении или на доменах из белого списка."
    },
    "trackers": {
      "title": "🛡️ Защита от слежки и телеметрии",
      "whatItDoes": "Перехватывает сетевые запросы и элементы DOM, связанные со счетчиками, тепловыми картами и профилированием.",
      "benefit": "Останавливает сбор истории посещений корпорациями и ускоряет загрузку страниц до 40%.",
      "compat": "Рекомендуется держать включенным постоянно."
    },
    "shadow-dom": {
      "title": "🔍 Глубокое сканирование трекеров в Shadow DOM",
      "whatItDoes": "Обходит корни Shadow DOM в веб-компонентах для удаления трекеров и баннеров, спрятанных в изолированных узлах.",
      "benefit": "Обеспечивает блокировку в современных веб-приложениях, изолирующих рекламные элементы внутри компонентов.",
      "compat": "Оптимизировано с кэшированием узлов для нулевой нагрузки на процессор при скроллинге."
    },
    "url-params": {
      "title": "🧹 Очистка параметров отслеживания в URL",
      "whatItDoes": "Очищает URL от аналитических меток и идентификаторов кликов при переходе по ссылкам.",
      "benefit": "Препятствует связыванию сессий между платформами, сохраняет приватность при отправке ссылок и делает URL аккуратными.",
      "compat": "Сохраняет важные параметры, необходимые для навигации по сайту и оформления заказов."
    },
    "fingerprint": {
      "title": "🕵️ Рандомизация цифровых отпечатков Canvas и Audio",
      "whatItDoes": "Добавляет микроскопический шум в расчеты Canvas 2D и аудиобуферов Web Audio API.",
      "benefit": "Разрушает скрипты сбора цифровых отпечатков (fingerprinting), генерируя уникальный профиль для каждой сессии.",
      "compat": "Незаметно для восприятия; не искажает изображения, веб-игры и звук."
    },
    "webrtc": {
      "title": "🔒 Защита от утечек IP через WebRTC",
      "whatItDoes": "Ограничивает маршрутизацию медиа WebRTC, не допуская раскрытия внутренних и скрытых VPN адресов.",
      "benefit": "Надежно скрывает ваш настоящий IP-адрес и топологию локальной сети от сканирующих сайтов.",
      "compat": "Полная совместимость с Google Meet, Zoom, Discord и другими сервисами видеосвязи."
    },
    "cookies": {
      "title": "🍪 Автозакрытие уведомлений о Cookie",
      "whatItDoes": "Распознает и закрывает навязчивые уведомления (OneTrust, Cookiebot и др.), отклоняя рекламные куки.",
      "benefit": "Чистый интернет без необходимости закрывать таблички с согласием на каждом открытом сайте.",
      "compat": "Автоматически возвращает прокрутку страницы, если всплывающее окно заблокировало скролл."
    },
    "overlays": {
      "title": "🪟 Защита от оверлеев и блокировки прокрутки",
      "whatItDoes": "Находит прозрачные клик-ловушки и всплывающие пейволлы, восстанавливая прокрутку тела документа.",
      "benefit": "Позволяет читать статьи на сайтах, которые пытаются заблокировать контент навязчивыми окнами подписки.",
      "compat": "Безопасно для диалоговых окон; срабатывает только при искусственной заморозке прокрутки."
    },
    "adblock-defuse": {
      "title": "🛠️ Деактиватор анти-блокировщиков (Anti-Adblock)",
      "whatItDoes": "Обезвреживает скрипты, проверяющие наличие блокировщиков, устраняя сбои в логике страниц.",
      "benefit": "Обходит экраны «Отключите блокировщик рекламы для продолжения» на новостных порталах.",
      "compat": "Рекомендуется держать включенным для беспрепятственного серфинга."
    },
    "media-prerolls": {
      "title": "🎬 Нейтрализатор видеорекламы и VAST (Исправление ошибки 224003)",
      "whatItDoes": "Перехватывает сбойные рекламные вставки VAST и возвращает плееру пустой валидный ответ.",
      "benefit": "Устраняет ошибку «Этот видеофайл не может быть воспроизведен (Код ошибки: 224003)» и запускает видео без задержек.",
      "compat": "Настоятельно рекомендуется для видеосайтов с JWPlayer, Video.js и HTML5-плеерами."
    },
    "toasts": {
      "title": "💬 Всплывающие уведомления о блокировке",
      "whatItDoes": "Выводит ненавязчивую плашку при блокировке окна, позволяя разрешить его или добавить сайт в белый список.",
      "benefit": "Дает наглядный контроль над блокировками и возможность мгновенной разблокировки при необходимости.",
      "compat": "Можно отключить для абсолютно бесшумной работы в фоновом режиме."
    },
    "ping-audit": {
      "title": "🔗 Удаление отслеживания кликов (<a ping>)",
      "whatItDoes": "Очищает атрибут ping у ссылок HTML, используемый для отправки аналитики в фоне.",
      "benefit": "Предотвращает передачу данных о ваших кликах по результатам поиска на серверы телеметрии.",
      "compat": "Опционально. Рекомендуется для максимальной приватности при переходах."
    },
    "referrer": {
      "title": "🌐 Строгая политика заголовка Referer",
      "whatItDoes": "Обрезает заголовок Referer при межсайтовых переходах, не раскрывая полный путь страницы и поисковый запрос.",
      "benefit": "Не дает сторонним серверам видеть, с какой именно статьи или страницы вы перешли.",
      "compat": "Опционально. В редких случаях устаревшие шлюзы авторизации требуют полный URL."
    },
    "unlock-rightclick": {
      "title": "🔓 Разблокировка правой кнопки мыши и выделения текста",
      "whatItDoes": "Восстанавливает стандартное контекстное меню, подсветку текста и копирование в буфер обмена.",
      "benefit": "Возвращает полный контроль над страницей: свободное копирование текста и открытие ссылок в новых вкладках.",
      "compat": "Опционально. Полезно для сайтов с рецептами, новостями и статьями, блокирующими копирование."
    },
    "autoplay": {
      "title": "🔇 Защита от автовоспроизведения видео",
      "whatItDoes": "Блокирует спонтанное автовоспроизведение медиаконтента при открытии страницы.",
      "benefit": "Экономит заряд батареи ноутбука, уменьшает расход трафика и избавляет от внезапных громких звуков.",
      "compat": "Опционально. Видео, запущенные вами вручную по кнопке воспроизведения, проигрываются нормально."
    }
  }
};
