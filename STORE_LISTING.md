# XtremeShld: Chrome Web Store Submission & Metadata Guide

---

## 📌 1. Essential Store Metadata

* **Extension Title:** `XtremeShld: Ultimate Privacy, Pop-up & Ad Blocker`
* **Previous Name:** `ExtremeShield` *(Formerly known as ExtremeShield)*
* **Short Description (Summary, max 132 chars):**  
  `XtremeShld (formerly ExtremeShield): Defense against popups, trackers, fingerprinting & ads. 100% free with zero paywalls & telemetry.`
* **Category:** `Privacy & Security` *(Alternative: Productivity / Tools)*
* **Pricing:** Free (No in-app purchases, no subscriptions, no locked tiers)
* **Website / Support URL:** `https://ko-fi.com/yesuag`
* **Privacy Policy URL:** `https://github.com/ayesua/StreamGrabber/blob/extremeshield/PRIVACY.md`

---

## 📝 2. Full Store Descriptions (4 Languages: EN, ES, ZH, RU)

### 🇺🇸 English Listing Description (United States)

```markdown
🛡️ **XtremeShld (formerly ExtremeShield): Ultimate Privacy, Pop-up & Ad Blocker (Manifest V3)**

Experience high-speed browsing, total privacy, and absolute protection from deceptive advertising. XtremeShld (formerly known as ExtremeShield) combines military-grade popup trapping, video pre-roll defusing, anti-redirect shielding, and advanced canvas fingerprint spoofing into an ultra-fast, lightweight Chrome extension with ZERO paywalls, ZERO telemetry, and ZERO tracking.

Designed with a sleek StreamGrabber-inspired interface supporting both Light Tone (☀️) and Dark Tone (🌙) themes.

---

### ⚡ KEY DEFENSE ENGINES

🚫 **Aggressive Popup, Popunder & Fullscreen Hijack Defuser**
- Traps unauthorized `window.open` calls directly at `document_start`.
- Neutralizes synthetic link click exploits, popunders, and hidden anchor triggers.
- Stops deceptive fullscreen hijack attempts (`requestFullscreen` lockouts) used by phishing websites.
- Discrete floating toast notification with 1-click "Allow Once" or "Whitelist Site" options.

🔀 **Anti-Redirect, Tab-Under & History Trapping Shield**
- Neutralizes timer-based redirects (`location.replace`, `location.assign`, meta refresh).
- Stops inactive background tabs from quietly redirecting to scam landings or fake download traps.
- **History Trapping Defense**: Defuses rapid `history.pushState` and `replaceState` loops that freeze your browser's "Back" button while preserving normal SPA navigation (YouTube, Gmail, Twitter).

🎬 **Video Pre-Roll & VAST Defuser (Fix Error Code: 224003)**
- Intercepts VAST video ad requests and returns standard clean empty VAST XML.
- Permanently fixes the dreaded "This video file cannot be played (Error Code: 224003)" on JWPlayer and HTML5 players.
- Sanitizes video player configurations and automatically skips pre-roll countdown timers.

🕵️ **Anti-Tracking, Fingerprint Spoofing & Deep Shadow DOM Scanner**
- Blocks cross-site ad networks, analytics beacons (Google, Meta, TikTok, Criteo), and session heatmaps.
- **Deep Shadow DOM Scanner**: Recursively traverses open shadow roots (`element.shadowRoot`) to eliminate disguised trackers and embedded ads.
- Spoofs Canvas 2D and AudioContext APIs with imperceptible, deterministic micro-noise to defeat cross-site device fingerprinting.
- WebRTC IP Leak Defense prevents local and public IP disclosures over non-proxied connections.
- Automatically strips tracking query parameters (`utm_*`, `fbclid`, `gclid`, `mc_cid`, etc.) from clicked links.

⚡ **Prominent Element Zapper (Alt+Shift+Z)**
- Point, laser-target, and vaporize any annoying floating banner, video overlay, or newsletter modal with 1 click.
- Includes depth adjustment slider to expand or narrow container targeting.
- Permanently remembers and applies cosmetic CSS hiding rules across visits.

🍪 **Cookie Consent Auto-Dismissal & Scroll Recovery**
- Automatically detects and dismisses intrusive GDPR/CCPA cookie walls without accepting tracking.
- **Reactive Scroll Unlocker**: Continuously clears forced `overflow: hidden` and modal lockouts on news sites.
- Neutralizes adblock detector traps (`canRunAds`) to prevent page breakage.

🎨 **StreamGrabber Design System & Dual Tone Theme**
- Switch instantly between Light Tone (☀️) and Dark Tone (🌙).
- Unified, clean typography and responsive components.

---

### 🚀 COMPANION EXTENSION
Looking to capture streaming media? Try **StreamGrabber 2**, our free companion tool:
Download streaming videos, m3u8 playlists, and audio streams directly at maximum speed with zero hassle.

---

### 🔒 100% FREE & ZERO-LOG PRIVACY PROMISE
- **Zero Data Collection:** We do not track, collect, store, or transmit your browsing history, visited URLs, or IP addresses.
- **100% Local Processing:** Every filter rule and inspection runs natively on your machine using Chrome's native Declarative Net Request (DNR) engine.
- **Zero Paywalls:** Every single feature is 100% free forever. Supported entirely by voluntary community donations.

---

### ⌨️ KEYBOARD SHORTCUTS
- **Alt + Shift + Z:** Activate Element Zapper
- **Alt + Shift + P:** Master Protection Toggle (ON / OFF)
```

---

### 🇪🇸 Spanish Listing Description (Español)

```markdown
🛡️ **XtremeShld (anteriormente ExtremeShield): Bloqueador Definitivo de Privacidad, Pop-ups y Anuncios (Manifest V3)**

Navega a máxima velocidad con privacidad total y protección absoluta contra publicidad invasiva y engañosa. XtremeShld (anteriormente conocido como ExtremeShield) combina bloqueo militar de ventanas emergentes, desactivación de anuncios en videos, escudo anti-redirecciones y protección avanzada contra la huella digital en una extensión ultra rápida para Chrome, con CERO muros de pago, CERO telemetría y CERO seguimiento.

Diseñado con la interfaz moderna de StreamGrabber con selector de Tono Claro (☀️) y Tono Oscuro (🌙).

---

### ⚡ MOTORES DE DEFENSA NÚCLEO

🚫 **Bloqueador Agresivo de Popups, Popunders y Secuestro de Pantalla Completa**
- Intercepta llamadas `window.open` no autorizadas en `document_start`.
- Neutraliza clics trampa sintéticos en enlaces ocultos, popunders y redirecciones silenciosas.
- Bloquea intentos maliciosos de forzar pantalla completa (`requestFullscreen`) usados por páginas de phishing.
- Notificación flotante discreta para permitir excepciones en 1 solo clic ("Permitir una vez" o "Lista blanca").

🔀 **Escudo Anti-Redirecciones, Tab-Under y Trampas de Historial**
- Detiene redirecciones automáticas basadas en temporizadores (`location.replace`, `location.assign`, meta refresh).
- Evita que pestañas inactivas en segundo plano redirijan silenciosamente a portales de estafas o descargas falsas.
- **Defensa Anti-Trampas de Historial**: Neutraliza bucles de `history.pushState` y `replaceState` que congelan el botón "Atrás" de tu navegador sin afectar aplicaciones SPA legítimas (YouTube, Gmail, Twitter).

🎬 **Desactivador de Anuncios Pre-roll y Reparación de Error 224003 en Videos**
- Intercepta llamadas publicitarias VAST devolviendo respuestas limpias para evitar fallos en reproductores.
- Resuelve definitivamente el temido error "This video file cannot be played (Error Code: 224003)" en JWPlayer y reproductores HTML5.
- Salta automáticamente los contadores de cuenta regresiva en videos embebidos.

🕵️ **Blindaje Anti-Rastreo, Huella Digital y Escáner Profundo de Shadow DOM**
- Bloquea redes publicitarias, píxeles de seguimiento (Google, Meta, TikTok, Criteo) y mapas de calor.
- **Escáner Profundo de Shadow DOM**: Inspecciona recursivamente árboles abiertos (`element.shadowRoot`) para eliminar rastreadores ocultos y banners disfrazados.
- Inyecta micro-ruido imperceptible en Canvas 2D y AudioContext para frustrar la identificación de tu equipo.
- Escudo contra fugas de IP por WebRTC para resguardar tu dirección IP real.
- Limpia automáticamente parámetros de seguimiento (`utm_*`, `fbclid`, `gclid`, `mc_cid`, etc.) en enlaces visitados.

⚡ **Element Zapper Destacado (Alt+Shift+Z)**
- Mira interactiva para vaporizar cualquier banner flotante, reproductor invasivo o modal publicitario con 1 clic.
- Control deslizante para ajustar la profundidad del contenedor seleccionado.
- Guarda y aplica permanentemente reglas cosméticas CSS en cada dominio.

🍪 **Auto-Cierre de Banners de Cookies y Desbloqueo de Scroll**
- Elimina avisos GDPR/CCPA sin aceptar cookies de seguimiento.
- **Desbloqueo Reactivo de Scroll**: Detecta y remueve bloqueos forzados de scroll (`overflow: hidden`) en sitios de noticias.
- Neutraliza detectores de bloqueadores (`canRunAds`) para evitar pantallas rotas.

🎨 **Diseño StreamGrabber y Modo Dual Claro/Oscuro**
- Cambia al instante entre Tono Claro (☀️) y Tono Oscuro (🌙).
- Tipografía nítida y elementos visuales optimizados.

---

### 🚀 EXTENSIÓN COMPAÑERA
¿Necesitas descargar contenido multimedia? Prueba **StreamGrabber 2**:
Descarga videos en streaming, listas m3u8 y pistas de audio directamente a la máxima velocidad disponible y sin complicaciones.

---

### 🔒 100% GRATIS Y PRIVACIDAD TOTAL SIN REGISTROS
- **Cero Recopilación de Datos:** No almacenamos, recopilamos ni enviamos tu historial a servidores externos.
- **Procesamiento 100% Local:** Todo se evalúa en tu propio equipo mediante Declarative Net Request (DNR) de Chrome.
- **Cero Muros de Pago:** Todas las funciones son 100% libres y financiadas exclusivamente por donaciones comunitarias.

---

### ⌨️ ATAJOS DE TECLADO
- **Alt + Shift + Z:** Activar Element Zapper
- **Alt + Shift + P:** Encender / Apagar Protección Global
```

---

### 🇨🇳 Chinese Listing Description (中文 - 中国)

```markdown
🛡️ **XtremeShld（原名 ExtremeShield）：终极隐私保护、弹窗与广告拦截装甲 (Manifest V3)**

体验极致浏览速度、绝对隐私保护与全方位恶意广告拦截。XtremeShld（原名 ExtremeShield）将弹窗拦截、视频前贴片广告跳过、防恶意重定向及高级 Canvas 指纹伪装技术融于一身，打造超快、轻量级的 Chrome 扩展。无付费墙、无数据遥测、零用户追踪。

全新采用 StreamGrabber 现代设计系统，并支持即时切换浅色明亮色调 (☀️) 与深色护黑色调 (🌙)。

---

### ⚡ 核心防御引擎

🚫 **强力弹窗、底层弹窗 (Popunder) 与全屏劫持拦截**
- 在 `document_start` 阶段直接拦截未授权的 `window.open` 调用。
- 瓦解伪装的动态链接点击陷阱、静默底层弹窗 (popunder) 与欺诈性跳转。
- 拦截钓鱼网站恶意强制调用 `requestFullscreen` 锁死全屏的行为。
- 底部轻量通知提示，支持一键“仅允许一次”或“加入白名单”。

🔀 **防重定向、底层新标签与浏览器“后退”历史锁死防御**
- 拦截基于定时器的强制重定向 (`location.replace`、`location.assign` 及 meta refresh)。
- 阻止后台静默标签页擅自跳转至欺诈下载或推广页面。
- **历史记录防锁死防御 (History Trap Defense)**：瓦解恶意脚本通过无限循环调用 `history.pushState` 锁死浏览器“后退”按钮的行径，同时完全兼容 YouTube、Twitter、Gmail 等主流 SPA 单页应用。

🎬 **视频前贴片广告消除与 Error 224003 修复**
- 拦截 VAST 视频广告网络请求并自动返回标准空 VAST XML 数据包。
- 彻底解决 JWPlayer 及 HTML5 播放器中恼人的“无法播放此视频文件 (错误代码: 224003)”。
- 净化视频播放器广告配置，自动跳过倒计时前贴片等待。

🕵️ **防追踪、指纹伪装与 Deep Shadow DOM 递归扫描**
- 全面屏蔽第三方广告追踪域、遥测像素 (Google、Meta、TikTok、Criteo) 与行为热力图分析。
- **Deep Shadow DOM 扫描器**：递归穿透开放式 Shadow DOM 树 (`element.shadowRoot`)，清除藏匿于组件阴影根中的隐形追踪代码。
- 针对 Canvas 2D 与 AudioContext API 注入不可感知的确定性微扰动，彻底击溃设备指纹识别算法。
- WebRTC IP 泄露防御：防止非代理环境下的真实内网与公网 IP 意外暴露。
- 自动过滤点击链接中的商业追踪参数 (`utm_*`、`fbclid`、`gclid`、`mc_cid` 等)。

⚡ **可视化元素擦除器 Element Zapper (Alt+Shift+Z)**
- 激光瞄准任意漂浮横幅、视频覆盖遮罩或订阅弹窗，一键瞬间永久清除。
- 配备容器层级滑块，自由微调选择范围。
- 自动在本地持久化保存域名专用的 CSS 屏蔽规则。

🍪 **自动关闭 Cookie 授权弹窗与滚动条防锁死恢复**
- 自动清除繁琐的 GDPR/CCPA Cookie 遮罩，无需接受任何侵犯隐私的追踪条款。
- **响应式滚动锁解锁器**：持续监控并清除新闻资讯网站恶意强加的 `overflow: hidden` 与锁死页面。
- 瓦解防广告拦截检测器脚本 (`canRunAds`)，防止网页崩溃报错。

🎨 **STREAMGRABBER 质感设计与浅色/深色双主题**
- 自由切换浅色明亮模式 (☀️) 或深色护眼模式 (🌙)。
- 统一精致的排版设计与响应式操控界面。

---

### 🚀 官方配套扩展推荐
需要抓取或下载网络视频？欢迎体验我们的免费配套工具 **StreamGrabber 2**：
支持极速抓取在线流媒体视频、m3u8 切片播放列表及高品质音频，简单快捷。

---

### 🔒 100% 免费与零日志隐私承诺
- **零数据收集：** 绝不收集、存储、回传或转售您的任何浏览记录、访问网址或 IP 地址。
- **100% 本地运算：** 依托 Chrome 原生 Declarative Net Request (DNR) 引擎在本地快速处理所有规则。
- **零付费门槛：** 全部功能终身免费开放，完全依靠社区自愿捐助支持。

---

### ⌨️ 快捷键指南
- **Alt + Shift + Z:** 启动元素擦除器 (Element Zapper)
- **Alt + Shift + P:** 全局防护总开关 (开启 / 关闭)
```

---

### 🇷🇺 Russian Listing Description (Русский)

```markdown
🛡️ **XtremeShld (ранее ExtremeShield): Полная защита от всплывающих окон, рекламы и слежки (Manifest V3)**

Наслаждайтесь молниеносной скоростью интернета, абсолютной конфиденциальностью и надежной защитой от навязчивой рекламы. XtremeShld (ранее известное как ExtremeShield) объединяет блокировку всплывающих окон, пропуск видеорекламы, защиту от скрытых перенаправлений и защиту от фингерпринтинга в быстром расширении для Chrome без платных подписок, без телеметрии и без сбора данных.

Современный дизайн в стиле StreamGrabber с поддержкой переключения между Светлой (☀️) и Темной (🌙) темами.

---

### ⚡ КЛЮЧЕВЫЕ МОДУЛИ ЗАЩИТЫ

🚫 **Блокировка Pop-up, Pop-under и захвата полноэкранного режима**
- Перехватывает несанкционированные вызовы `window.open` на этапе `document_start`.
- Блокирует скрытые pop-under окна, симулированные клики по скрытым ссылкам и перенаправления.
- Предотвращает мошеннические попытки принудительного включения полноэкранного режима (`requestFullscreen`).
- Ненавязчивое уведомление с возможностью разрешить окно один раз или добавить сайт в белый список.

🔀 **Защита от перенаправлений, Tab-under и блокировки кнопки «Назад»**
- Нейтрализует принудительные перенаправления по таймеру (`location.replace`, `location.assign`, meta refresh).
- Не позволяет неактивным фоновым вкладкам переключаться на фишинговые сайты или ложные загрузчики.
- **Защита от блокировки кнопки «Назад» (History Trapping Defense)**: предотвращает зависание навигации из-за циклических вызовов `history.pushState`, сохраняя корректную работу SPA-сервисов (YouTube, Gmail, Twitter).

🎬 **Пропуск предварительной видеорекламы и исправление ошибки 224003**
- Перехватывает VAST-запросы видеорекламы и возвращает корректный пустой ответ VAST XML.
- Навсегда устраняет ошибку «This video file cannot be played (Error Code: 224003)» в JWPlayer и HTML5-плеерах.
- Очищает рекламные параметры плееров и автоматически пропускает таймеры видеорекламы.

🕵️ **Антитрекинг, защита от фингерпринтинга и сканирование Shadow DOM**
- Блокирует трекеры, пиксели слежки (Google, Meta, TikTok, Criteo) и тепловые карты поведения.
- **Сканер Shadow DOM**: рекурсивно проверяет открытые узлы (`element.shadowRoot`) для удаления скрытых рекламных элементов.
- Добавляет неощутимый микрошум в Canvas 2D и AudioContext, предотвращая снятие цифрового отпечатка устройства.
- Защита от утечек IP через WebRTC защищает ваш реальный сетевой адрес.
- Автоматически очищает ссылки от маркетинговых параметров (`utm_*`, `fbclid`, `gclid`, `mc_cid` и др.).

⚡ **Умный удалитель элементов Element Zapper (Alt+Shift+Z)**
- Наведите курсор и удалите любой навязчивый баннер, всплывающий блок или окно подписки в один клик.
- Ползунок глубины для точной настройки границ удаляемого блока.
- Сохраняет косметические CSS-правила локально для каждого сайта.

🍪 **Автоматическое закрытие Cookie-баннеров и разблокировка прокрутки**
- Скрывает навязчивые предупреждения GDPR/CCPA без принятия отслеживающих файлов cookie.
- **Непрерывная разблокировка прокрутки**: автоматически снимает принудительную блокировку скролла (`overflow: hidden`) на новостных порталах.
- Нейтрализует скрипты обнаружения блокировщиков (`canRunAds`).

🎨 **Дизайн стиля StreamGrabber и две темы оформления**
- Удобный переключатель между Светлой темой (☀️) и Темной темой (🌙).
- Четкая типографика и отзывчивый интерфейс.

---

### 🚀 РЕКОМЕНДУЕМОЕ РАСШИРЕНИЕ-КОМПАНЬОН
Хотите легко сохранять видео и аудио из интернета? Попробуйте **StreamGrabber 2**:
Загружайте потоковые видеоролики, плейлисты m3u8 и звуковые дорожки напрямую на максимальной скорости.

---

### 🔒 100% БЕСПЛАТНО И ПОЛНАЯ КОНФИДЕНЦИАЛЬНОСТЬ
- **Никакого сбора данных:** мы не собираем, не храним и не передаем историю посещений, адреса сайтов или IP-адреса.
- **Полностью локальная работа:** все правила обрабатываются локально через Chrome Declarative Net Request (DNR).
- **Без платных функций:** все возможности открыты для всех пользователей и развиваются благодаря добровольным пожертвованиям.

---

### ⌨️ ГОРЯЧИЕ КЛАВИШИ
- **Alt + Shift + Z:** Активировать удалитель элементов (Element Zapper)
- **Alt + Shift + P:** Включить / Выключить общую защиту
```

---

## 🎯 3. Single Purpose Statement (Declaración de Propósito Único para CWS)

> **Single Purpose Description:**  
> *"XtremeShld (formerly ExtremeShield) protects user privacy and browsing performance by intercepting unrequested popups, blocking cross-site tracking networks, spoofing canvas/audio device fingerprinting, and preventing malicious navigation redirects using native Chrome Declarative Net Request and content scripts."*

---

## 🔑 4. Permission Justifications (Para el Formulario de la Consola CWS)

| Permiso | Justificación para el Revisor de Google (Copiar y Pegar) |
| :--- | :--- |
| **`declarativeNetRequest`** | Used to block known third-party tracking domains, ad telemetry pixels, and popup ad networks at the network layer with zero latency. |
| **`declarativeNetRequestFeedback`** | Used in background debug telemetry to report the exact count and categories of blocked trackers to the user in the popup interface. |
| **`storage`** | Used exclusively to store user preferences locally, including active protection toggles, theme mode, domain whitelist, and custom cosmetic CSS rules. |
| **`contextMenus`** | Provides fast context menu shortcuts to activate the Element Zapper tool or whitelist the current domain. |
| **`scripting`** | Used to dynamically inject cosmetic hiding rules and the interactive Element Zapper overlay onto the current tab when triggered by the user. |
| **`privacy`** | Used to configure WebRTC IP handling policy to 'default_public_interface_only' to protect users against IP leaks over UDP. |
| **`tabs`** | Used to query the active tab's hostname and status for display in the popup interface, and to close unrequested advertising popup tabs. |
| **Host Permissions (`<all_urls>`)** | Required to defuse synthetic click-jacking, neutralize popunders, auto-dismiss GDPR cookie walls, and strip URL tracking parameters across arbitrary websites visited by the user. |
