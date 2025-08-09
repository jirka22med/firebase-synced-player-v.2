(function() {
    // Globální flag pro zajištění jednorázové inicializace
    if (window.enhancedConsoleLoggerInitialized) {
        return;
    }
    window.enhancedConsoleLoggerInitialized = true;

    // Spustit ihned bez čekání na DOMContentLoaded
    const initializeLogger = () => {
        // Kompletní záloha všech původních konzolových metod
        const originalConsole = {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            info: console.info.bind(console),
            debug: console.debug.bind(console),
            trace: console.trace.bind(console),
            table: console.table.bind(console),
            group: console.group.bind(console),
            groupEnd: console.groupEnd.bind(console),
            time: console.time.bind(console),
            timeEnd: console.timeEnd.bind(console),
            assert: console.assert.bind(console),
            clear: console.clear.bind(console),
            count: console.count.bind(console),
            countReset: console.countReset.bind(console),
            dir: console.dir.bind(console),
            dirxml: console.dirxml.bind(console)
        };

        // Pole pro ukládání záznamů
        const logEntries = [];
        const maxLogEntries = 3000;

        /**
         * Vylepšená detekce a kategorizace logů
         */
        function detectLogCategory(message, type) {
            const msgStr = String(message).toLowerCase();
            
            // Detekce inicializačních proměnných
            if (msgStr.includes('počáteční stav') || 
                msgStr.includes('konstanta') ||
                msgStr.includes('počáteční hodnota') ||
                msgStr.includes('inicializace') ||
                msgStr.includes('init:') ||
                msgStr.includes('setup:')) {
                return { category: 'INIT_VAR', isSpecial: true };
            }
            
            // Detekce stylovaných logů (%c)
            if (msgStr.includes('%c')) {
                return { category: 'STYLED', isSpecial: true };
            }
            
            // Detekce API volání
            if (msgStr.includes('api') || msgStr.includes('fetch') || msgStr.includes('request')) {
                return { category: 'API', isSpecial: false };
            }
            
            // Detekce událostí
            if (msgStr.includes('event') || msgStr.includes('click') || msgStr.includes('change')) {
                return { category: 'EVENT', isSpecial: false };
            }
            
            // Detekce chyb a varování
            if (type === 'error' || msgStr.includes('chyba') || msgStr.includes('error')) {
                return { category: 'ERROR', isSpecial: true };
            }
            
            if (type === 'warn' || msgStr.includes('warning') || msgStr.includes('varování')) {
                return { category: 'WARN', isSpecial: true };
            }
            
            // Detekce debug informací
            if (msgStr.includes('debug') || msgStr.includes('trace') || msgStr.includes('🔍')) {
                return { category: 'DEBUG', isSpecial: false };
            }
            
            return { category: type.toUpperCase(), isSpecial: false };
        }

        /**
         * Univerzální funkce pro přidání záznamu
         */
        function addLogEntry(type, args) {
            const timestamp = new Date();
            
            // Zpracování argumentů - lepší handling objektů a polí
            const processedArgs = args.map(arg => {
                if (arg === null) return 'null';
                if (arg === undefined) return 'undefined';
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return '[Circular Object]';
                    }
                }
                return String(arg);
            });
            
            const message = processedArgs.join(' ');
            const detection = detectLogCategory(message, type);
            
            logEntries.push({
                timestamp: timestamp,
                type: detection.category,
                originalType: type,
                message: message,
                args: processedArgs,
                isSpecial: detection.isSpecial
            });

            // Omezení počtu záznamů
            if (logEntries.length > maxLogEntries) {
                logEntries.shift();
            }

            // Aktualizace zobrazení pokud je modal otevřený
            if (window.jirikLoggerModal && window.jirikLoggerModal.classList.contains('jirik-visible')) {
                updateLogDisplay();
            }
        }

        // Kompletní přepis všech console metod
        console.log = function(...args) {
            originalConsole.log(...args);
            addLogEntry('log', args);
        };

        console.warn = function(...args) {
            originalConsole.warn(...args);
            addLogEntry('warn', args);
        };

        console.error = function(...args) {
            originalConsole.error(...args);
            addLogEntry('error', args);
        };

        console.info = function(...args) {
            originalConsole.info(...args);
            addLogEntry('info', args);
        };

        console.debug = function(...args) {
            originalConsole.debug(...args);
            addLogEntry('debug', args);
        };

        console.trace = function(...args) {
            originalConsole.trace(...args);
            addLogEntry('trace', args);
        };

        console.table = function(...args) {
            originalConsole.table(...args);
            addLogEntry('table', args);
        };

        console.group = function(...args) {
            originalConsole.group(...args);
            addLogEntry('group', args);
        };

        console.groupEnd = function(...args) {
            originalConsole.groupEnd(...args);
            addLogEntry('groupEnd', args);
        };

        console.time = function(...args) {
            originalConsole.time(...args);
            addLogEntry('time', args);
        };

        console.timeEnd = function(...args) {
            originalConsole.timeEnd(...args);
            addLogEntry('timeEnd', args);
        };

        console.assert = function(...args) {
            originalConsole.assert(...args);
            if (!args[0]) { // Pokud je assertion falsy
                addLogEntry('assert', args.slice(1));
            }
        };

        console.clear = function(...args) {
            originalConsole.clear(...args);
            addLogEntry('clear', ['Console cleared']);
        };

        console.count = function(...args) {
            originalConsole.count(...args);
            addLogEntry('count', args);
        };

        console.countReset = function(...args) {
            originalConsole.countReset(...args);
            addLogEntry('countReset', args);
        };

        console.dir = function(...args) {
            originalConsole.dir(...args);
            addLogEntry('dir', args);
        };

        console.dirxml = function(...args) {
            originalConsole.dirxml(...args);
            addLogEntry('dirxml', args);
        };

        // Zjednodušené CSS s zachováním tvých nastavení tabulky
        const jirikModalCSS = `
            .jirik-modal-overlay {
                position: fixed !important;
                z-index: 999999 !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-color: rgba(0,0,0,0.8) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                opacity: 0 !important;
                visibility: hidden !important;
                transition: opacity 0.3s ease !important;
                backdrop-filter: blur(5px) !important;
            }

            .jirik-modal-overlay.jirik-visible {
                opacity: 1 !important;
                visibility: visible !important;
            }

            .jirik-modal-content {
                background-color: #2a2a2a !important;
                padding: 25px !important;
                border-radius: 8px !important;
                width: 90% !important;
                max-width: 1200px !important;
                max-height: 90vh !important;
                color: #e0e0e0 !important;
                display: flex !important;
                flex-direction: column !important;
                position: relative !important;
                overflow: hidden !important;
            }

            .jirik-close-button {
                position: absolute !important;
                right: 20px !important;
                top: 10px !important;
                font-size: 28px !important;
                color: #aaa !important;
                cursor: pointer !important;
                transition: color 0.2s !important;
            }

            .jirik-close-button:hover {
                color: #fff !important;
            }

            .jirik-modal-content h5 {
                color: #00ffff !important;
                text-align: center !important;
                margin: 0 0 20px 0 !important;
                font-size: 1.5em !important;
            }

            .jirik-log-controls {
                display: flex !important;
                gap: 15px !important;
                margin-bottom: 20px !important;
                justify-content: center !important;
                flex-wrap: wrap !important;
            }

            .jirik-button {
                padding: 10px 20px !important;
                border: none !important;
                border-radius: 5px !important;
                cursor: pointer !important;
                color: white !important;
                transition: background-color 0.2s !important;
            }

            .jirik-btn-danger {
                background-color: #dc3545 !important;
            }

            .jirik-btn-danger:hover {
                background-color: #c82333 !important;
            }

            .jirik-btn-secondary {
                background-color: #6c757d !important;
            }

            .jirik-btn-secondary:hover {
                background-color: #5a6268 !important;
            }

            .jirik-btn-success {
                background-color: #28a745 !important;
            }

            .jirik-btn-success:hover {
                background-color: #218838 !important;
            }

            .jirik-log-stats {
                display: flex !important;
                align-items: center !important;
                color: #bbb !important;
                white-space: nowrap !important;
            }

            .jirik-log-table-container {
                flex-grow: 1 !important;
                overflow-y: auto !important;
                background-color: #1a1a1a !important;
                border-radius: 5px !important;
                padding: 10px !important;
            }

            #jirik-log-table {
                width: 100% !important;
                border-collapse: collapse !important;
                color: #f0f0f0 !important;
                font-size: 0.9em !important;
            }

            #jirik-log-table th,
            #jirik-log-table td {
                border: 1px solid #333 !important;
                padding: 8px !important;
                text-align: left !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                max-width: 300px !important;
            }

            #jirik-log-table th {
                background-color: #3a3a3a !important;
                color: #00ffff !important;
                position: sticky !important;
                top: 0 !important;
                font-weight: bold !important;
            }

            #jirik-log-table tbody tr:nth-child(even) {
                background-color: #222 !important;
            }

            #jirik-log-table tbody tr:hover {
                background-color: #333 !important;
            }

            /* Barevné kategorie logů */
            .log-type-log-text { color: #87ceeb !important; }
            .log-type-warn-text { color: #ffcc00 !important; }
            .log-type-error-text { color: #ff6347 !important; }
            .log-type-info-text { color: #98fb98 !important; }
            .log-type-debug-text { color: #dda0dd !important; }
            .log-type-init_var-text { color: #ff69b4 !important; font-weight: bold !important; }
            .log-type-styled-text { color: #00ff7f !important; font-weight: bold !important; }
            .log-type-api-text { color: #ffa500 !important; }
            .log-type-event-text { color: #20b2aa !important; }
            .log-type-trace-text { color: #ff4500 !important; }
            .log-type-table-text { color: #4682b4 !important; }
            .log-type-group-text { color: #9370db !important; }
            .log-type-time-text { color: #32cd32 !important; }
            .log-type-assert-text { color: #dc143c !important; font-weight: bold !important; }

            .jirik-copy-log-btn {
                background: #555 !important;
                color: white !important;
                border: none !important;
                padding: 5px 10px !important;
                border-radius: 3px !important;
                cursor: pointer !important;
                font-size: 0.8em !important;
                transition: background-color 0.2s !important;
            }

            .jirik-copy-log-btn:hover {
                background: #777 !important;
            }

            .special-log-row {
                background-color: rgba(255, 105, 180, 0.05) !important;
                border-left: 3px solid #ff69b4 !important;
            }

            .special-log-row:nth-child(even) {
                background-color: rgba(255, 105, 180, 0.1) !important;
            }
        `;

        // HTML struktura modalu
        const jirikModalHTML = `
            <div id="jirik-modal" class="jirik-modal-overlay">
                <div class="jirik-modal-content">
                    <span class="jirik-close-button" id="jirik-close-button">&times;</span>
                    <h5>📋 Enhanced Console Logger</h5>
                    <div class="jirik-log-controls">
                        <button id="jirik-clear-button" class="jirik-button jirik-btn-danger">🗑️ Vyčistit</button>
                        <button id="jirik-export-button" class="jirik-button jirik-btn-secondary">📥 Export HTML</button>
                        <button id="jirik-filter-button" class="jirik-button jirik-btn-success">🔍 Filtr</button>
                        <div class="jirik-log-stats">
                            <span id="jirik-log-count">Záznamy: 0</span>
                        </div>
                    </div>
                    <div class="jirik-log-table-container">
                        <table id="jirik-log-table">
                            <thead>
                                <tr>
                                    <th style="width: 120px;">Čas</th>
                                    <th style="width: 100px;">Typ</th>
                                    <th style="width: auto;">Zpráva</th>
                                    <th style="width: 80px;">Akce</th>
                                </tr>
                            </thead>
                            <tbody id="jirik-table-body">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>                                                              
        `;

        // Inicializace po načtení DOM
        const setupModal = () => {
            // Vložení CSS
            if (!document.getElementById('jirik-logger-styles')) {
                const styleElement = document.createElement('style');
                styleElement.id = 'jirik-logger-styles';
                styleElement.textContent = jirikModalCSS;
                document.head.appendChild(styleElement);
            }

            // Vložení HTML
            if (!document.getElementById('jirik-modal')) {
                document.body.insertAdjacentHTML('beforeend', jirikModalHTML);
            }

            // Globální reference na modal
            window.jirikLoggerModal = document.getElementById('jirik-modal');
            const jirikModal = window.jirikLoggerModal;
            const closeBtn = document.getElementById('jirik-close-button');
            const clearBtn = document.getElementById('jirik-clear-button');
            const exportBtn = document.getElementById('jirik-export-button');
            const filterBtn = document.getElementById('jirik-filter-button');
            const tableBody = document.getElementById('jirik-table-body');
            const logCount = document.getElementById('jirik-log-count');

            // Aktualizace zobrazení
            window.updateLogDisplay = function() {
                if (!tableBody) return;
                
                tableBody.innerHTML = '';
                
                logEntries.forEach((entry, index) => {
                    const row = tableBody.insertRow();
                    row.title = entry.message;
                    
                    if (entry.isSpecial) {
                        row.classList.add('special-log-row');
                    }

                    // Čas
                    const timeCell = row.insertCell();
                    timeCell.textContent = entry.timestamp.toLocaleString('cs-CZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });

                    // Typ
                    const typeCell = row.insertCell();
                    typeCell.classList.add(`log-type-${entry.type.toLowerCase()}-text`);
                    typeCell.textContent = entry.type;

                    // Zpráva
                    const messageCell = row.insertCell();
                    messageCell.textContent = entry.message;

                    // Akce
                    const actionCell = row.insertCell();
                    const copyBtn = document.createElement('button');
                    copyBtn.textContent = '📋';
                    copyBtn.classList.add('jirik-copy-log-btn');
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(entry.message).then(() => {
                            originalConsole.info('✅ Zpráva zkopírována!');
                        });
                    };
                    actionCell.appendChild(copyBtn);
                });
                
                if (logCount) {
                    logCount.textContent = `Záznamy: ${logEntries.length}`;
                }
                
                // Auto-scroll
                const container = document.querySelector('.jirik-log-table-container');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            };

            // Event listeners
            closeBtn?.addEventListener('click', () => {
                jirikModal.classList.remove('jirik-visible');
            });

            jirikModal?.addEventListener('click', (e) => {
                if (e.target === jirikModal) {
                    jirikModal.classList.remove('jirik-visible');
                }
            });

            clearBtn?.addEventListener('click', () => {
                if (confirm("Opravdu chcete vyčistit všechny záznamy?")) {
                    logEntries.length = 0;
                    updateLogDisplay();
                    originalConsole.log('✅ Log vyčištěn!');
                }
            });
// Přidej tuhle část do setupModal() funkce, za ostatní event listenery:

// Filtr funkcionalita
let currentFilter = 'all'; // 'all', 'special', 'errors', 'init'

filterBtn?.addEventListener('click', () => {
    // Cycle through filter options
    const filters = ['all', 'special', 'errors', 'init'];
    const currentIndex = filters.indexOf(currentFilter);
    const nextIndex = (currentIndex + 1) % filters.length;
    currentFilter = filters[nextIndex];
    
    // Update button text to show current filter
    const filterLabels = {
        'all': '🔍 Vše',
        'special': '⭐ Speciální',
        'errors': '❌ Chyby',
        'init': '🚀 Init'
    };
    
    filterBtn.textContent = filterLabels[currentFilter];
    
    // Apply filter
    updateLogDisplay();
    
    originalConsole.log(`🔍 Filtr změněn na: ${currentFilter}`);
});

// Modify updateLogDisplay function to respect filter:
window.updateLogDisplay = function() {
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Filter logic
    const filteredEntries = logEntries.filter(entry => {
        switch(currentFilter) {
            case 'special':
                return entry.isSpecial;
            case 'errors':
                return entry.type === 'ERROR' || entry.type === 'WARN';
            case 'init':
                return entry.type === 'INIT_VAR';
            case 'all':
            default:
                return true;
        }
    });
    
    filteredEntries.forEach((entry, index) => {
        const row = tableBody.insertRow();
        row.title = entry.message;
        
        if (entry.isSpecial) {
            row.classList.add('special-log-row');
        }

        // Čas
        const timeCell = row.insertCell();
        timeCell.textContent = entry.timestamp.toLocaleString('cs-CZ', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // Typ
        const typeCell = row.insertCell();
        typeCell.classList.add(`log-type-${entry.type.toLowerCase()}-text`);
        typeCell.textContent = entry.type;

        // Zpráva
        const messageCell = row.insertCell();
        messageCell.textContent = entry.message;

        // Akce
        const actionCell = row.insertCell();
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋';
        copyBtn.classList.add('jirik-copy-log-btn');
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(entry.message).then(() => {
                originalConsole.info('✅ Zpráva zkopírována!');
            });
        };
        actionCell.appendChild(copyBtn);
    });
    
    if (logCount) {
        const total = logEntries.length;
        const filtered = filteredEntries.length;
        logCount.textContent = `Záznamy: ${filtered}/${total}`;
    }
    
    // Auto-scroll
    const container = document.querySelector('.jirik-log-table-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
};
            exportBtn?.addEventListener('click', () => {
                const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
                const filename = `console-log-${timestamp}.html`;

                const htmlContent = ` <!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <title>Console Log Export - ${new Date().toLocaleString('cs-CZ')}</title>
    <style>
        body { font-family: Arial, sans-serif; background: #1a1a1a; color: #f0f0f0; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #444; padding: 8px; text-align: left; }
        th { background-color: #3a3a3a; color: #00ffff; }
        tr:nth-child(even) { background-color: #222; }
        .special-log {
            background-color: rgba(255, 105, 180, 0.1);
            border-left: 3px solid #ff69b4;
         white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 10px !important;
        
        
        }
        .timestamp { 
            font-size: 0.9em; color: #aaa; 
          white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 90px !important;
        
        }
        .message-column { /* Tato třída je nová, aby se aplikovaly tvé styly */
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 600px !important;
        }
    </style>
</head>
<body>
    <h1>📋 Console Log Export</h1>
    <p>Exportováno: ${new Date().toLocaleString('cs-CZ')}</p>
    <p>Celkem záznamů: ${logEntries.length}</p>
    <table>
        <thead><tr><th>Čas</th><th>Typ</th><th>Zpráva</th></tr></thead>
        <tbody>
        ${logEntries.map(entry => `
            <tr${entry.isSpecial ? ' class="special-log"' : ''}>
                <td class="timestamp">${entry.timestamp.toLocaleString('cs-CZ')}</td>
                <td>${entry.type}</td>
                <td class="message-column">${entry.message}</td> </tr>
        `).join('')}
        </tbody>
    </table>
</body>
</html>`;

                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                originalConsole.log('✅ Log exportován:', filename);
            });

            // Setup tlačítka pro otevření
            setupOpenButton();
        };

        // Funkce pro vytvoření tlačítka
        const setupOpenButton = () => {
            const dataManagementContainer = document.querySelector('.function-setupDataManagement .data-management-container');
            
            if (dataManagementContainer) {
                let openBtn = document.getElementById('jirik-open-modal-btn');
                
                if (!openBtn) {
                    openBtn = document.createElement('button');
                    openBtn.id = 'jirik-open-modal-btn';
                    openBtn.className = 'button custom-button';
                    openBtn.innerHTML = '📋';
                    openBtn.title = 'Otevřít Console Logger';
                    
                    openBtn.style.cssText = `
                        color: #FF7F50 !important;
                        padding: 10px !important;
                        border-radius: 10px !important;
                        background: rgba(255, 255, 255, 0.1) !important;
                        backdrop-filter: blur(5px) !important;
                        border: none !important;
                        cursor: pointer !important;
                        font-size: 16px !important;
                        transition: all 0.3s ease !important;
                    `;
                    
                    dataManagementContainer.appendChild(openBtn);
                }
                
                openBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.openJirikModal();
                };
            }

            // Záložní tlačítko
            const manualBtn = document.getElementById('jirik-manual-opener-btn');
            if (manualBtn) {
                manualBtn.onclick = () => window.openJirikModal();
            }
        };

        // Globální funkce pro otevření modalu
        window.openJirikModal = function() {
            const modal = window.jirikLoggerModal || document.getElementById('jirik-modal');
            if (modal) {
                modal.classList.add('jirik-visible');
                if (window.updateLogDisplay) {
                    window.updateLogDisplay();
                }
            }
        };

        // Inicializace
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupModal);
        } else {
            setupModal();
        }

        // Úvodní log
        originalConsole.log('🔥 Enhanced Console Logger úspěšně inicializován!');
        originalConsole.log('📋 Dostupné funkce: console.log, warn, error, info, debug, trace, table, group, time, assert, clear, count, dir');
    };

    // Spustit inicializaci
    initializeLogger();
})();
