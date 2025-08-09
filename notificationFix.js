// =============================================================================
// 🚀 NOTIFICATION SYSTEM FIX - Oprava chybějícího UI elementu
// =============================================================================
// Autor: Admirál Claude.AI pro více admirála Jiříka
// Problém: showNotification hledá #notification element, který neexistuje v HTML
// Řešení: Automatické vytvoření notifikačního systému pokud chybí
// =============================================================================

console.log("🖖 Notification Fix: Kontrolujem notifikační systém...");

// --- Funkce pro vytvoření notifikačního elementu ---
function createNotificationElement() {
    // Zkontrolovat, jestli už element existuje
    let notificationElement = document.getElementById('notification');
    
    if (!notificationElement) {
        console.log("🚀 Notification Fix: Vytvářím chybějící #notification element");
        
        // Vytvoření notifikačního elementu
        notificationElement = document.createElement('div');
        notificationElement.id = 'notification';
        
        // Styly pro notifikační element (Star Trek inspirované)
        notificationElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Orbitron', 'Arial', sans-serif;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 
                0 4px 20px rgba(0, 0, 0, 0.3),
                0 0 20px rgba(42, 82, 152, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%) scale(0.8);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            backdrop-filter: blur(10px);
            max-width: 350px;
            word-wrap: break-word;
            display: none;
        `;
        
        // Přidat element do DOM
        document.body.appendChild(notificationElement);
        
        console.log("🚀 Notification Fix: Element #notification úspěšně vytvořen a přidán do DOM");
        
        // Přidat hover efekt
        notificationElement.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(0) scale(1.05)';
            this.style.boxShadow = `
                0 6px 25px rgba(0, 0, 0, 0.4),
                0 0 30px rgba(42, 82, 152, 0.7),
                inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `;
        });
        
        notificationElement.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0) scale(1)';
            this.style.boxShadow = `
                0 4px 20px rgba(0, 0, 0, 0.3),
                0 0 20px rgba(42, 82, 152, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `;
        });
        
        // Přidat možnost zavření kliknutím
        notificationElement.addEventListener('click', function() {
            hideNotification(this);
        });
        
        return notificationElement;
    } else {
        console.log("🚀 Notification Fix: Element #notification již existuje");
        return notificationElement;
    }
}

// --- Vylepšená funkce pro skrytí notifikace ---
function hideNotification(element) {
    if (element) {
        element.style.opacity = '0';
        element.style.transform = 'translateX(100%) scale(0.8)';
        
        setTimeout(() => {
            element.style.display = 'none';
        }, 400);
    }
}

// --- Vylepšená showNotification funkce ---
function enhancedShowNotification(message, type = 'info', duration = 3000) {
    // Zajistit že máme notifikační element
    const notificationElement = createNotificationElement();
    
    if (!notificationElement) {
        console.error("🚀 Notification Fix: Nepodařilo se vytvořit notifikační element!");
        // Fallback na console.log
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
    }
    
    // Nastavit text zprávy
    notificationElement.textContent = message;
    
    // Nastavit barvy podle typu zprávy
    let backgroundColor, borderColor;
    switch (type.toLowerCase()) {
        case 'error':
            backgroundColor = 'linear-gradient(135deg, #dc3545, #c82333)';
            borderColor = 'rgba(248, 215, 218, 0.5)';
            break;
        case 'warn':
        case 'warning':
            backgroundColor = 'linear-gradient(135deg, #ffc107, #e0a800)';
            borderColor = 'rgba(255, 243, 205, 0.5)';
            notificationElement.style.color = '#212529';
            break;
        case 'success':
            backgroundColor = 'linear-gradient(135deg, #28a745, #20c997)';
            borderColor = 'rgba(212, 237, 218, 0.5)';
            break;
        case 'info':
        default:
            backgroundColor = 'linear-gradient(135deg, #1e3c72, #2a5298)';
            borderColor = 'rgba(255, 255, 255, 0.3)';
            notificationElement.style.color = '#ffffff';
            break;
    }
    
    // Aplikovat styly
    notificationElement.style.background = backgroundColor;
    notificationElement.style.borderColor = borderColor;
    
    // Zobrazit notifikaci s animací
    notificationElement.style.display = 'block';
    
    // Malá prodleva pro aktivaci CSS transition
    setTimeout(() => {
        notificationElement.style.opacity = '1';
        notificationElement.style.transform = 'translateX(0) scale(1)';
    }, 10);
    
    // Automatické skrytí po určené době
    setTimeout(() => {
        hideNotification(notificationElement);
    }, duration);
    
    console.log(`🚀 [${type.toUpperCase()}] ${message}`);
}

// --- Integrace s původní showNotification funkcí ---
function integrateNotificationSystem() {
    // Záložní původní funkci
    if (typeof window.showNotification === 'function') {
        window.originalShowNotification = window.showNotification;
    }
    
    // Nahradit původní funkci naší vylepšenou verzí
    window.showNotification = enhancedShowNotification;
    
    console.log("🚀 Notification Fix: showNotification funkce byla vylepšena a integrována");
}

// --- CSS styly pro různé typy notifikací ---
function injectNotificationStyles() {
    const styleId = 'notification-system-styles';
    
    // Zkontrolovat jestli styly již neexistují
    if (document.getElementById(styleId)) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Globální styly pro notifikační systém */
        #notification {
            font-family: 'Orbitron', 'Roboto', 'Arial', sans-serif !important;
            letter-spacing: 0.5px;
            line-height: 1.4;
        }
        
        /* Responzivní design */
        @media (max-width: 768px) {
            #notification {
                top: 10px !important;
                right: 10px !important;
                left: 10px !important;
                max-width: none !important;
                font-size: 13px !important;
                padding: 10px 16px !important;
            }
        }
        
        @media (max-width: 480px) {
            #notification {
                font-size: 12px !important;
                padding: 8px 14px !important;
            }
        }
        
        /* Animace pro různé stavy */
        #notification.success {
            animation: successPulse 0.6s ease-out;
        }
        
        #notification.error {
            animation: errorShake 0.6s ease-out;
        }
        
        @keyframes successPulse {
            0% { transform: translateX(0) scale(1); }
            50% { transform: translateX(0) scale(1.08); }
            100% { transform: translateX(0) scale(1); }
        }
        
        @keyframes errorShake {
            0%, 100% { transform: translateX(0) scale(1); }
            25% { transform: translateX(-5px) scale(1); }
            75% { transform: translateX(5px) scale(1); }
        }
    `;
    
    document.head.appendChild(style);
    console.log("🚀 Notification Fix: CSS styly pro notifikace byly přidány");
}

// --- Test notifikačního systému ---
window.testNotificationSystem = function() {
    console.log("🚀 Notification Fix: Spouštím test notifikačního systému...");
    
    setTimeout(() => window.showNotification("✅ Test INFO notifikace", 'info'), 500);
    setTimeout(() => window.showNotification("⚠️ Test WARNING notifikace", 'warn'), 1500);
    setTimeout(() => window.showNotification("✅ Test SUCCESS notifikace", 'success'), 2500);
    setTimeout(() => window.showNotification("❌ Test ERROR notifikace", 'error'), 3500);
    setTimeout(() => window.showNotification("🚀 Notifikační systém je plně funkční!", 'success'), 4500);
    
    console.log("🚀 Notification Fix: Test dokončen - sledujte pravý horní roh!");
};

// --- Inicializace opravy ---
function initNotificationFix() {
    console.log("🚀 Notification Fix: Inicializuji opravu notifikačního systému...");
    
    // Vložit CSS styly
    injectNotificationStyles();
    
    // Integrovat vylepšený notifikační systém
    integrateNotificationSystem();
    
    // Vytvořit notifikační element pokud neexistuje
    createNotificationElement();
    
    console.log("🚀 Notification Fix: Oprava dokončena - notifikace jsou nyní plně funkční!");
    
    // Zobrazit potvrzovací zprávu
    setTimeout(() => {
        window.showNotification("🛠️ Notifikační systém byl úspěšně opraven!", 'success', 4000);
    }, 500);
}

// --- Spuštění opravy při načtení ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotificationFix);
} else {
    initNotificationFix();
}

// --- Debug funkce ---
window.checkNotificationSystem = function() {
    const element = document.getElementById('notification');
    console.log("🚀 Notification Check:", {
        elementExists: !!element,
        elementVisible: element ? element.style.display !== 'none' : false,
        showNotificationFunction: typeof window.showNotification === 'function',
        originalFunction: typeof window.originalShowNotification === 'function'
    });
};

// =============================================================================
// 🖖 Konec Notification System Fix
// Nyní by všechny notifikace měly fungovat bez chyb!
// =============================================================================