/**
 * Video Downloader - XtremeGrbr
 * Internationalization (i18n) Module
 * Supported Languages:
 *  - en: English (United States)
 *  - es: Spanish (Español)
 *  - zh_CN: Chinese - China (简体中文)
 *  - ru: Russian (Русский)
 */

const SG_I18N = {
  // English (United States) - Default
  en: {
    // General / Branding
    appName: 'Video Downloader - XtremeGrbr',
    appShortName: 'XtremeGrbr',
    appVersion: 'v3.5.1',
    settingsTitle: 'Settings - Video Downloader - XtremeGrbr',
    optionsHeading: 'XtremeGrbr Settings',
    languageSelectorLabel: 'Language / Idioma / 语言 / Язык',
    themeSelectorLabel: 'Interface Theme (Light / Dark)',
    themeLight: '☀️ Light Tone',
    themeDark: '🌙 Dark Tone',
    btnToggleTheme: 'Toggle Light / Dark Theme',

    // Options Form
    askFilenameLabel: 'Ask for file name before downloading',
    askFilenameHelp: 'When enabled, you will be prompted to enter or customize the file name before saving.',
    showFloatingBtnLabel: 'Show floating download button on video players',
    showFloatingBtnHelp: 'Displays a discreet hover button on HTML5 video players on websites to download with one click.',
    minSizeLabel: 'Minimum File Size Filter (KB)',
    minSizeHelp: 'Ignore small video clips, ads, or audio effects below this size threshold.',
    maxThreadsLabel: 'Simultaneous HLS Connections (.m3u8)',
    maxThreadsHelp: 'Number of streaming segments downloaded concurrently.',
    maxThreadsStandard: '3 Connections (Standard)',
    maxThreadsFast: '5 Connections (Fast - Recommended)',
    maxThreadsUltra: '8 Connections (Ultra Fast)',
    defaultFormatLabel: 'Default Download Format',
    defaultFormatHelp: 'Preferred format for saving video streams. The highest available resolution will always be selected.',
    formatMp4: 'MP4 (Universal - High Compatibility)',
    formatMkv: 'MKV (Matroska)',
    formatTs: 'TS (Transport Stream)',
    autoDetectLabel: 'Automatic Network Detection',
    autoDetectEnabled: 'Enabled (Recommended)',
    autoDetectDisabled: 'Disabled',
    btnSave: 'Save Preferences',
    toastSaved: 'Preferences saved successfully!',

    // Updates
    updatesCardTitle: 'Updates & Version',
    currentVersionLabel: 'Current Version: v3.5.1',
    btnCheckUpdates: 'Check for Updates',
    checkingUpdates: 'Checking for updates...',
    upToDate: 'XtremeGrbr is up to date! (v3.5.1)',
    updateAvailable: 'A new update is available! Updating...',
    updateThrottled: 'Checked recently. You are on the latest version (v3.5.1).',
    updateError: 'Unable to check at this moment. Please check the Web Store.',

    // ExtremeShield Promo
    extremeShieldTitle: '🛡️ Try ExtremeShield: Ultimate Tracker & Popup Blocker',
    extremeShieldBadge: 'Recommended Partner Extension',
    extremeShieldDesc: 'Tired of malicious redirects, popups, and aggressive trackers interfering with video streaming? Try ExtremeShield to block annoying ads, popunders, and telemetry automatically with zero performance impact.',
    extremeShieldBtn: '🚀 Try ExtremeShield Free',

    // Support & Donations
    supportTitle: '💖 Support XtremeGrbr',
    supportBadge: '100% Free • Open Model',
    supportDesc: 'XtremeGrbr is completely free, zero-log, and has zero paywalls. Your donations support development, keep HLS sniffers updated, and ensure uninterrupted high-speed video downloads!',
    kofiBtn: '☕ Support me on Ko-fi',
    paypalBtn: '🅿️ Support me on PayPal',
    cryptoTitle: 'Cryptocurrency Tips',
    copyBtn: 'Copy',
    copiedBtn: 'Copied! ✓',

    // Popup UI
    topDonate: 'Donate',
    btnToggleControls: 'Toggle / Force Native Video Controls on Page (Play/Pause, Seekbar, Volume)',
    btnRescan: 'Rescan videos and media frames',
    btnSettings: 'Settings',
    loadingTab: 'Loading tab...',
    detectedCount: 'detected',
    pillAll: 'All',
    pillVideos: 'Videos',
    pillAudios: 'Audio',
    activeDownloads: '⚡ Active Downloads',
    emptyTitle: 'No videos detected yet',
    emptyText: 'Start playing the video on the web page so the sniffer can capture the complete stream and video frame.',
    btnDownload: 'Download',
    btnPreview: 'Preview',
    btnRotate: 'Rotate ↺',
    btnCopyUrl: 'Copy Link',
    btnFeedback: 'Feedback',
    previewModalTitle: 'Video Preview',
    previewRotateOverlay: 'Click to rotate video orientation (↺ 90°)',
    previewDownloadStream: 'Download Current Stream',
    closeModal: 'Close',
    promoShieldTitle: 'Block Video Ads & Popups:',
    promoShieldDesc: 'Try ExtremeShield Free!',
    promoShieldBtn: 'Get ↗',
    startingDownload: 'Starting...',
    connectingStream: 'Connecting to stream...'
  },

  // Spanish (Español)
  es: {
    // General / Branding
    appName: 'Video Downloader - XtremeGrbr',
    appShortName: 'XtremeGrbr',
    appVersion: 'v3.5.1',
    settingsTitle: 'Configuración - Video Downloader - XtremeGrbr',
    optionsHeading: 'Configuración de XtremeGrbr',
    languageSelectorLabel: 'Idioma / Language / 语言 / Язык',
    themeSelectorLabel: 'Tema de la interfaz (Claro / Oscuro)',
    themeLight: '☀️ Tono Claro',
    themeDark: '🌙 Tono Oscuro',
    btnToggleTheme: 'Cambiar entre Tema Claro / Oscuro',

    // Options Form
    askFilenameLabel: 'Preguntar el nombre del archivo antes de descargar',
    askFilenameHelp: 'Al activarlo, se le pedirá ingresar o personalizar el nombre del archivo antes de guardarlo.',
    showFloatingBtnLabel: 'Mostrar botón flotante de descarga en reproductores de video',
    showFloatingBtnHelp: 'Muestra un botón discreto sobre los videos HTML5 en páginas web para descargar con un solo clic.',
    minSizeLabel: 'Filtro de tamaño mínimo de archivo (KB)',
    minSizeHelp: 'Ignora clips cortos, anuncios o efectos de audio por debajo de este tamaño.',
    maxThreadsLabel: 'Conexiones simultáneas para HLS (.m3u8)',
    maxThreadsHelp: 'Cantidad de segmentos de transmisión descargados al mismo tiempo.',
    maxThreadsStandard: '3 Conexiones (Estándar)',
    maxThreadsFast: '5 Conexiones (Rápido - Recomendado)',
    maxThreadsUltra: '8 Conexiones (Ultra Rápido)',
    defaultFormatLabel: 'Formato de descarga predeterminado',
    defaultFormatHelp: 'Formato preferido para guardar videos. Siempre se seleccionará la mayor resolución disponible.',
    formatMp4: 'MP4 (Universal - Alta compatibilidad)',
    formatMkv: 'MKV (Matroska)',
    formatTs: 'TS (Transport Stream)',
    autoDetectLabel: 'Detección automática de red',
    autoDetectEnabled: 'Activado (Recomendado)',
    autoDetectDisabled: 'Desactivado',
    btnSave: 'Guardar preferencias',
    toastSaved: '¡Preferencias guardadas con éxito!',

    // Updates
    updatesCardTitle: 'Actualizaciones y Versión',
    currentVersionLabel: 'Versión actual: v3.5.1',
    btnCheckUpdates: 'Buscar actualizaciones',
    checkingUpdates: 'Buscando actualizaciones...',
    upToDate: '¡XtremeGrbr está actualizado! (v3.5.1)',
    updateAvailable: '¡Hay una nueva versión disponible! Actualizando...',
    updateThrottled: 'Comprobado recientemente. Tienes la última versión (v3.5.1).',
    updateError: 'No se pudo comprobar en este momento. Revisa la Chrome Web Store.',

    // ExtremeShield Promo
    extremeShieldTitle: '🛡️ Prueba ExtremeShield: Bloqueador definitivo de rastreadores y ventanas emergentes',
    extremeShieldBadge: 'Extensión asociada recomendada',
    extremeShieldDesc: '¿Cansado de redirecciones maliciosas, ventanas emergentes y rastreadores invasivos al ver videos? Prueba ExtremeShield para bloquear anuncios molestos, popunders y telemetría automáticamente sin ralentizar tu navegador.',
    extremeShieldBtn: '🚀 Probar ExtremeShield Gratis',

    // Support & Donations
    supportTitle: '💖 Apoyar a XtremeGrbr',
    supportBadge: '100% Gratis • Modelo Abierto',
    supportDesc: 'XtremeGrbr es completamente gratuito, sin registros ni muros de pago. ¡Tus donaciones impulsan el desarrollo continuo y descargas de alta velocidad sin interrupciones!',
    kofiBtn: '☕ Apóyame en Ko-fi',
    paypalBtn: '🅿️ Apóyame en PayPal',
    cryptoTitle: 'Propinas en Criptomonedas',
    copyBtn: 'Copiar',
    copiedBtn: '¡Copiado! ✓',

    // Popup UI
    topDonate: 'Donar',
    btnToggleControls: 'Forzar controles nativos en el reproductor (Play/Pausa, Barra, Volumen)',
    btnRescan: 'Reescanear videos y medios',
    btnSettings: 'Configuración',
    loadingTab: 'Cargando pestaña...',
    detectedCount: 'detectados',
    pillAll: 'Todos',
    pillVideos: 'Videos',
    pillAudios: 'Audio',
    activeDownloads: '⚡ Descargas activas',
    emptyTitle: 'Aún no se detectan videos',
    emptyText: 'Reproduce el video en la página web para que el detector capture la transmisión y el cuadro de video.',
    btnDownload: 'Descargar',
    btnPreview: 'Vista previa',
    btnRotate: 'Girar ↺',
    btnCopyUrl: 'Copiar enlace',
    btnFeedback: 'Comentarios',
    previewModalTitle: 'Vista previa de video',
    previewRotateOverlay: 'Haz clic para rotar la orientación (↺ 90°)',
    previewDownloadStream: 'Descargar transmisión actual',
    closeModal: 'Cerrar',
    promoShieldTitle: 'Bloquea anuncios y ventanas emergentes:',
    promoShieldDesc: '¡Prueba ExtremeShield Gratis!',
    promoShieldBtn: 'Obtener ↗',
    startingDownload: 'Iniciando...',
    connectingStream: 'Conectando con el video...'
  },

  // Chinese (China) - 简体中文
  zh_CN: {
    // General / Branding
    appName: 'Video Downloader - XtremeGrbr',
    appShortName: 'XtremeGrbr',
    appVersion: 'v3.5.1',
    settingsTitle: '设置 - Video Downloader - XtremeGrbr',
    optionsHeading: 'XtremeGrbr 设置',
    languageSelectorLabel: '语言 / Language / Idioma / Язык',
    themeSelectorLabel: '界面主题 (浅色 / 深色)',
    themeLight: '☀️ 浅色模式',
    themeDark: '🌙 深色模式',
    btnToggleTheme: '切换浅色/深色主题',

    // Options Form
    askFilenameLabel: '下载前询问文件名',
    askFilenameHelp: '启用后，在保存前系统会提示您输入或自定义文件名。',
    showFloatingBtnLabel: '在视频播放器上显示悬浮下载按钮',
    showFloatingBtnHelp: '在网页上的 HTML5 视频播放器上显示悬浮按钮，一键快速下载。',
    minSizeLabel: '最小文件大小过滤 (KB)',
    minSizeHelp: '忽略低于此大小阈值的小视频片段、广告或音频效果。',
    maxThreadsLabel: 'HLS (.m3u8) 同时连接并发数',
    maxThreadsHelp: '同时并发下载的流媒体分片数量。',
    maxThreadsStandard: '3 个连接 (标准)',
    maxThreadsFast: '5 个连接 (快速 - 推荐)',
    maxThreadsUltra: '8 个连接 (超快速)',
    defaultFormatLabel: '默认下载格式',
    defaultFormatHelp: '保存视频流的首选格式。系统将始终自动选择最高可用分辨率。',
    formatMp4: 'MP4 (通用 - 最高兼容性)',
    formatMkv: 'MKV (Matroska)',
    formatTs: 'TS (传输流)',
    autoDetectLabel: '自动网络嗅探检测',
    autoDetectEnabled: '已启用 (推荐)',
    autoDetectDisabled: '已禁用',
    btnSave: '保存设置',
    toastSaved: '设置已成功保存！',

    // Updates
    updatesCardTitle: '更新与版本信息',
    currentVersionLabel: '当前版本：v3.5.1',
    btnCheckUpdates: '检查更新',
    checkingUpdates: '正在检查更新...',
    upToDate: 'XtremeGrbr 已是最新版本！(v3.5.1)',
    updateAvailable: '发现新版本！正在更新...',
    updateThrottled: '最近已检查。您当前使用的是最新版本 (v3.5.1)。',
    updateError: '当前无法检查更新，请前往 Chrome 网上应用店查看。',

    // ExtremeShield Promo
    extremeShieldTitle: '🛡️ 推荐体验 ExtremeShield：强力拦截弹窗与追踪器',
    extremeShieldBadge: '推荐合作伙伴扩展',
    extremeShieldDesc: '看视频时总被恶意重定向、弹窗广告和侵入式追踪器打扰？试试 ExtremeShield，全自动拦截烦人广告与弹窗，零性能损耗，流畅纯净！',
    extremeShieldBtn: '🚀 免费体验 ExtremeShield',

    // Support & Donations
    supportTitle: '💖 支持 XtremeGrbr',
    supportBadge: '100% 免费 • 开放模式',
    supportDesc: 'XtremeGrbr 完全免费、零日志、无任何付费门槛。您的赞助将支持持续开发、升级 HLS 嗅探器并保障高速下载！',
    kofiBtn: '☕ 在 Ko-fi 上支持我',
    paypalBtn: '🅿️ 在 PayPal 上支持我',
    cryptoTitle: '加密货币赞赏',
    copyBtn: '复制',
    copiedBtn: '已复制！✓',

    // Popup UI
    topDonate: '赞助',
    btnToggleControls: '强制启用原生播放控制栏 (播放/暂停/进度/音量)',
    btnRescan: '重新扫描视频和多媒体资源',
    btnSettings: '设置',
    loadingTab: '正在加载标签页...',
    detectedCount: '个已检测',
    pillAll: '全部',
    pillVideos: '视频',
    pillAudios: '音频',
    activeDownloads: '⚡ 进行中的下载',
    emptyTitle: '暂未检测到视频',
    emptyText: '请在网页上点击播放视频，以便嗅探器捕获完整的分辨率流与视频帧。',
    btnDownload: '下载',
    btnPreview: '预览',
    btnRotate: '旋转 ↺',
    btnCopyUrl: '复制链接',
    btnFeedback: '反馈建议',
    previewModalTitle: '视频预览',
    previewRotateOverlay: '点击旋转视频方向 (↺ 90°)',
    previewDownloadStream: '下载当前流',
    closeModal: '关闭',
    promoShieldTitle: '拦截视频弹窗与烦人广告：',
    promoShieldDesc: '免费体验 ExtremeShield！',
    promoShieldBtn: '获取 ↗',
    startingDownload: '正在启动...',
    connectingStream: '正在连接视频流...'
  },

  // Russian (Русский)
  ru: {
    // General / Branding
    appName: 'Video Downloader - XtremeGrbr',
    appShortName: 'XtremeGrbr',
    appVersion: 'v3.5.1',
    settingsTitle: 'Настройки - Video Downloader - XtremeGrbr',
    optionsHeading: 'Настройки XtremeGrbr',
    languageSelectorLabel: 'Язык / Language / Idioma / 语言',
    themeSelectorLabel: 'Тема интерфейса (Светлая / Темная)',
    themeLight: '☀️ Светлый тон',
    themeDark: '🌙 Темный тон',
    btnToggleTheme: 'Переключить светлую/темную тему',

    // Options Form
    askFilenameLabel: 'Запрашивать имя файла перед загрузкой',
    askFilenameHelp: 'Если включено, перед сохранением появится окно для ввода или изменения имени файла.',
    showFloatingBtnLabel: 'Показывать плавающую кнопку загрузки на видеоплеерах',
    showFloatingBtnHelp: 'Отображает аккуратную кнопку поверх HTML5-видеоплееров для скачивания в один клик.',
    minSizeLabel: 'Минимальный размер файла (КБ)',
    minSizeHelp: 'Игнорировать короткие клипы, рекламу и аудиоэффекты меньше указанного размера.',
    maxThreadsLabel: 'Одновременные подключения HLS (.m3u8)',
    maxThreadsHelp: 'Количество одновременно скачиваемых сегментов потокового видео.',
    maxThreadsStandard: '3 соединения (Стандартное)',
    maxThreadsFast: '5 соединений (Быстрое - Рекомендуется)',
    maxThreadsUltra: '8 соединений (Ультра-быстрое)',
    defaultFormatLabel: 'Формат загрузки по умолчанию',
    defaultFormatHelp: 'Предпочтительный формат для сохранения видео. Всегда будет выбрано наивысшее доступное качество.',
    formatMp4: 'MP4 (Универсальный - Максимальная совместимость)',
    formatMkv: 'MKV (Matroska)',
    formatTs: 'TS (Транспортный поток)',
    autoDetectLabel: 'Автоматическое обнаружение в сети',
    autoDetectEnabled: 'Включено (Рекомендуется)',
    autoDetectDisabled: 'Отключено',
    btnSave: 'Сохранить настройки',
    toastSaved: 'Настройки успешно сохранены!',

    // Updates
    updatesCardTitle: 'Обновления и версия',
    currentVersionLabel: 'Текущая версия: v3.5.1',
    btnCheckUpdates: 'Проверить обновления',
    checkingUpdates: 'Проверка обновлений...',
    upToDate: 'XtremeGrbr обновлен до актуальной версии! (v3.5.1)',
    updateAvailable: 'Доступно обновление! Обновление...',
    updateThrottled: 'Проверка уже выполнялась недавно. У вас последняя версия (v3.5.1).',
    updateError: 'Не удалось проверить сейчас. Проверьте Chrome Web Store.',

    // ExtremeShield Promo
    extremeShieldTitle: '🛡️ Попробуйте ExtremeShield: Блокировщик трекеров и всплывающих окон',
    extremeShieldBadge: 'Рекомендуемое расширение-партнер',
    extremeShieldDesc: 'Устали от назойливых редиректов, всплывающих окон и слежки при просмотре видео? Установите ExtremeShield, чтобы навсегда заблокировать рекламу и поп-апы без замедления браузера.',
    extremeShieldBtn: '🚀 Попробовать ExtremeShield бесплатно',

    // Support & Donations
    supportTitle: '💖 Поддержать XtremeGrbr',
    supportBadge: '100% Бесплатно • Открытая модель',
    supportDesc: 'XtremeGrbr полностью бесплатен, не ведет логов и не имеет скрытых платежей. Ваша поддержка помогает развивать проект, обновлять парсеры HLS и обеспечивать максимальную скорость загрузки!',
    kofiBtn: '☕ Поддержать на Ko-fi',
    paypalBtn: '🅿️ Поддержать на PayPal',
    cryptoTitle: 'Криптовалютные донаты',
    copyBtn: 'Копировать',
    copiedBtn: 'Скопировано! ✓',

    // Popup UI
    topDonate: 'Донат',
    btnToggleControls: 'Включить стандартные элементы управления (Play/Пауза, Перемотка, Громкость)',
    btnRescan: 'Пересканировать видео и медиафайлы',
    btnSettings: 'Настройки',
    loadingTab: 'Загрузка вкладки...',
    detectedCount: 'найдено',
    pillAll: 'Все',
    pillVideos: 'Видео',
    pillAudios: 'Аудио',
    activeDownloads: '⚡ Активные загрузки',
    emptyTitle: 'Видео пока не обнаружены',
    emptyText: 'Запустите воспроизведение видео на странице, чтобы модуль перехвата зафиксировал поток и кадр видео.',
    btnDownload: 'Скачать',
    btnPreview: 'Просмотр',
    btnRotate: 'Повернуть ↺',
    btnCopyUrl: 'Копировать ссылку',
    btnFeedback: 'Отзыв',
    previewModalTitle: 'Предпросмотр видео',
    previewRotateOverlay: 'Нажмите, чтобы повернуть ориентацию (↺ 90°)',
    previewDownloadStream: 'Скачать текущий поток',
    closeModal: 'Закрыть',
    promoShieldTitle: 'Блокируйте рекламу и поп-апы:',
    promoShieldDesc: 'Попробуйте ExtremeShield бесплатно!',
    promoShieldBtn: 'Открыть ↗',
    startingDownload: 'Запуск...',
    connectingStream: 'Подключение к потоку...'
  }
};

/**
 * Normalizes language codes to our supported set: 'en', 'es', 'zh_CN', 'ru'.
 */
function normalizeLanguage(langCode) {
  if (!langCode) return 'en';
  const clean = langCode.toLowerCase().replace('-', '_');
  if (clean.startsWith('es')) return 'es';
  if (clean.startsWith('zh')) return 'zh_CN';
  if (clean.startsWith('ru')) return 'ru';
  return 'en';
}

/**
 * Translates a given key into the target language with fallback to English.
 */
function t(key, lang = 'en') {
  const norm = normalizeLanguage(lang);
  const dict = SG_I18N[norm] || SG_I18N.en;
  if (dict && dict[key] !== undefined) {
    return dict[key];
  }
  return SG_I18N.en[key] || key;
}

/**
 * Retrieves the user's stored language preference from chrome.storage.sync
 * with fallback to navigator.language.
 */
function getStoredLanguage(callback) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({ selectedLanguage: null }, (res) => {
      if (res && res.selectedLanguage) {
        callback(normalizeLanguage(res.selectedLanguage));
      } else {
        const browserLang = (navigator.language || navigator.userLanguage || 'en');
        callback(normalizeLanguage(browserLang));
      }
    });
  } else {
    callback(normalizeLanguage(navigator.language || 'en'));
  }
}

/**
 * Stores the user's chosen language preference.
 */
function setStoredLanguage(lang, callback) {
  const norm = normalizeLanguage(lang);
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set({ selectedLanguage: norm }, () => {
      if (callback) callback(norm);
    });
  } else {
    if (callback) callback(norm);
  }
}

/**
 * Retrieves the stored theme preference ('light' | 'dark').
 */
function getStoredTheme(callback) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({ theme: 'light' }, (res) => {
      callback(res.theme || 'light');
    });
  } else {
    callback('light');
  }
}

/**
 * Saves theme preference ('light' | 'dark').
 */
function setStoredTheme(theme, callback) {
  const cleanTheme = theme === 'dark' ? 'dark' : 'light';
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set({ theme: cleanTheme }, () => {
      if (callback) callback(cleanTheme);
    });
  } else {
    if (callback) callback(cleanTheme);
  }
}

/**
 * Applies theme attribute to DOM for instant CSS variable switching.
 */
function applyTheme(theme) {
  const cleanTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', cleanTheme);
  if (document.body) {
    document.body.classList.toggle('theme-dark', cleanTheme === 'dark');
  }
}

/**
 * Scans the current DOM and applies translations to all elements with:
 * - data-i18n: sets textContent
 * - data-i18n-title: sets title attribute
 * - data-i18n-placeholder: sets placeholder attribute
 * - data-i18n-html: sets innerHTML (used sparingly for bolding or badges)
 */
function applyI18n(lang = 'en') {
  const norm = normalizeLanguage(lang);
  document.documentElement.lang = norm === 'zh_CN' ? 'zh-CN' : norm;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key, norm);
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.setAttribute('title', t(key, norm));
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.setAttribute('placeholder', t(key, norm));
    }
  });

  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (key) {
      el.innerHTML = t(key, norm);
    }
  });
}

// Export for module systems or global window object
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SG_I18N,
    t,
    normalizeLanguage,
    getStoredLanguage,
    setStoredLanguage,
    getStoredTheme,
    setStoredTheme,
    applyTheme,
    applyI18n
  };
}
if (typeof window !== 'undefined') {
  window.SG_I18N = SG_I18N;
  window.t = t;
  window.normalizeLanguage = normalizeLanguage;
  window.getStoredLanguage = getStoredLanguage;
  window.setStoredLanguage = setStoredLanguage;
  window.getStoredTheme = getStoredTheme;
  window.setStoredTheme = setStoredTheme;
  window.applyTheme = applyTheme;
  window.applyI18n = applyI18n;
}
