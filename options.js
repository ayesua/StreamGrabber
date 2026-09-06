/**
 * PureShield - Options & Control Center Controller
 * Manages protection toggles, advanced optional shields, interactive info modals,
 * domain whitelists, custom cosmetic filters, activity logs, and backup/restore.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Tab Navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(target)?.classList.add('active');
    });
  });

  // Checkbox Elements
  const toggles = {
    blockPopups: document.getElementById('opt-blockPopups'),
    blockTrackers: document.getElementById('opt-blockTrackers'),
    stripParams: document.getElementById('opt-stripParams'),
    blockFingerprinting: document.getElementById('opt-blockFingerprinting'),
    blockWebRTCLeaks: document.getElementById('opt-blockWebRTCLeaks'),
    dismissCookieBanners: document.getElementById('opt-dismissCookieBanners'),
    defuseAntiAdblock: document.getElementById('opt-defuseAntiAdblock'),
    showToastNotifications: document.getElementById('opt-showToastNotifications'),
    // Advanced Optional Shields
    stripPingAttributes: document.getElementById('opt-stripPingAttributes'),
    trimReferrers: document.getElementById('opt-trimReferrers'),
    unlockRightClick: document.getElementById('opt-unlockRightClick'),
    blockAutoplay: document.getElementById('opt-blockAutoplay')
  };

  // Whitelist Elements
  const inputWhitelist = document.getElementById('input-whitelist');
  const btnAddWhitelist = document.getElementById('btn-add-whitelist');
  const whitelistContainer = document.getElementById('whitelist-container');

  // Cosmetic Rules Element
  const cosmeticContainer = document.getElementById('cosmetic-container');

  // Logs Element
  const logsContainer = document.getElementById('logs-container');
  const btnClearLogs = document.getElementById('btn-clear-logs');

  // Backup & Restore
  const btnExportJson = document.getElementById('btn-export-json');
  const btnImportTrigger = document.getElementById('btn-import-json-trigger');
  const fileImportJson = document.getElementById('file-import-json');
  const btnResetDefaults = document.getElementById('btn-reset-defaults');

  // Info Modal Elements
  const infoModal = document.getElementById('feature-info-modal');
  const infoModalTitle = document.getElementById('info-modal-title');
  const infoModalContent = document.getElementById('info-modal-content');
  const btnCloseInfoModal = document.getElementById('btn-close-info-modal');
  const btnInfoModalOk = document.getElementById('btn-info-modal-ok');

  /* ==========================================================================
     1. DETAILED EXPLANATION DICTIONARY FOR INFO BUTTONS (ℹ️)
     ========================================================================== */
  const FEATURE_DESCRIPTIONS = {
    'popups': {
      title: '🚫 Bloqueador Agresivo de Popups y Popunders',
      whatItDoes: 'Interviene la función `window.open` a nivel de navegador para interceptar ventanas emergentes no solicitadas, clics trampa sintéticos en enlaces ocultos y tácticas de "popunder" que intentan abrir pestañas detrás de tu ventana.',
      benefit: 'Elimina el 100% de la publicidad engañosa, redirecciones automáticas a sitios de apuestas/virus y páginas molestas.',
      compat: 'Las ventanas legítimas que tú abras conscientemente (como iniciar sesión con Google) siguen funcionando normalmente.'
    },
    'trackers': {
      title: '🛡️ Escudo Contra Rastreadores y Telemetría',
      whatItDoes: 'Bloquea solicitudes de red hacia más de 50 servidores de perfilamiento de usuarios, píxeles de seguimiento (Meta, TikTok, Criteo, Google Analytics) y scripts de mapa de calor (Hotjar, Clarity).',
      benefit: 'Impide que las empresas creen un perfil publicitario con tu historial y acelera la carga de las páginas hasta un 40%.',
      compat: 'Recomendado mantener SIEMPRE activo.'
    },
    'url-params': {
      title: '🧹 Limpiador de Parámetros de Rastreo en URLs',
      whatItDoes: 'Elimina automáticamente tokens publicitarios como `utm_source`, `fbclid`, `gclid`, `mc_cid` y `msclkid` de los enlaces cuando navegas.',
      benefit: 'Mantiene tus enlaces limpios, protege tu privacidad al compartir URLs con amigos y evita el rastreo cruzado entre sitios.',
      compat: 'No altera el funcionamiento de las páginas de destino.'
    },
    'fingerprint': {
      title: '🕵️ Máscara Contra Huella Digital (Canvas & Audio)',
      whatItDoes: 'Las empresas usan el procesador gráfico y de audio de tu computadora para generar una "huella única" que te identifica sin cookies. PureShield inyecta una variación minúscula e invisible en las funciones de Canvas 2D y AudioContext.',
      benefit: 'Hace que tu computadora parezca un dispositivo completamente nuevo en cada sitio web, frustrando el rastreo avanzado.',
      compat: 'Totalmente invisible, no afecta cómo se ven las imágenes o juegos.'
    },
    'webrtc': {
      title: '🔒 Protección Contra Fugas de IP por WebRTC',
      whatItDoes: 'WebRTC es una tecnología para videollamadas que puede revelar tu dirección IP pública real incluso si usas una VPN o proxy. Este escudo fuerza a WebRTC a usar solo las interfaces de red públicas seguras.',
      benefit: 'Oculta tu IP local y previene fugas de identidad de red.',
      compat: 'Compatible con Google Meet, Zoom y Discord en el navegador.'
    },
    'cookies': {
      title: '🍪 Auto-Cierre de Banners de Cookies (GDPR/CCPA)',
      whatItDoes: 'Detecta los molestos avisos de consentimiento de cookies (OneTrust, Cookiebot, Didomi, etc.) y los oculta o rechaza automáticamente sin que tengas que darles clic.',
      benefit: 'Navegación limpia sin tener que aceptar cookies invasivas en cada sitio que visitas.',
      compat: 'Restaura el scroll de la página si el banner la bloqueaba.'
    },
    'adblock-defuse': {
      title: '🛠️ Desactivador de Trampas Anti-Adblock',
      whatItDoes: 'Neutraliza los scripts que intentan detectar si estás usando un bloqueador y les entrega respuestas simuladas inofensivas.',
      benefit: 'Evita los mensajes de "Desactiva tu bloqueador para continuar" en páginas de noticias y descargas.',
      compat: 'Recomendado activo.'
    },
    'toasts': {
      title: '💬 Alertas Flotantes de Popups Bloqueados',
      whatItDoes: 'Muestra una pequeña tarjeta en la esquina inferior derecha cuando se neutraliza un popup, dándote la opción de "Permitir una vez" o "Poner en lista blanca".',
      benefit: 'Te da control total y visibilidad de lo que PureShield está bloqueando en tiempo real.',
      compat: 'Puedes desactivarlo si prefieres un bloqueo 100% silencioso.'
    },
    'ping-audit': {
      title: '🔗 Eliminador de Auditoría de Enlaces (<a ping>)',
      whatItDoes: 'Google y Facebook añaden el atributo `ping="https://..."` a los enlaces. Cuando haces clic en un resultado, tu navegador envía silenciosamente un informe a sus servidores avisando exactamente qué enlace tocaste y a qué hora.',
      benefit: 'Elimina ese atributo de todos los enlaces de la web, impidiendo el rastreo de tus clics.',
      compat: 'Opcional. Altamente recomendado para máxima privacidad.'
    },
    'referrer': {
      title: '🌐 Política Estricta de Referrer (Referrer Trimming)',
      whatItDoes: 'Al hacer clic en un enlace de `sitioA.com/articulo/secreto` hacia `sitioB.com`, normalmente el segundo sitio ve la URL completa previa. Esta opción recorta la cabecera para que solo vean `sitioA.com` o nada.',
      benefit: 'Evita que sitios externos conozcan las búsquedas o artículos específicos que estabas leyendo antes de visitarlos.',
      compat: 'Opcional. En muy raras ocasiones algunos sitios de inicio de sesión antiguos requieren ver la URL de origen completa.'
    },
    'unlock-rightclick': {
      title: '🔓 Desbloqueador de Clic Derecho y Selección de Texto',
      whatItDoes: 'Algunas páginas web usan scripts para deshabilitar el clic derecho, bloquear la copia de texto o impedir que uses el menú contextual de tu navegador.',
      benefit: 'Devuelve el control a tu navegador permitiéndote copiar texto, abrir enlaces en nuevas pestañas y usar el menú contextual con libertad.',
      compat: 'Opcional. Actívalo si visitas frecuentemente sitios que bloquean la copia de información.'
    },
    'autoplay': {
      title: '🔇 Escudo Anti-Reproducción Automática de Videos',
      whatItDoes: 'Detiene automáticamente los reproductores de video flotantes que empiezan a reproducirse con sonido o consumir datos sin tu permiso al cargar una página.',
      benefit: 'Ahorra ancho de banda, batería en portátiles y evita ruidos inesperados.',
      compat: 'Opcional. Los videos que tú presiones manualmente ("Play") se reproducirán con normalidad.'
    }
  };

  function showFeatureInfo(key) {
    const info = FEATURE_DESCRIPTIONS[key];
    if (!info) return;

    infoModalTitle.textContent = info.title;
    infoModalContent.innerHTML = `
      <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 4px;">
        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">🔍 ¿Qué hace?</div>
        <div>${info.whatItDoes}</div>
      </div>
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 12px; margin-bottom: 4px;">
        <div style="font-weight: 700; color: var(--accent-emerald); margin-bottom: 4px;">🛡️ Beneficio de Privacidad</div>
        <div>${info.benefit}</div>
      </div>
      <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: var(--radius-md); padding: 12px;">
        <div style="font-weight: 700; color: var(--accent-cyan); margin-bottom: 4px;">⚙️ Compatibilidad</div>
        <div>${info.compat}</div>
      </div>
    `;

    infoModal.classList.add('active');
  }

  // Attach info button listeners
  document.querySelectorAll('.info-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.getAttribute('data-info');
      showFeatureInfo(key);
    });
  });

  const closeInfoModal = () => infoModal.classList.remove('active');
  btnCloseInfoModal?.addEventListener('click', closeInfoModal);
  btnInfoModalOk?.addEventListener('click', closeInfoModal);
  infoModal?.addEventListener('click', (e) => {
    if (e.target === infoModal) closeInfoModal();
  });

  /* ==========================================================================
     2. LOAD SETTINGS & INITIALIZE UI
     ========================================================================== */
  async function loadAllSettings() {
    const data = await chrome.storage.local.get([
      'settings',
      'whitelistedDomains',
      'customCosmeticRules',
      'trackerLogs'
    ]);

    const settings = data.settings || {};

    // Populate toggles
    Object.keys(toggles).forEach(key => {
      if (toggles[key]) {
        toggles[key].checked = settings[key] === true || (settings[key] !== false && !['stripPingAttributes', 'trimReferrers', 'unlockRightClick', 'blockAutoplay'].includes(key));
      }
    });

    // Populate Whitelist
    renderWhitelist(data.whitelistedDomains || []);

    // Populate Custom Cosmetic Rules
    renderCosmeticRules(data.customCosmeticRules || {});

    // Populate Activity Logs
    renderLogs(data.trackerLogs || []);
  }

  /* ==========================================================================
     3. TOGGLE EVENT LISTENERS
     ========================================================================== */
  Object.keys(toggles).forEach(key => {
    const el = toggles[key];
    if (el) {
      el.addEventListener('change', async () => {
        const data = await chrome.storage.local.get(['settings']);
        const updated = data.settings || {};
        updated[key] = el.checked;
        await chrome.storage.local.set({ settings: updated });

        if (key === 'blockWebRTCLeaks') {
          chrome.runtime.sendMessage({ action: 'updateWebRTC', enabled: el.checked });
        }
      });
    }
  });

  /* ==========================================================================
     4. WHITELIST MANAGER
     ========================================================================== */
  function renderWhitelist(list) {
    if (list.length === 0) {
      whitelistContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px;">No whitelisted domains yet.</div>`;
      return;
    }

    whitelistContainer.innerHTML = list.map(domain => `
      <div class="list-item">
        <span>${domain}</span>
        <button class="btn-delete" data-domain="${domain}" title="Remove domain">&times; Remove</button>
      </div>
    `).join('');

    whitelistContainer.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const domain = btn.getAttribute('data-domain');
        await chrome.runtime.sendMessage({ action: 'removeWhitelistedDomain', domain });
        const data = await chrome.storage.local.get(['whitelistedDomains']);
        renderWhitelist(data.whitelistedDomains || []);
      });
    });
  }

  btnAddWhitelist.addEventListener('click', async () => {
    let domain = inputWhitelist.value.trim().toLowerCase();
    if (!domain) return;

    try {
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        domain = new URL(domain).hostname;
      }
    } catch (_) {}

    await chrome.runtime.sendMessage({ action: 'whitelistCurrentDomain', domain });
    inputWhitelist.value = '';
    const data = await chrome.storage.local.get(['whitelistedDomains']);
    renderWhitelist(data.whitelistedDomains || []);
  });

  /* ==========================================================================
     5. CUSTOM COSMETIC RULES MANAGER
     ========================================================================== */
  function renderCosmeticRules(rulesMap) {
    const domains = Object.keys(rulesMap);
    if (domains.length === 0) {
      cosmeticContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px;">No custom hidden elements saved yet.</div>`;
      return;
    }

    let html = '';
    domains.forEach(domain => {
      const selectors = rulesMap[domain] || [];
      selectors.forEach(sel => {
        html += `
          <div class="list-item">
            <div>
              <span style="color: var(--accent-emerald); font-weight: 600;">${domain}</span>
              <span style="color: var(--text-secondary); margin-left: 8px;">${sel}</span>
            </div>
            <button class="btn-delete" data-cosmetic-domain="${domain}" data-cosmetic-sel="${sel}">&times; Remove</button>
          </div>
        `;
      });
    });

    cosmeticContainer.innerHTML = html;

    cosmeticContainer.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const domain = btn.getAttribute('data-cosmetic-domain');
        const selector = btn.getAttribute('data-cosmetic-sel');

        const data = await chrome.storage.local.get(['customCosmeticRules']);
        const customRules = data.customCosmeticRules || {};
        if (customRules[domain]) {
          customRules[domain] = customRules[domain].filter(s => s !== selector);
          if (customRules[domain].length === 0) delete customRules[domain];
        }
        await chrome.storage.local.set({ customCosmeticRules: customRules });
        renderCosmeticRules(customRules);
      });
    });
  }

  /* ==========================================================================
     6. ACTIVITY LOGS
     ========================================================================== */
  function renderLogs(logs) {
    if (logs.length === 0) {
      logsContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px;">No events recorded in this session.</div>`;
      return;
    }

    logsContainer.innerHTML = logs.map(item => {
      const date = new Date(item.timestamp).toLocaleTimeString();
      let displayUrl = item.url || item.domain || 'Resource';
      return `
        <div class="list-item" style="font-size: 12px;">
          <div>
            <span style="color: var(--text-muted); font-size: 11px;">[${date}]</span>
            <span class="tracker-badge" style="margin: 0 6px;">${item.type.toUpperCase()}</span>
            <span style="color: var(--text-primary); font-weight: 500;">${item.domain || ''}</span>
            <span style="color: var(--text-secondary); margin-left: 6px; font-size: 11px;" title="${item.url}">${displayUrl.slice(0, 50)}</span>
          </div>
          <span style="color: var(--accent-cyan); font-size: 11px;">${item.category || ''}</span>
        </div>
      `;
    }).join('');
  }

  btnClearLogs.addEventListener('click', async () => {
    await chrome.storage.local.set({ trackerLogs: [] });
    renderLogs([]);
  });

  /* ==========================================================================
     7. BACKUP & RESTORE
     ========================================================================== */
  btnExportJson.addEventListener('click', async () => {
    const data = await chrome.storage.local.get([
      'settings',
      'whitelistedDomains',
      'customCosmeticRules',
      'donationSettings'
    ]);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pureshield_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  btnImportTrigger.addEventListener('click', () => {
    fileImportJson.click();
  });

  fileImportJson.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (typeof imported === 'object') {
          await chrome.storage.local.set(imported);
          alert('PureShield configuration successfully imported!');
          loadAllSettings();
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  });

  btnResetDefaults.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all PureShield settings to defaults? This will clear custom rules and whitelists.')) {
      await chrome.storage.local.clear();
      chrome.runtime.reload();
    }
  });

  // Copy to Clipboard buttons
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy');
      const text = document.getElementById(targetId)?.textContent;
      if (text) {
        navigator.clipboard.writeText(text);
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#10b981';
        btn.style.color = '#000';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.style.color = '';
        }, 1500);
      }
    });
  });

  // Initial Load
  loadAllSettings();
});
