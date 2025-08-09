// =============================================================================
// 🚀 AUTO-FADE MODUL PRO AUDIO PŘEHRÁVAČ - Admirálův upgrade
// =============================================================================
// Autor: Admirál Claude.AI ve spolupráci s více admirálem Jiříkem
// Verze: 1.0
// Popis: Modul pro plynulé přechody mezi skladbami s pokročilým fade efektem
// Zachovává VŠECHNA původní nastavení a definice přehrávače
// =============================================================================

console.log("🖖 Auto-Fade Modul: Inicializace pokročilých přechodů mezi skladbami...");

// --- Globální konfigurace Auto-Fade ---
const AUTOFADE_CONFIG = {
    // Základní nastavení
    enabled: true,                    // Zapnuto/vypnuto
    fadeOutDuration: 3000,           // Doba fade-out v ms (3 sekundy)
    fadeInDuration: 2000,            // Doba fade-in v ms (2 sekundy)
    crossfadeDuration: 1500,         // Doba překrývání skladeb v ms
    triggerBeforeEnd: 5000,          // Kdy před koncem začít fade (5 sekund)
    
    // Pokročilá nastavení
    fadeEasing: 'smooth',            // 'linear', 'smooth', 'exponential'
    preserveVolume: true,            // Zachovat původní hlasitost po fade
    smartTrigger: true,              // Inteligentní spuštění podle délky skladby
    visualFeedback: true,            // Vizuální indikace fade efektu
    
    // Debug a statistiky
    debugMode: false,                // Console logy pro debug
    trackFadeStats: true             // Sledování statistik fade přechodů
};

// --- Globální proměnné pro Auto-Fade ---
let autoFadeEnabled = AUTOFADE_CONFIG.enabled;
let fadeInterval = null;
let fadeTimeoutId = null;
let isFading = false;
let originalVolume = 0.5;
let fadeStats = {
    totalFades: 0,
    successfulFades: 0,
    averageFadeTime: 0
};

// --- Funkce pro uložení/načtení Auto-Fade nastavení ---
function saveAutoFadeSettings() {
    const settings = {
        enabled: autoFadeEnabled,
        fadeOutDuration: AUTOFADE_CONFIG.fadeOutDuration,
        fadeInDuration: AUTOFADE_CONFIG.fadeInDuration,
        crossfadeDuration: AUTOFADE_CONFIG.crossfadeDuration,
        triggerBeforeEnd: AUTOFADE_CONFIG.triggerBeforeEnd,
        fadeEasing: AUTOFADE_CONFIG.fadeEasing,
        preserveVolume: AUTOFADE_CONFIG.preserveVolume,
        smartTrigger: AUTOFADE_CONFIG.smartTrigger,
        visualFeedback: AUTOFADE_CONFIG.visualFeedback,
        stats: fadeStats
    };
    
    localStorage.setItem('autoFadeSettings', JSON.stringify(settings));
    
    // Uložit také do Firebase pokud je dostupné
    if (typeof window.savePlayerSettingsToFirestore === 'function') {
        try {
            window.savePlayerSettingsToFirestore({
                ...settings,
                autoFadeModuleVersion: '1.0'
            }).catch(e => console.warn('Auto-Fade: Nepodařilo se uložit do Firebase:', e));
        } catch (e) {
            console.warn('Auto-Fade: Firebase není dostupné pro ukládání:', e);
        }
    }
    
    if (AUTOFADE_CONFIG.debugMode) {
        console.log('🚀 Auto-Fade: Nastavení uložena:', settings);
    }
}

function loadAutoFadeSettings() {
    try {
        const saved = localStorage.getItem('autoFadeSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            
            // Aplikovat načtená nastavení
            autoFadeEnabled = settings.enabled ?? AUTOFADE_CONFIG.enabled;
            AUTOFADE_CONFIG.fadeOutDuration = settings.fadeOutDuration ?? AUTOFADE_CONFIG.fadeOutDuration;
            AUTOFADE_CONFIG.fadeInDuration = settings.fadeInDuration ?? AUTOFADE_CONFIG.fadeInDuration;
            AUTOFADE_CONFIG.crossfadeDuration = settings.crossfadeDuration ?? AUTOFADE_CONFIG.crossfadeDuration;
            AUTOFADE_CONFIG.triggerBeforeEnd = settings.triggerBeforeEnd ?? AUTOFADE_CONFIG.triggerBeforeEnd;
            AUTOFADE_CONFIG.fadeEasing = settings.fadeEasing ?? AUTOFADE_CONFIG.fadeEasing;
            AUTOFADE_CONFIG.preserveVolume = settings.preserveVolume ?? AUTOFADE_CONFIG.preserveVolume;
            AUTOFADE_CONFIG.smartTrigger = settings.smartTrigger ?? AUTOFADE_CONFIG.smartTrigger;
            AUTOFADE_CONFIG.visualFeedback = settings.visualFeedback ?? AUTOFADE_CONFIG.visualFeedback;
            
            if (settings.stats) {
                fadeStats = { ...fadeStats, ...settings.stats };
            }
            
            if (AUTOFADE_CONFIG.debugMode) {
                console.log('🚀 Auto-Fade: Nastavení načtena:', settings);
            }
        }
    } catch (e) {
        console.error('Auto-Fade: Chyba při načítání nastavení:', e);
    }
}

// --- Easing funkce pro různé typy fade efektů ---
function getFadeEasing(progress) {
    switch (AUTOFADE_CONFIG.fadeEasing) {
        case 'linear':
            return progress;
        case 'exponential':
            return Math.pow(progress, 2);
        case 'smooth':
        default:
            // Smooth cubic ease-in-out
            return progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    }
}

// --- Hlavní fade funkce ---
function startFadeOut(callback) {
    if (isFading || !audioPlayer) {
        if (AUTOFADE_CONFIG.debugMode) {
            console.log('🚀 Auto-Fade: Fade již probíhá nebo chybí audioPlayer');
        }
        return;
    }
    
    isFading = true;
    originalVolume = audioPlayer.volume;
    const startTime = Date.now();
    const startVolume = originalVolume;
    
    if (AUTOFADE_CONFIG.visualFeedback) {
        showFadeIndicator('out');
    }
    
    if (AUTOFADE_CONFIG.debugMode) {
        console.log(`🚀 Auto-Fade: Spouštím fade-out z hlasitosti ${startVolume}`);
    }
    
    function fadeStep() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / AUTOFADE_CONFIG.fadeOutDuration, 1);
        const easedProgress = getFadeEasing(progress);
        
        const newVolume = startVolume * (1 - easedProgress);
        audioPlayer.volume = Math.max(0, newVolume);
        
        // Aktualizace vizuálního progress baru
        updateFadeProgress(progress, 'out');
        
        if (progress >= 1) {
            // Fade-out dokončen
            clearInterval(fadeInterval);
            fadeInterval = null;
            
            fadeStats.totalFades++;
            const fadeTime = Date.now() - startTime;
            fadeStats.averageFadeTime = (fadeStats.averageFadeTime + fadeTime) / 2;
            
            if (AUTOFADE_CONFIG.debugMode) {
                console.log(`🚀 Auto-Fade: Fade-out dokončen za ${fadeTime}ms`);
            }
            
            // Spustit callback (přehrání další skladby)
            if (typeof callback === 'function') {
                callback();
            }
            
            // Spustit fade-in
            setTimeout(() => startFadeIn(), 100);
            
        } else {
            // Pokračovat ve fade-out
            fadeInterval = setTimeout(fadeStep, 16); // ~60fps
        }
    }
    
    fadeStep();
}

function startFadeIn() {
    if (!audioPlayer) return;
    
    const startTime = Date.now();
    const targetVolume = AUTOFADE_CONFIG.preserveVolume ? originalVolume : 0.5;
    
    if (AUTOFADE_CONFIG.visualFeedback) {
        showFadeIndicator('in');
    }
    
    if (AUTOFADE_CONFIG.debugMode) {
        console.log(`🚀 Auto-Fade: Spouštím fade-in na hlasitost ${targetVolume}`);
    }
    
    function fadeStep() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / AUTOFADE_CONFIG.fadeInDuration, 1);
        const easedProgress = getFadeEasing(progress);
        
        audioPlayer.volume = targetVolume * easedProgress;
        
        // Aktualizace vizuálního progress baru
        updateFadeProgress(progress, 'in');
        
        if (progress >= 1) {
            // Fade-in dokončen
            clearInterval(fadeInterval);
            fadeInterval = null;
            isFading = false;
            
            fadeStats.successfulFades++;
            
            if (AUTOFADE_CONFIG.debugMode) {
                console.log(`🚀 Auto-Fade: Fade-in dokončen za ${Date.now() - startTime}ms`);
            }
            
            // Skrýt indikátor s malým zpožděním pro lepší UX
            setTimeout(() => {
                if (AUTOFADE_CONFIG.visualFeedback) {
                    hideFadeIndicator();
                }
            }, 500);
            
            // Uložit statistiky
            if (AUTOFADE_CONFIG.trackFadeStats) {
                saveAutoFadeSettings();
            }
            
        } else {
            // Pokračovat ve fade-in
            fadeInterval = setTimeout(fadeStep, 16); // ~60fps
        }
    }
    
    fadeStep();
}

// --- Pokročilý vizuální indikátor fade efektu ---
function showFadeIndicator(type) {
    if (!AUTOFADE_CONFIG.visualFeedback) return;
    
    let indicator = document.getElementById('fade-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'fade-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-10px);
            background: linear-gradient(135deg, #1a237e, #3949ab, #00bcd4);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-family: 'Orbitron', 'Arial', monospace;
            font-size: 14px;
            font-weight: bold;
            z-index: 10001;
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 
                0 8px 32px rgba(0, 188, 212, 0.4),
                0 0 20px rgba(57, 73, 171, 0.6),
                inset 0 1px 0 rgba(255, 255, 255, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 200px;
            justify-content: center;
        `;
        document.body.appendChild(indicator);
    }
    
    // Pokročilý obsah indikátoru s progress barem
    const fadeText = type === 'out' ? 'Fade Out' : 'Fade In';
    const fadeIcon = type === 'out' ? '📉' : '📈';
    const fadeColor = type === 'out' ? '#ff6b6b' : '#4ecdc4';
    
    indicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">${fadeIcon}</span>
            <span>${fadeText}</span>
        </div>
        <div id="fade-progress-container" style="
            width: 80px; 
            height: 4px; 
            background: rgba(255,255,255,0.2); 
            border-radius: 2px;
            overflow: hidden;
        ">
            <div id="fade-progress-bar" style="
                height: 100%; 
                background: ${fadeColor};
                width: 0%; 
                transition: width 0.1s ease;
                border-radius: 2px;
                box-shadow: 0 0 10px ${fadeColor}50;
            "></div>
        </div>
    `;
    
    // Aktualizace stylu podle typu
    indicator.style.background = type === 'out' ? 
        'linear-gradient(135deg, #d32f2f, #f44336, #ff5722)' : 
        'linear-gradient(135deg, #00796b, #009688, #4db6ac)';
    
    indicator.style.opacity = '1';
    indicator.style.transform = 'translateX(-50%) translateY(0)';
}

function hideFadeIndicator() {
    const indicator = document.getElementById('fade-indicator');
    if (indicator) {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 400);
    }
}

function updateFadeProgress(progress, type) {
    const progressBar = document.getElementById('fade-progress-bar');
    if (!progressBar) {
        console.warn('🚀 Auto-Fade: Progress bar nenalezen');
        return;
    }
    const percentage = Math.min(100, Math.max(0, progress * 100));
    progressBar.style.width = `${percentage}%`;

    if (percentage >= 100) {
        progressBar.style.animation = 'fadeProgressComplete 0.3s ease';
    }

    const indicator = document.getElementById('fade-indicator');
    if (indicator && indicator.querySelector('span:last-child')) {
        const fadeText = type === 'out' ? 'Fade Out' : 'Fade In';
        indicator.querySelector('span:last-child').textContent = `${fadeText} (${Math.round(percentage)}%)`;
    }
}

// --- Inteligentní detekce kdy spustit fade ---
function shouldTriggerFade(currentTime, duration) {
    if (!AUTOFADE_CONFIG.smartTrigger) {
        return (duration - currentTime) <= (AUTOFADE_CONFIG.triggerBeforeEnd / 1000);
    }
    
    // Inteligentní logika podle délky skladby
    let triggerTime = AUTOFADE_CONFIG.triggerBeforeEnd / 1000;
    
    if (duration < 60) {
        // Krátké skladby - fade dříve
        triggerTime = Math.min(triggerTime, duration * 0.15);
    } else if (duration > 300) {
        // Dlouhé skladby - můžeme čekat déle
        triggerTime = Math.max(triggerTime, 8);
    }
    
    return (duration - currentTime) <= triggerTime;
}

// --- Integrace s původním přehrávačem ---
function integrateAutoFadeWithPlayer() {
    if (!audioPlayer) {
        console.warn('🚀 Auto-Fade: audioPlayer není dostupný, integrace odložena');
        return;
    }
    
    // Backup původní timeupdate listener
    const originalTimeUpdate = audioPlayer.ontimeupdate;
    
    // Přidat náš timeupdate listener
    audioPlayer.addEventListener('timeupdate', function() {
        if (!autoFadeEnabled || isFading || audioPlayer.loop) return;
        
        const currentTime = audioPlayer.currentTime;
        const duration = audioPlayer.duration;
        
        if (duration && shouldTriggerFade(currentTime, duration)) {
            if (AUTOFADE_CONFIG.debugMode) {
                console.log(`🚀 Auto-Fade: Triggering fade at ${currentTime}s / ${duration}s`);
            }
            
            // Vymazat timeout pokud existuje
            if (fadeTimeoutId) {
                clearTimeout(fadeTimeoutId);
                fadeTimeoutId = null;
            }
            
            // Spustit fade a přejít na další skladbu
            startFadeOut(() => {
                // Zde využijeme původní funkci pro přehrání další skladby
                if (typeof playNextTrack === 'function') {
                    playNextTrack();
                } else {
                    console.warn('🚀 Auto-Fade: Funkce playNextTrack není dostupná');
                }
            });
        }
    });
    
    console.log('🚀 Auto-Fade: Integrace s přehrávačem dokončena');
}

// --- UI pro ovládání Auto-Fade ---
function createAutoFadeUI() {
    const controlPanel = document.getElementById('control-panel');
    if (!controlPanel) {
        console.warn('🚀 Auto-Fade: Control panel nenalezen, UI nebude vytvořeno');
        return;
    }
    
    // Vytvoření tlačítka pro auto-fade
    const fadeButton = document.createElement('button');
    fadeButton.id = 'auto-fade-button';
    fadeButton.className = 'control-button';
    fadeButton.title = 'Auto-fade mezi skladbami (F)';
    fadeButton.innerHTML = '🔄';
    fadeButton.classList.toggle('active', autoFadeEnabled);
    
    // Event listener pro tlačítko
    fadeButton.addEventListener('click', async () => {
        autoFadeEnabled = !autoFadeEnabled;
        fadeButton.classList.toggle('active', autoFadeEnabled);
        fadeButton.title = autoFadeEnabled ? 
            'Auto-fade zapnut - plynulé přechody (F)' : 
            'Auto-fade vypnut (F)';
        
        // Zobrazit notifikaci
        if (typeof window.showNotification === 'function') {
            window.showNotification(
                `Auto-fade ${autoFadeEnabled ? 'zapnut' : 'vypnut'}! ${autoFadeEnabled ? '🎵✨' : '⏸️'}`, 
                'info'
            );
        }
        
        // Uložit nastavení
        saveAutoFadeSettings();
        
        if (AUTOFADE_CONFIG.debugMode) {
            console.log(`🚀 Auto-Fade: ${autoFadeEnabled ? 'Zapnuto' : 'Vypnuto'}`);
        }
    });
    
    // Přidat tlačítko do control panelu
    const controlsDiv = controlPanel.querySelector('.controls');
    if (controlsDiv) {
        controlsDiv.appendChild(fadeButton);
        console.log('🚀 Auto-Fade: UI tlačítko vytvořeno a přidáno');
    }
    
    // Přidat klávesovou zkratku 'F' pro auto-fade
    document.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        
        if (e.code === 'KeyF' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            fadeButton.click();
            
            if (AUTOFADE_CONFIG.debugMode) {
                console.log('🚀 Auto-Fade: Aktivováno klávesou F');
            }
        }
    });
}

// --- Statistiky a debug funkce ---
window.getAutoFadeStats = function() {
    return {
        ...fadeStats,
        enabled: autoFadeEnabled,
        config: AUTOFADE_CONFIG,
        successRate: fadeStats.totalFades > 0 ? 
            (fadeStats.successfulFades / fadeStats.totalFades * 100).toFixed(2) + '%' : '0%'
    };
};

window.resetAutoFadeStats = function() {
    fadeStats = {
        totalFades: 0,
        successfulFades: 0,
        averageFadeTime: 0
    };
    saveAutoFadeSettings();
    console.log('🚀 Auto-Fade: Statistiky resetovány');
};

// --- Manuální ovládání Auto-Fade (pro pokročilé uživatele) ---
function injectFadeIndicatorStyles() {
    const styleId = 'fade-indicator-styles';
    
    if (document.getElementById(styleId)) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        @keyframes fadeProgressComplete {
            0% { transform: scaleX(1); }
            50% { transform: scaleX(1.1); }
            100% { transform: scaleX(1); }
        }
        
        @keyframes fadeIndicatorPulse {
            0%, 100% { 
                box-shadow: 
                    0 8px 32px rgba(0, 188, 212, 0.4),
                    0 0 20px rgba(57, 73, 171, 0.6),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
            }
            50% { 
                box-shadow: 
                    0 12px 40px rgba(0, 188, 212, 0.6),
                    0 0 30px rgba(57, 73, 171, 0.8),
                    inset 0 1px 0 rgba(255, 255, 255, 0.4);
            }
        }
        
        #fade-indicator {
            animation: fadeIndicatorPulse 2s ease-in-out infinite;
        }
        
        /* Responzivní design pro indikátor */
        @media (max-width: 768px) {
            #fade-indicator {
                top: 10px !important;
                left: 50% !important;
                transform: translateX(-50%) translateY(0) !important;
                font-size: 12px !important;
                padding: 8px 16px !important;
                min-width: 160px !important;
            }
            
            #fade-progress-container {
                width: 60px !important;
            }
        }
        
        @media (max-width: 480px) {
            #fade-indicator {
                font-size: 11px !important;
                padding: 6px 12px !important;
                min-width: 140px !important;
            }
            
            #fade-progress-container {
                width: 50px !important;
                height: 3px !important;
            }
        }
    `;
    
    document.head.appendChild(style);
    console.log("🚀 Auto-Fade: CSS styly pro vizuální indikátor byly přidány");
}
window.triggerManualFade = function() {
    if (!autoFadeEnabled) {
        console.warn('🚀 Auto-Fade: Není zapnutý, nelze spustit manuální fade');
        return false;
    }
    
    if (isFading) {
        console.warn('🚀 Auto-Fade: Fade již probíhá');
        return false;
    }
    
    console.log('🚀 Auto-Fade: Manuální spuštění fade efektu');
    startFadeOut(() => {
        if (typeof playNextTrack === 'function') {
            playNextTrack();
        }
    });
    
    return true;
};

// --- Konfigurace pro pokročilé uživatele ---
window.configureAutoFade = function(newConfig) {
    Object.assign(AUTOFADE_CONFIG, newConfig);
    saveAutoFadeSettings();
    console.log('🚀 Auto-Fade: Konfigurace aktualizována:', newConfig);
};

// --- Inicializace modulu ---
function initAutoFadeModule() {
    console.log('🚀 Auto-Fade: Spouštím inicializaci modulu...');
    
    // Načíst uložená nastavení
    loadAutoFadeSettings();
    
    // Vložit CSS styly pro vizuální indikátor
    injectFadeIndicatorStyles();
    
    // Čekat na DOM a původní přehrávač
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                integrateAutoFadeWithPlayer();
                createAutoFadeUI();
                console.log('🚀 Auto-Fade: Modul plně inicializován a připraven k použití!');
            }, 1000); // Dát čas původnímu přehrávači na inicializaci
        });
    } else {
        setTimeout(() => {
            integrateAutoFadeWithPlayer();
            createAutoFadeUI();
            console.log('🚀 Auto-Fade: Modul plně inicializován a připraven k použití!');
        }, 1000);
    }
}

// --- Vyčištění při ukončení ---
window.addEventListener('beforeunload', () => {
    if (fadeInterval) {
        clearInterval(fadeInterval);
    }
    if (fadeTimeoutId) {
        clearTimeout(fadeTimeoutId);
    }
});

// --- Spuštění inicializace ---
initAutoFadeModule();

// =============================================================================
// 🖖 Konec Auto-Fade modulu
// Připraven k nasazení ve flotile více admirála Jiříka!
// =============================================================================