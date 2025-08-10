 /**
         * 🚀 UNIVERZÁLNÍ TONE.METER ENHANCED - s A4 kalibrací a auto-kalibrací mikrofonu
         */
        class ToneMeter {
            constructor(options = {}) {
                this.options = {
                    fftSize: options.fftSize || 2048,
                    smoothingTimeConstant: options.smoothingTimeConstant || 0.8,
                    minDecibels: options.minDecibels || -90,
                    maxDecibels: options.maxDecibels || -10,
                    updateInterval: options.updateInterval || 16,
                    onToneDetected: options.onToneDetected || null,
                    onVolumeChange: options.onVolumeChange || null,
                    onCalibrationUpdate: options.onCalibrationUpdate || null
                };

                this.audioContext = null;
                this.analyserNode = null;
                this.sourceNode = null;
                this.gainNode = null;
                this.dataArray = null;
                this.isActive = false;
                this.currentVolume = 0;
                this.dominantFrequency = 0;
                this.animationId = null;
                this.inputVolume = 1.0;
                this.micBoost = 1.0;
                this.microphoneStream = null;
                this.microphonePermissionGranted = false;
                
                // NOVÉ: Kalibrace A4
                this.a4Frequency = 440; // Standardní A4
                
                // NOVÉ: Auto-kalibrace mikrofonu
                this.isCalibrating = false;
                this.calibrationSamples = [];
                this.calibrationDuration = 3000; // 3 sekundy
                this.calibrationStartTime = 0;
                this.optimalGain = 1.0;
                this.volumeHistory = [];
                this.maxHistoryLength = 50;
                
                this.init();
            }

            async init() {
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (!AudioContext) {
                        console.error('ToneMeter: AudioContext není podporován v tomto prohlížeči.');
                        return;
                    }
                    this.audioContext = new AudioContext();
                    this.analyserNode = this.audioContext.createAnalyser();
                    this.gainNode = this.audioContext.createGain();
                    
                    this.analyserNode.fftSize = this.options.fftSize;
                    this.analyserNode.smoothingTimeConstant = this.options.smoothingTimeConstant;
                    this.analyserNode.minDecibels = this.options.minDecibels;
                    this.analyserNode.maxDecibels = this.options.maxDecibels;
                    this.dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
                    console.log('ToneMeter: AudioContext inicializován.');
                } catch (error) {
                    console.error('ToneMeter init error:', error);
                }
            }

            // NOVÉ: Nastavení A4 frekvence
            setA4Frequency(frequency) {
                this.a4Frequency = Math.max(400, Math.min(480, frequency));
                console.log('ToneMeter: A4 frekvence nastavena na', this.a4Frequency, 'Hz');
            }

            // NOVÉ: Spuštění kalibrace mikrofonu
            async startCalibration() {
                if (!this.isActive) {
                    console.error('ToneMeter: Nelze kalibrovat - analyzér není spuštěn.');
                    return;
                }

                this.isCalibrating = true;
                this.calibrationSamples = [];
                this.calibrationStartTime = Date.now();
                
                console.log('ToneMeter: Spouštím kalibraci mikrofonu...');
                
                if (this.options.onCalibrationUpdate) {
                    this.options.onCalibrationUpdate({
                        phase: 'start',
                        message: 'Začíná kalibrace - mluvte normálně',
                        progress: 0
                    });
                }

                // Kalibrace bude probíhat během normální analýzy
                setTimeout(() => {
                    this.finishCalibration();
                }, this.calibrationDuration);
            }

            // NOVÉ: Dokončení kalibrace
            finishCalibration() {
                if (!this.isCalibrating) return;

                this.isCalibrating = false;
                
                if (this.calibrationSamples.length > 0) {
                    // Vypočítáme průměrnou hlasitost
                    const avgVolume = this.calibrationSamples.reduce((sum, vol) => sum + vol, 0) / this.calibrationSamples.length;
                    
                    // Ideální hlasitost je kolem 30-60%
                    const targetVolume = 45;
                    this.optimalGain = targetVolume / Math.max(avgVolume, 1);
                    this.optimalGain = Math.max(0.1, Math.min(5.0, this.optimalGain));
                    
                    // Aplikujeme optimální zesílení
                    this.setMicBoost(this.optimalGain * 100);
                    
                    console.log('ToneMeter: Kalibrace dokončena - optimální zesílení:', this.optimalGain);
                    
                    if (this.options.onCalibrationUpdate) {
                        this.options.onCalibrationUpdate({
                            phase: 'complete',
                            message: `Kalibrace dokončena - nastaveno ${this.optimalGain.toFixed(1)}x`,
                            progress: 100,
                            optimalGain: this.optimalGain
                        });
                    }
                } else {
                    console.log('ToneMeter: Kalibrace neúspěšná - žádné vzorky.');
                    if (this.options.onCalibrationUpdate) {
                        this.options.onCalibrationUpdate({
                            phase: 'error',
                            message: 'Kalibrace neúspěšná - zkuste znovu',
                            progress: 0
                        });
                    }
                }
            }

            // Získání nebo obnovení mikrofonu
            async getMicrophoneStream() {
                if (this.microphoneStream && this.microphoneStream.active) {
                    console.log('ToneMeter: Používám existující stream mikrofonu.');
                    return this.microphoneStream;
                }

                try {
                    console.log('ToneMeter: Žádám o povolení mikrofonu...');
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        audio: { 
                            echoCancellation: false, 
                            noiseSuppression: false, 
                            autoGainControl: false,
                            deviceId: this.getStoredMicrophoneId()
                        } 
                    });
                    
                    this.microphoneStream = stream;
                    this.microphonePermissionGranted = true;
                    this.storeMicrophonePermission(true);
                    
                    const audioTracks = stream.getAudioTracks();
                    if (audioTracks.length > 0) {
                        const deviceId = audioTracks[0].getSettings().deviceId;
                        this.storeMicrophoneId(deviceId);
                        console.log('ToneMeter: Mikrofonový stream získán, deviceId:', deviceId);
                    }
                    
                    return stream;
                } catch (error) {
                    this.microphonePermissionGranted = false;
                    this.storeMicrophonePermission(false);
                    console.error('ToneMeter: Chyba při získávání mikrofonu:', error);
                    throw error;
                }
            }

            storeMicrophonePermission(granted) {
                try {
                    const data = { granted: granted, timestamp: Date.now() };
                    window.toneMeterMicPermission = data;
                    console.log('ToneMeter: Stav povolení mikrofonu uložen:', granted);
                } catch (error) {
                    console.warn('ToneMeter: Nelze uložit stav povolení:', error);
                }
            }

            getStoredMicrophonePermission() {
                try {
                    const data = window.toneMeterMicPermission;
                    if (data && (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000) {
                        console.log('ToneMeter: Nalezen uložený stav povolení:', data.granted);
                        return data.granted;
                    }
                } catch (error) {
                    console.warn('ToneMeter: Nelze načíst stav povolení:', error);
                }
                return false;
            }

            storeMicrophoneId(deviceId) {
                try {
                    window.toneMeterMicDeviceId = deviceId;
                } catch (error) {
                    console.warn('ToneMeter: Nelze uložit ID mikrofonu:', error);
                }
            }

            getStoredMicrophoneId() {
                try {
                    return window.toneMeterMicDeviceId || undefined;
                } catch (error) {
                    console.warn('ToneMeter: Nelze načíst ID mikrofonu:', error);
                    return undefined;
                }
            }

            async start() {
                if (!this.audioContext || !this.analyserNode) {
                    console.error('ToneMeter: AudioContext není inicializován.');
                    throw new Error('AudioContext není inicializován.');
                }
                
                try {
                    const stream = await this.getMicrophoneStream();
                    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
                    this.sourceNode.connect(this.gainNode);
                    this.gainNode.connect(this.analyserNode);
                    
                    this.isActive = true;
                    this.startAnalysis();
                    
                    // NOVÉ: Automatická kalibrace po 2 sekundách
                    setTimeout(() => {
                        if (this.isActive) {
                            this.startCalibration();
                        }
                    }, 2000);
                    
                    console.log('ToneMeter: Analýza zvuku spuštěna.');
                } catch (error) {
                    console.error('ToneMeter start error:', error);
                    throw error;
                }
            }

            setInputVolume(volume) {
                this.inputVolume = volume / 100;
                if (this.gainNode) {
                    this.gainNode.gain.value = this.inputVolume * this.micBoost;
                }
            }

            setMicBoost(boost) {
                this.micBoost = boost / 100;
                if (this.gainNode) {
                    this.gainNode.gain.value = this.inputVolume * this.micBoost;
                }
            }

            startAnalysis() {
                const analyze = () => {
                    if (!this.isActive) return;
                    
                    this.analyserNode.getByteFrequencyData(this.dataArray);
                    this.currentVolume = this.calculateVolume();
                    this.dominantFrequency = this.findDominantFrequency();
                    
                    // NOVÉ: Tuner kalkulace
                this.tunerData = this.calculateTunerData(this.dominantFrequency);
                
                // NOVÉ: Ukládání vzorků během kalibrace
                    if (this.isCalibrating) {
                        this.calibrationSamples.push(this.currentVolume);
                        
                        const elapsed = Date.now() - this.calibrationStartTime;
                        const progress = Math.min((elapsed / this.calibrationDuration) * 100, 100);
                        
                        if (this.options.onCalibrationUpdate) {
                            this.options.onCalibrationUpdate({
                                phase: 'progress',
                                message: `Kalibrace probíhá... ${Math.round(progress)}%`,
                                progress: progress
                            });
                        }
                    }
                    
                    // Historie hlasitosti pro lepší analýzu
                    this.volumeHistory.push(this.currentVolume);
                    if (this.volumeHistory.length > this.maxHistoryLength) {
                        this.volumeHistory.shift();
                    }
                    
                    if (this.options.onVolumeChange) {
                        this.options.onVolumeChange(this.currentVolume);
                    }
                    
                    if (this.options.onToneDetected) {
                        this.options.onToneDetected({
                            frequency: this.dominantFrequency,
                            volume: this.currentVolume,
                            note: this.frequencyToNote(this.dominantFrequency),
                            tuner: this.tunerData
                        });
                    }
                    
                    this.animationId = setTimeout(analyze, this.options.updateInterval);
                };
                analyze();
            }

            calculateVolume() {
                let sum = 0;
                for (let i = 0; i < this.dataArray.length; i++) {
                    sum += this.dataArray[i];
                }
                return Math.round((sum / this.dataArray.length) / 255 * 100);
            }

            findDominantFrequency() {
                let maxIndex = 0;
                let maxValue = 0;
                
                for (let i = 10; i < this.dataArray.length; i++) {
                    if (this.dataArray[i] > maxValue) {
                        maxValue = this.dataArray[i];
                        maxIndex = i;
                    }
                }
                
                const nyquist = this.audioContext.sampleRate / 2;
                const frequency = (maxIndex / this.dataArray.length) * nyquist;
                return Math.round(frequency);
            }

            // NOVÉ: Výpočet dat pro tuner
            calculateTunerData(frequency) {
                if (frequency < 80) {
                    return {
                        note: null,
                        cents: 0,
                        targetFrequency: 0,
                        isInTune: false,
                        deviation: 0
                    };
                }

                const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                const C0 = this.a4Frequency * Math.pow(2, -4.75);
                
                if (frequency <= C0) {
                    return {
                        note: null,
                        cents: 0,
                        targetFrequency: 0,
                        isInTune: false,
                        deviation: 0
                    };
                }

                // Výpočet nejbližší noty
                const h = 12 * Math.log2(frequency / C0);
                const nearestSemitone = Math.round(h);
                const octave = Math.floor(nearestSemitone / 12);
                const noteIndex = nearestSemitone % 12;
                
                // Cílová frekvence nejbližší noty
                const targetFrequency = C0 * Math.pow(2, nearestSemitone / 12);
                
                // Rozdíl v centech (1 semitón = 100 centů)
                const cents = Math.round((h - nearestSemitone) * 100);
                
                // Je v ladění? (tolerance ±5 centů)
                const isInTune = Math.abs(cents) <= 5;
                
                const note = notes[noteIndex] + octave;
                const deviation = frequency - targetFrequency;

                return {
                    note: note,
                    cents: cents,
                    targetFrequency: Math.round(targetFrequency * 10) / 10,
                    isInTune: isInTune,
                    deviation: Math.round(deviation * 10) / 10
                };
            }

            // UPRAVENÉ: Použití nastavitelné A4 frekvence
            frequencyToNote(frequency) {
                if (frequency < 80) return null;
                
                const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                const C0 = this.a4Frequency * Math.pow(2, -4.75); // Výpočet C0 na základě A4
                
                if (frequency > C0) {
                    const h = Math.round(12 * Math.log2(frequency / C0));
                    const octave = Math.floor(h / 12);
                    const n = h % 12;
                    return notes[n] + octave;
                }
                return null;
            }

            stop() {
                this.isActive = false;
                this.isCalibrating = false;
                if (this.animationId) {
                    clearTimeout(this.animationId);
                    this.animationId = null;
                }
                if (this.sourceNode) {
                    this.sourceNode.disconnect();
                    this.sourceNode = null;
                }
                if (this.gainNode) {
                    this.gainNode.disconnect();
                }
                console.log('ToneMeter: Analýza zvuku zastavena (stream zůstává aktivní).');
            }

            destroy() {
                this.stop();
                if (this.microphoneStream) {
                    this.microphoneStream.getTracks().forEach(track => track.stop());
                    this.microphoneStream = null;
                }
                console.log('ToneMeter: Kompletně ukončen včetně mikrofonu.');
            }

            createVisualizer(canvas) {
                if (!canvas) {
                    console.error('ToneMeter: Canvas nenalezen.');
                    return;
                }
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.error('ToneMeter: Nelze získat 2D kontext canvasu.');
                    return;
                }
                const width = canvas.width = canvas.offsetWidth || 300;
                const height = canvas.height = canvas.offsetHeight || 150;
                console.log('ToneMeter: Visualizer inicializován s rozměry', width, 'x', height);
                
                const draw = () => {
                    if (!this.isActive) return;
                    
                    ctx.clearRect(0, 0, width, height);
                    
                    // Pozadí s indikátorem kalibrace
                    if (this.isCalibrating) {
                        ctx.fillStyle = '#332200';
                    } else {
                        ctx.fillStyle = '#001122';
                    }
                    ctx.fillRect(0, 0, width, height);
                    
                    const barWidth = width / this.dataArray.length * 2;
                    let x = 0;
                    
                    for (let i = 0; i < this.dataArray.length; i++) {
                        const barHeight = (this.dataArray[i] / 255) * height;
                        
                        let gradient;
                        if (this.isCalibrating) {
                            gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
                            gradient.addColorStop(0, '#ffaa00');
                            gradient.addColorStop(0.5, '#ff8800');
                            gradient.addColorStop(1, '#332200');
                        } else {
                            gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
                            gradient.addColorStop(0, '#00ff88');
                            gradient.addColorStop(0.5, '#0088ff');
                            gradient.addColorStop(1, '#002244');
                        }
                        
                        ctx.fillStyle = gradient;
                        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                        x += barWidth + 1;
                    }
                    
                    // Text info
                    ctx.fillStyle = this.isCalibrating ? '#ffaa00' : '#00ff88';
                    ctx.font = '14px monospace';
                    const noteText = this.frequencyToNote(this.dominantFrequency) || 'N/A';
                    ctx.fillText(`${this.currentVolume}% | ${this.dominantFrequency}Hz | ${noteText} | A4=${this.a4Frequency}Hz`, 10, 20);
                    
                    if (this.isCalibrating) {
                        ctx.fillStyle = '#ffaa00';
                        ctx.font = '12px monospace';
                        ctx.fillText('🔧 KALIBRACE PROBÍHÁ...', 10, height - 10);
                    }
                    
                    requestAnimationFrame(draw);
                };
                
                draw();
            }

            isRunning() { return this.isActive; }
            getVolume() { return this.currentVolume; }
            getFrequency() { return this.dominantFrequency; }
            getNote() { return this.frequencyToNote(this.dominantFrequency); }
            getA4Frequency() { return this.a4Frequency; }
            getOptimalGain() { return this.optimalGain; }
        }

        window.ToneMeter = ToneMeter;

        document.addEventListener('DOMContentLoaded', function() {
            const DOM = {
                startBtn: document.getElementById('startBtn'),
                stopBtn: document.getElementById('stopBtn'),
                calibrateBtn: document.getElementById('calibrateBtn'),
                volumeValue: document.getElementById('volumeValue'),
                frequencyValue: document.getElementById('frequencyValue'),
                noteValue: document.getElementById('noteValue'),
                statusIndicator: document.getElementById('statusIndicator'),
                canvas: document.getElementById('visualizerCanvas'),
                inputVolumeSlider: document.getElementById('inputVolumeSlider'),
                inputVolumeValue: document.getElementById('inputVolumeValue'),
                micBoostSlider: document.getElementById('micBoostSlider'),
                micBoostValue: document.getElementById('micBoostValue'),
                a4FreqInput: document.getElementById('a4FreqInput'),
                resetA4Btn: document.getElementById('resetA4Btn'),
                micCalibrationInfo: document.getElementById('micCalibrationInfo'),
                // NOVÉ: Tuner prvky
                tunerNote: document.getElementById('tunerNote'),
                tunerNeedle: document.getElementById('tunerNeedle'),
                centValue: document.getElementById('centValue'),
                frequencyDiff: document.getElementById('frequencyDiff')
            };

            if (!DOM.startBtn || !DOM.stopBtn || !DOM.volumeValue || !DOM.frequencyValue || !DOM.noteValue || !DOM.statusIndicator || !DOM.canvas) {
                console.error('ToneMeter: Některé HTML prvky chybí.');
                return;
            }

            let toneMeter = null;

            // NOVÉ: A4 kalibrace
            DOM.a4FreqInput.addEventListener('input', function() {
                const freq = parseFloat(this.value);
                if (toneMeter && freq >= 400 && freq <= 480) {
                    toneMeter.setA4Frequency(freq);
                    console.log('A4 frekvence změněna na:', freq, 'Hz');
                }
            });

            DOM.resetA4Btn.addEventListener('click', function() {
                DOM.a4FreqInput.value = 440;
                if (toneMeter) {
                    toneMeter.setA4Frequency(440);
                }
                console.log('A4 frekvence resetována na 440 Hz');
            });

            // Ovládání posuvníků
            DOM.inputVolumeSlider.addEventListener('input', function() {
                const value = this.value;
                DOM.inputVolumeValue.textContent = value + '%';
                if (toneMeter && toneMeter.isRunning()) {
                    toneMeter.setInputVolume(value);
                }
            });

            DOM.micBoostSlider.addEventListener('input', function() {
                const value = this.value;
                const boost = (value / 100).toFixed(1);
                DOM.micBoostValue.textContent = boost + 'x';
                if (toneMeter && toneMeter.isRunning()) {
                    toneMeter.setMicBoost(value);
                }
            });

            // NOVÉ: Tlačítko pro manuální kalibraci
            DOM.calibrateBtn.addEventListener('click', function() {
                if (toneMeter && toneMeter.isRunning()) {
                    DOM.statusIndicator.className = 'tone-meter-status calibrating';
                    DOM.statusIndicator.textContent = '🔧 KALIBRACE MIKROFONU...';
                    toneMeter.startCalibration();
                }
            });

            DOM.startBtn.addEventListener('click', async function() {
                console.log('ToneMeter: Start button clicked.');
                
                if (toneMeter && toneMeter.getStoredMicrophonePermission()) {
                    DOM.statusIndicator.className = 'tone-meter-status active';
                    DOM.statusIndicator.textContent = '🔄 OBNOVUJI PŘIPOJENÍ...';
                }
                
                try {
                    if (!toneMeter) {
                        toneMeter = new ToneMeter({
                            onToneDetected: (data) => {
                                if (DOM.frequencyValue) DOM.frequencyValue.textContent = data.frequency + ' Hz';
                                if (DOM.noteValue) DOM.noteValue.textContent = data.note || '---';
                                
                                // NOVÉ: Aktualizace tuneru
                                if (data.tuner && DOM.tunerNote && DOM.tunerNeedle && DOM.centValue && DOM.frequencyDiff) {
                                    // Aktualizace noty
                                    DOM.tunerNote.textContent = data.tuner.note || '---';
                                    
                                    // Aktualizace ručičky (-50° až +50°)
                                    const maxAngle = 45; // stupňů
                                    const angle = Math.max(-maxAngle, Math.min(maxAngle, data.tuner.cents * 0.9));
                                    DOM.tunerNeedle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
                                    
                                    // Barva ručičky podle ladění
                                    if (data.tuner.isInTune) {
                                        DOM.tunerNeedle.className = 'tone-meter-tuner-needle in-tune';
                                    } else {
                                        DOM.tunerNeedle.className = 'tone-meter-tuner-needle';
                                    }
                                    
                                    // Aktualizace hodnoty centů
                                    DOM.centValue.textContent = (data.tuner.cents > 0 ? '+' : '') + data.tuner.cents + '¢';
                                    
                                    // Barva podle odchylky
                                    if (data.tuner.isInTune) {
                                        DOM.centValue.className = 'tone-meter-cent-value in-tune';
                                    } else if (data.tuner.cents > 0) {
                                        DOM.centValue.className = 'tone-meter-cent-value sharp';
                                    } else {
                                        DOM.centValue.className = 'tone-meter-cent-value flat';
                                    }
                                    
                                    // Cílová frekvence
                                    if (data.tuner.targetFrequency > 0) {
                                        DOM.frequencyDiff.textContent = `Cílová frekvence: ${data.tuner.targetFrequency} Hz (${data.tuner.deviation > 0 ? '+' : ''}${data.tuner.deviation} Hz)`;
                                    } else {
                                        DOM.frequencyDiff.textContent = 'Cílová frekvence: --- Hz';
                                    }
                                }
                            },
                            onVolumeChange: (volume) => {
                                if (DOM.volumeValue) DOM.volumeValue.textContent = volume + '%';
                            },
                            onCalibrationUpdate: (status) => {
                                // Aktualizace během kalibrace
                                if (status.phase === 'start') {
                                    DOM.statusIndicator.className = 'tone-meter-status calibrating';
                                    DOM.statusIndicator.textContent = '🔧 ' + status.message.toUpperCase();
                                    DOM.micCalibrationInfo.textContent = status.message;
                                } else if (status.phase === 'progress') {
                                    DOM.statusIndicator.textContent = '🔧 ' + status.message.toUpperCase();
                                    DOM.micCalibrationInfo.textContent = status.message;
                                } else if (status.phase === 'complete') {
                                    DOM.statusIndicator.className = 'tone-meter-status active';
                                    DOM.statusIndicator.textContent = '🎵 AKTIVNÍ - ANALYZUJI ZVUK';
                                    DOM.micCalibrationInfo.textContent = status.message + ' - Kalibrace úspěšná!';
                                    
                                    // Aktualizace posuvníku boost
                                    const boostValue = Math.round(status.optimalGain * 100);
                                    DOM.micBoostSlider.value = boostValue;
                                    DOM.micBoostValue.textContent = status.optimalGain.toFixed(1) + 'x';
                                } else if (status.phase === 'error') {
                                    DOM.statusIndicator.className = 'tone-meter-status active';
                                    DOM.statusIndicator.textContent = '🎵 AKTIVNÍ - ANALYZUJI ZVUK';
                                    DOM.micCalibrationInfo.textContent = status.message;
                                }
                            }
                        });
                        
                        // Nastavení A4 frekvence
                        toneMeter.setA4Frequency(parseFloat(DOM.a4FreqInput.value));
                    }

                    await toneMeter.start();
                    
                    toneMeter.setInputVolume(DOM.inputVolumeSlider.value);
                    toneMeter.setMicBoost(DOM.micBoostSlider.value);
                    
                    toneMeter.createVisualizer(DOM.canvas);

                    DOM.statusIndicator.className = 'tone-meter-status active';
                    DOM.statusIndicator.textContent = '🎵 AKTIVNÍ - SPOUŠTÍM KALIBRACI...';
                    DOM.startBtn.disabled = true;
                    DOM.stopBtn.disabled = false;
                    DOM.calibrateBtn.disabled = false;
                } catch (error) {
                    console.error('ToneMeter: Chyba při startu:', error);
                    DOM.statusIndicator.className = 'tone-meter-status error';
                    DOM.statusIndicator.textContent = '❌ CHYBA - POVOLTE MIKROFON';
                    DOM.micCalibrationInfo.textContent = 'Chyba: Není povolený přístup k mikrofonu';
                }
            });

            DOM.stopBtn.addEventListener('click', function() {
                console.log('ToneMeter: Stop button clicked.');
                if (toneMeter) {
                    toneMeter.stop();
                    DOM.statusIndicator.className = 'tone-meter-status inactive';
                    DOM.statusIndicator.textContent = '⏹️ ZASTAVENO';
                    DOM.startBtn.disabled = false;
                    DOM.stopBtn.disabled = true;
                    DOM.calibrateBtn.disabled = true;
                    DOM.micCalibrationInfo.textContent = 'Automatická kalibrace citlivosti se spustí po startu měření';
                    // NOVÉ: Reset tuneru
                    if (DOM.tunerNote) DOM.tunerNote.textContent = '---';
                    if (DOM.tunerNeedle) {
                        DOM.tunerNeedle.style.transform = 'translateX(-50%) rotate(0deg)';
                        DOM.tunerNeedle.className = 'tone-meter-tuner-needle';
                    }
                    if (DOM.centValue) {
                        DOM.centValue.textContent = '0¢';
                        DOM.centValue.className = 'tone-meter-cent-value';
                    }
                    if (DOM.frequencyDiff) DOM.frequencyDiff.textContent = 'Cílová frekvence: --- Hz';
                    
                    if (DOM.volumeValue) DOM.volumeValue.textContent = '0%';
                    if (DOM.frequencyValue) DOM.frequencyValue.textContent = '0 Hz';
                    if (DOM.noteValue) DOM.noteValue.textContent = '---';
                }
            });
        });
