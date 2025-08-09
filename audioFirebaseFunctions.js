// audioFirebaseFunctions.js
// Tento soubor obsahuje Firebase logiku pro audio přehrávač.

// !!! Zde je tvůj konfigurační objekt, který jsi mi poslal !!!
const firebaseConfig = {
    apiKey: "AIzaSyCxO2BdPLkvRW9q3tZTW5J39pjjAoR-9Sk", // Tvoje API Key
    authDomain: "audio-prehravac-v-3.firebaseapp.com", // Tvoje Auth Domain
    projectId: "audio-prehravac-v-3", // Tvoje Project ID
    storageBucket: "audio-prehravac-v-3.firebasestorage.app", // Tvoje Storage Bucket
    messagingSenderId: "343140348126", // Tvoje Messaging Sender ID
    appId: "1:343140348126:web:c61dc969efb6dcb547524f" // Tvoje App ID
    //measurementId: "G-6QSYEY22N6" // Pokud nepoužíváš Analytics, může být zakomentováno
};

// Log pro potvrzení, že firebaseConfig byl načten
console.log("audioFirebaseFunctions.js: Konfigurační objekt Firebase načten a připraven.", firebaseConfig.projectId);

let db; // Proměnná pro instanci Firestore databáze

// Inicializace Firebase aplikace a Firestore databáze
// Nyní asynchronní, aby počkala na plné načtení Firebase SDK
window.initializeFirebaseAppAudio = async function() {
    console.log("audioFirebaseFunctions.js: Spuštěna inicializace Firebase aplikace pro audio přehrávač.");

    return new Promise((resolve, reject) => {
        const checkFirebaseReady = setInterval(() => {
            // Kontrolujeme, zda jsou globální objekty a metody Firebase plně načteny
            if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function' && typeof firebase.firestore === 'function') {
                clearInterval(checkFirebaseReady); // Zastavíme kontrolu, Firebase je připraveno
                console.log("audioFirebaseFunctions.js: Firebase SDK (app & firestore) detekováno a připraveno.");
                
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                    console.log("audioFirebaseFunctions.js: Firebase aplikace inicializována.");
                } else {
                    console.log("audioFirebaseFunctions.js: Firebase aplikace již byla inicializována (přeskakuji).");
                }
                
                db = firebase.firestore();
                console.log("audioFirebaseFunctions.js: Firestore databáze připravena pro audio přehrávač.");
                resolve(true); // Signalizuje úspěšnou inicializaci
            } else {
                console.log("audioFirebaseFunctions.js: Čekám na načtení Firebase SDK (včetně firestore modulu)...");
            }
        }, 100); // Kontrolujeme každých 100ms
    });
};

// --- FUNKCE PRO UKLÁDÁNÍ DAT DO FIRESTORE ---

// Ukládá celý playlist do Firestore
window.savePlaylistToFirestore = async function(playlistArray) {
    console.log("audioFirebaseFunctions.js: Pokus o uložení playlistu do Firestore.", playlistArray);
    if (!db) {
        //console.error("audioFirebaseFunctions.js: Firestore databáze není inicializována, nelze uložit playlist.");
        // Voláme globální showNotification, která by měla být definována v index.html
        window.showNotification("Chyba: Databáze není připravena k uložení playlistu!", 'error');
        throw new Error("Firestore databáze není připravena k uložení playlistu.");
    }

    // Pro jednoduchost uložíme celý playlist jako jeden dokument.
    // POZOR: Firestore dokument má limit 1MB. Pokud máš 358 písniček s dlouhými URL/tituly,
    // mohl by to být problém. Pokud ano, museli bychom to rozdělit na více dokumentů/subkolekce.
    const playlistDocRef = db.collection('audioPlaylists').doc('mainPlaylist'); 
    
    try {
        await playlistDocRef.set({ tracks: playlistArray }); // Uloží pole skladeb pod klíčem 'tracks'
        console.log("audioFirebaseFunctions.js: Playlist úspěšně uložen do Firestore.");
        return true;
    } catch (error) {
        console.error("audioFirebaseFunctions.js: Chyba při ukládání playlistu do Firestore:", error);
        window.showNotification("Chyba při ukládání playlistu do cloudu!", 'error');
        throw error;
    }
};

// Ukládá oblíbené skladby do Firestore
window.saveFavoritesToFirestore = async function(favoritesArray) {
    console.log("audioFirebaseFunctions.js: Pokus o uložení oblíbených do Firestore.", favoritesArray);
    if (!db) {
        console.error("audioFirebaseFunctions.js: Firestore databáze není inicializována, nelze uložit oblíbené.");
        window.showNotification("Chyba: Databáze není připravena k uložení oblíbených!", 'error');
        throw new Error("Firestore databáze není připravena k uložení oblíbených.");
    }

    const favoritesDocRef = db.collection('audioPlayerSettings').doc('favorites'); 
    
    try {
        await favoritesDocRef.set({ titles: favoritesArray }, { merge: true }); 
        console.log("audioFirebaseFunctions.js: Oblíbené skladby úspěšně uloženy do Firestore.");
        return true;
    } catch (error) {
        console.error("audioFirebaseFunctions.js: Chyba při ukládání oblíbených do Firestore:", error);
        window.showNotification("Chyba při ukládání oblíbených do cloudu!", 'error');
        throw error;
    }
};

// Ukládá nastavení přehrávače (např. shuffle, loop, lastPlayedIndex) do Firestore
window.savePlayerSettingsToFirestore = async function(settingsObject) {
    console.log("audioFirebaseFunctions.js: Pokus o uložení nastavení přehrávače do Firestore.", settingsObject);
    if (!db) {
        console.error("audioFirebaseFunctions.js: Firestore databáze není inicializována, nelze uložit nastavení přehrávače.");
        window.showNotification("Chyba: Databáze není připravena k uložení nastavení přehrávače!", 'error');
        throw new Error("Firestore databáze není připravena k uložení nastavení přehrávače.");
    }

    const playerSettingsDocRef = db.collection('audioPlayerSettings').doc('mainSettings'); 
    
    try {
        await playerSettingsDocRef.set(settingsObject, { merge: true }); 
        console.log("audioFirebaseFunctions.js: Nastavení přehrávače úspěšně uložena do Firestore.");
        return true;
    } catch (error) {
        console.error("audioFirebaseFunctions.js: Chyba při ukládání nastavení přehrávače do Firestore:", error);
        window.showNotification("Chyba při ukládání nastavení přehrávače do cloudu!", 'error');
        throw error;
    }
};


// --- FUNKCE PRO NAČÍTÁNÍ DAT Z FIRESTORE ---

// Načítá playlist z Firestore
window.loadPlaylistFromFirestore = async function() {
    console.log("audioFirebaseFunctions.js: Pokus o načtení playlistu z Firestore.");
    if (!db) {
        //console.error("audioFirebaseFunctions.js: Firestore databáze není inicializována, nelze načíst playlist.");
        return null; 
    }

    try {
        const doc = await db.collection('audioPlaylists').doc('mainPlaylist').get();
        if (doc.exists && doc.data().tracks) {
            console.log("audioFirebaseFunctions.js: Playlist úspěšně načten z Firestore.", doc.data().tracks.length, "skladeb.");
            return doc.data().tracks; 
        } else {
            console.log("audioFirebaseFunctions.js: Dokument s playlistem 'mainPlaylist' neexistuje nebo je prázdný.");
            return null;
        }
    } catch (error) {
        console.error("audioFirebaseFunctions.js: Chyba při načítání playlistu z Firestore:", error);
        window.showNotification("Chyba při načítání playlistu z cloudu!", 'error');
        throw error;
    }
};

// Načítá oblíbené skladby z Firestore
window.loadFavoritesFromFirestore = async function() {
    console.log("audioFirebaseFunctions.js: Pokus o načtení oblíbených z Firestore.");
    if (!db) {
       // console.error("audioFirebaseFunctions.js: Firestore databáze není inicializována, nelze načíst oblíbené.");
        return null;
    }

    try {
        const doc = await db.collection('audioPlayerSettings').doc('favorites').get();
        if (doc.exists && doc.data().titles) {
            console.log("audioFirebaseFunctions.js: Oblíbené skladby úspěšně načteny z Firestore.", doc.data().titles.length, "oblíbených.");
            return doc.data().titles; 
        } else {
            console.log("audioFirebaseFunctions.js: Dokument s oblíbenými 'favorites' neexistuje nebo je prázdný.");
            return null;
        }
    } catch (error) {
        console.error("audioFirebaseFunctions.js: Chyba při načítání oblíbených z Firestore:", error);
        window.showNotification("Chyba při načítání oblíbených z cloudu!", 'error');
        throw error;
    }
};

// Načítá nastavení přehrávače z Firestore
window.loadPlayerSettingsFromFirestore = async function() {
    console.log("audioFirebaseFunctions.js: Pokus o načtení nastavení přehrávače z Firestore.");
    if (!db) {
        //console.error("audioFirebaseFunctions.js: Firestore databáze není inicializována, nelze načíst nastavení přehrávače.");
        return null;
    }

    try {
        const doc = await db.collection('audioPlayerSettings').doc('mainSettings').get();
        if (doc.exists) {
            console.log("audioFirebaseFunctions.js: Nastavení přehrávače úspěšně načtena z Firestore.", doc.data());
            return doc.data(); 
        } else {
            console.log("audioFirebaseFunctions.js: Dokument s nastavením přehrávače 'mainSettings' neexistuje.");
            return null;
        }
    } catch (error) {
        console.error("audioFirebaseFunctions.js: Chyba při načítání nastavení přehrávače z Firestore:", error);
        window.showNotification("Chyba při načítání nastavení přehrávače z cloudu!", 'error');
        throw error;
    }
};


// --- FUNKCE PRO SMAZÁNÍ DAT Z FIRESTORE (POZOR! DŮRAZNĚ!) ---

// Funkce pro smazání všech dat ze všech kolekcí audio přehrávače
window.clearAllAudioFirestoreData = async function() {
    console.log("audioFirebaseFunctions.js: Pokus o smazání VŠECH dat audio přehrávače z Firestore (všechny určené kolekce).");
    if (!db) {
        console.error("audioFirebaseFunctions.js: Firestore databáze není inicializována, nelze smazat všechna data.");
        window.showNotification("Chyba: Databáze není připravena k mazání všech dat!", 'error');
        throw new Error("Firestore databáze není připravena ke smazání všech dat.");
    }

    try {
        const collectionsToClear = ['audioPlaylists', 'audioPlayerSettings']; // Kolekce specifické pro audio přehrávač
        let totalDeletedCount = 0;

        for (const collectionName of collectionsToClear) {
            console.log(`audioFirebaseFunctions.js: Spouštím mazání dokumentů z kolekce '${collectionName}'.`);
            const collectionRef = db.collection(collectionName);
            const snapshot = await collectionRef.get();
            const batch = db.batch();
            let deletedInCollection = 0;

            if (snapshot.size === 0) {
                console.log(`audioFirebaseFunctions.js: Kolekce '${collectionName}' je již prázdná.`);
                continue; 
            }

            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                deletedInCollection++;
            });

            console.log(`audioFirebaseFunctions.js: Přidáno ${deletedInCollection} dokumentů z kolekce '${collectionName}' do dávky pro smazání.`);
            await batch.commit();
            console.log(`audioFirebaseFunctions.js: Smazáno ${deletedInCollection} dokumentů z kolekce '${collectionName}'.`);
            totalDeletedCount += deletedInCollection;
        }
        
        console.log(`audioFirebaseFunctions.js: Všechna data audio přehrávače z Firestore úspěšně smazána. Celkem smazáno: ${totalDeletedCount} dokumentů.`);
        return true;
    } catch (error) {
        console.error("audioFirebaseFunctions.js: Chyba při mazání všech dat z Firestore:", error);
        window.showNotification("Chyba při mazání všech dat z cloudu!", 'error');
        throw error;
    }
};
 
