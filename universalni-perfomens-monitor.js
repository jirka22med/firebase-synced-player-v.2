// --- Univerzální Performance Monitor - KOMPLETNĚ PŘEPRACOVÁNO ---
// Jednoduše přidejte tento kód na začátek jakéhokoli scriptu

(function() {
    'use strict';
    
    // Globální proměnné pro monitoring
    let frameCount = 0;
    let lastLogTime = performance.now();
    let lastIntervalFrameCount = 0;
    let memoryStart = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    // Konfigurace
    const config = {
        logInterval: 5000,    // Výpis každých 5 sekund
        enabled: false,       // Vypnuto při startu
        prefix: '⚡'          // Prefix pro logy
    };
    
    // Hlavní funkce pro měření výkonu
    function getPagePerformance() {
        const now = performance.now();
        const memoryNow = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        // Aktuální paměť v MB
        const currentMemory = Math.round(memoryNow / 1024 / 1024 * 100) / 100;
        
        // FPS za posledních 5 sekund
        const framesSinceLastLog = frameCount - lastIntervalFrameCount;
        const secondsSinceLastLog = (now - lastLogTime) / 1000;
        const currentFPS = secondsSinceLastLog > 0 ? Math.round(framesSinceLastLog / secondsSinceLastLog) : 0;
        
        // Odezva snímku = 1000ms / FPS
        const frameLatency = currentFPS > 0 ? Math.round(1000 / currentFPS) : 999;
        
        // Reset pro další měření
        lastLogTime = now;
        lastIntervalFrameCount = frameCount;
        
        return {
            latency: frameLatency,    // Odezva na snímek v ms
            memory: currentMemory,    // Aktuální paměť v MB
            fps: currentFPS          // FPS za posledních 5 sekund
        };
    }
    
    // Výpis do konzole
    function logPerformance() {
        if (!config.enabled) return;
        
        const perf = getPagePerformance();
        
        // Status podle paměti
        const memoryStatus = perf.memory > 100 ? '🔴' : perf.memory > 50 ? '🟡' : '🟢';
        
        // Status podle odezvy (latence)
        let latencyIcon;
        if (perf.latency > 50) {        // Pod 20 FPS
            latencyIcon = '🐌';
        } else if (perf.latency > 33) { // 20-30 FPS
            latencyIcon = '🟡';
        } else if (perf.latency > 16) { // 30-60 FPS
            latencyIcon = '🟢';
        } else {                        // 60+ FPS
            latencyIcon = '⚡';
        }
        
        console.log(`${config.prefix} ${memoryStatus} ${perf.latency}ms | ${perf.memory}MB | ${perf.fps}fps ${latencyIcon}`);
    }
    
    // Počítání snímků
    function countFrame() {
        frameCount++;
        if (config.enabled) {
            requestAnimationFrame(countFrame);
        }
    }
    
    // Inicializace tlačítka
    function initializeButton() {
        const button = document.getElementById('perf-monitor-btn') || 
                      document.querySelector('.perf-monitor-btn') ||
                      document.querySelector('[data-perf-monitor]');
        
        if (!button) {
            console.warn('⚠️ Tlačítko pro monitoring nenalezeno. Použijte ID "perf-monitor-btn"');
            return;
        }
        
        function updateButtonText() {
            const originalText = button.dataset.originalText || button.textContent;
            button.dataset.originalText = originalText;
            
            if (config.enabled) {
                button.textContent = '⏹️';
                button.style.background = '#e74c3c';
                button.style.color = 'white';
            } else {
                button.textContent = '▶️';
                button.style.background = '#27ae60';
                button.style.color = 'white';
            }
        }
        
        button.onclick = (e) => {
            e.preventDefault();
            config.enabled = !config.enabled;
            updateButtonText();
            
            if (config.enabled) {
                console.log(`${config.prefix} ▶️ Monitor spuštěn`);
                startMonitoring();
            } else {
                console.log(`${config.prefix} ⏹️ Monitor zastaven`);
                stopMonitoring();
            }
        };
        
        updateButtonText();
       // Uložíme referenci pro programové ovládání (až po vytvoření perfMon)
        if (window.perfMon) {
            window.perfMon.button = button;
        }
    }
    
    // Proměnné pro interval
    let monitoringInterval;
    
    // Spuštění monitoringu
    function startMonitoring() {
        // Reset měření
        lastLogTime = performance.now();
        lastIntervalFrameCount = frameCount;
        
        // Spustit počítání snímků
        requestAnimationFrame(countFrame);
        
        // Spustit interval logování
        monitoringInterval = setInterval(logPerformance, config.logInterval);
        
        // První log hned
        setTimeout(logPerformance, 100);
    }
    
    // Zastavení monitoringu
    function stopMonitoring() {
        clearInterval(monitoringInterval);
    }
    
    // Inicializace po načtení
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeButton);
    } else {
        initializeButton();
    }
    
    // Finální stats při zavření
    window.addEventListener('beforeunload', function() {
        if (config.enabled) {
            console.log(`${config.prefix} 📊 Finální měření:`, getPagePerformance());
        }
    });
    
    // Globální API
    window.perfMon = {
        start: () => {
            config.enabled = true;
            startMonitoring();
        },
        stop: () => {
            config.enabled = false;
            stopMonitoring();
        },
        toggle: () => {
            config.enabled = !config.enabled;
            if (config.enabled) {
                startMonitoring();
            } else {
                stopMonitoring();
            }
        },
        get: getPagePerformance,
        log: logPerformance,
        config: config,
        button: null
    };
    
})();

// --- Jak použít ---
// 1. Přidej tlačítko do HTML:
//    <button id="perf-monitor-btn">Monitor</button>
//
// 2. Nebo použij z konzole:
//    perfMon.start()  // Spustí
//    perfMon.stop()   // Zastaví
//    perfMon.get()    // Vrátí aktuální data
//    perfMon.log()    // Jednorazový výpis

// --- Ukázkový výstup ---
// ⚡ 🟢 16ms | 15.2MB | 60fps ⚡  (60 FPS = vynikající)
// ⚡ 🟢 20ms | 18.1MB | 50fps 🟢  (50 FPS = dobré)
// ⚡ 🟡 33ms | 25.1MB | 30fps 🟡  (30 FPS = průměrné)
// ⚡ 🔴 100ms | 67.8MB | 10fps 🐌  (10 FPS = pomalé)

// --- Vysvětlení ikon ---
// Paměť: 🟢 (pod 50MB) | 🟡 (50-100MB) | 🔴 (nad 100MB)
// Odezva: ⚡ (16ms/60fps) | 🟢 (33ms/30fps) | 🟡 (50ms/20fps) | 🐌 (nad 50ms)
