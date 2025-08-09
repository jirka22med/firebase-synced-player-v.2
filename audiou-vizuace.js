      /**
         * 🚀 UNIVERZÁLNÍ TONE.METER - s ovládáním mikrofonu
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
                    onVolumeChange: options.onVolumeChange || null
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

            // Získání nebo obnovení mikrofonu
            async getMicrophoneStream() {
                // Pokud už máme aktivní stream, použijeme ho
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
                    
                    // Uložíme ID mikrofonu pro příště
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

            // Uložení stavu povolení
            storeMicrophonePermission(granted) {
                try {
                    const data = { granted: granted, timestamp: Date.now() };
                    window.toneMeterMicPermission = data;
                    console.log('ToneMeter: Stav povolení mikrofonu uložen:', granted);
                } catch (error) {
                    console.warn('ToneMeter: Nelze uložit stav povolení:', error);
                }
            }

            // Získání uloženého stavu
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

            // Uložení ID mikrofonu
            storeMicrophoneId(deviceId) {
                try {
                    window.toneMeterMicDeviceId = deviceId;
                } catch (error) {
                    console.warn('ToneMeter: Nelze uložit ID mikrofonu:', error);
                }
            }

            // Získání ID mikrofonu
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
                    console.log('ToneMeter: Analýza zvuku spuštěna.');
                } catch (error) {
                    console.error('ToneMeter start error:', error);
                    throw error;
                }
            }

            // Nastavení hlasitosti vstupu
            setInputVolume(volume) {
                this.inputVolume = volume / 100;
                if (this.gainNode) {
                    this.gainNode.gain.value = this.inputVolume * this.micBoost;
                }
            }

            // Nastavení boost mikrofonu
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
                    
                    if (this.options.onVolumeChange) {
                        this.options.onVolumeChange(this.currentVolume);
                    }
                    
                    if (this.options.onToneDetected) {
                        this.options.onToneDetected({
                            frequency: this.dominantFrequency,
                            volume: this.currentVolume,
                            note: this.frequencyToNote(this.dominantFrequency)
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

            frequencyToNote(frequency) {
                if (frequency < 80) return null;
                
                const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                const A4 = 440;
                const C0 = A4 * Math.pow(2, -4.75);
                
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

            // Úplné ukončení včetně streamu
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
                    ctx.fillStyle = '#001122';
                    ctx.fillRect(0, 0, width, height);
                    
                    const barWidth = width / this.dataArray.length * 2;
                    let x = 0;
                    
                    for (let i = 0; i < this.dataArray.length; i++) {
                        const barHeight = (this.dataArray[i] / 255) * height;
                        
                        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
                        gradient.addColorStop(0, '#00ff88');
                        gradient.addColorStop(0.5, '#0088ff');
                        gradient.addColorStop(1, '#002244');
                        
                        ctx.fillStyle = gradient;
                        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                        x += barWidth + 1;
                    }
                    
                    ctx.fillStyle = '#00ff88';
                    ctx.font = '14px monospace';
                    ctx.fillText(`${this.currentVolume}% | ${this.dominantFrequency}Hz | ${this.frequencyToNote(this.dominantFrequency) || 'N/A'}`, 10, 20);
                    
                    requestAnimationFrame(draw);
                };
                
                draw();
            }

            isRunning() { return this.isActive; }
            getVolume() { return this.currentVolume; }
            getFrequency() { return this.dominantFrequency; }
            getNote() { return this.frequencyToNote(this.dominantFrequency); }
        }

        window.ToneMeter = ToneMeter;

        document.addEventListener('DOMContentLoaded', function() {
            const DOM = {
                startBtn: document.getElementById('startBtn'),
                stopBtn: document.getElementById('stopBtn'),
                volumeValue: document.getElementById('volumeValue'),
                frequencyValue: document.getElementById('frequencyValue'),
                noteValue: document.getElementById('noteValue'),
                statusIndicator: document.getElementById('statusIndicator'),
                canvas: document.getElementById('visualizerCanvas'),
                inputVolumeSlider: document.getElementById('inputVolumeSlider'),
                inputVolumeValue: document.getElementById('inputVolumeValue'),
                micBoostSlider: document.getElementById('micBoostSlider'),
                micBoostValue: document.getElementById('micBoostValue')
            };

            if (!DOM.startBtn || !DOM.stopBtn || !DOM.volumeValue || !DOM.frequencyValue || !DOM.noteValue || !DOM.statusIndicator || !DOM.canvas) {
                console.error('ToneMeter: Některé HTML prvky chybí.');
                return;
            }

            let toneMeter = null;

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

            DOM.startBtn.addEventListener('click', async function() {
                console.log('ToneMeter: Start button clicked.');
                
                // Zkontrolujeme uložené povolení
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
                            },
                            onVolumeChange: (volume) => {
                                if (DOM.volumeValue) DOM.volumeValue.textContent = volume + '%';
                            }
                        });
                    }

                    await toneMeter.start();
                    
                    toneMeter.setInputVolume(DOM.inputVolumeSlider.value);
                    toneMeter.setMicBoost(DOM.micBoostSlider.value);
                    
                    toneMeter.createVisualizer(DOM.canvas);

                    DOM.statusIndicator.className = 'tone-meter-status active';
                    DOM.statusIndicator.textContent = '🎵 AKTIVNÍ - ANALYZUJI ZVUK';
                    DOM.startBtn.disabled = true;
                    DOM.stopBtn.disabled = false;
                } catch (error) {
                    console.error('ToneMeter: Chyba při startu:', error);
                    DOM.statusIndicator.className = 'tone-meter-status error';
                    DOM.statusIndicator.textContent = '❌ CHYBA - POVOLTE MIKROFON';
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
                    if (DOM.volumeValue) DOM.volumeValue.textContent = '0%';
                    if (DOM.frequencyValue) DOM.frequencyValue.textContent = '0 Hz';
                    if (DOM.noteValue) DOM.noteValue.textContent = '---';
                }
            });
        });
