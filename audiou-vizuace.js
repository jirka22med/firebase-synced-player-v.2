 /**
         * 🚀 UNIVERZÁLNÍ TONE.METER - Minimální verze pro testování
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
                this.dataArray = null;
                this.isActive = false;
                this.currentVolume = 0;
                this.dominantFrequency = 0;
                this.animationId = null;
                
                this.init();
            }

            async init() {
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.audioContext = new AudioContext();
                    this.analyserNode = this.audioContext.createAnalyser();
                    this.analyserNode.fftSize = this.options.fftSize;
                    this.analyserNode.smoothingTimeConstant = this.options.smoothingTimeConstant;
                    this.analyserNode.minDecibels = this.options.minDecibels;
                    this.analyserNode.maxDecibels = this.options.maxDecibels;
                    this.dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
                } catch (error) {
                    console.error('ToneMeter init error:', error);
                }
            }

            async start() {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
                    });
                    
                    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
                    this.sourceNode.connect(this.analyserNode);
                    this.isActive = true;
                    this.startAnalysis();
                } catch (error) {
                    console.error('ToneMeter start error:', error);
                    throw error;
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
                }
                if (this.sourceNode) {
                    this.sourceNode.disconnect();
                }
            }

            createVisualizer(canvas) {
                const ctx = canvas.getContext('2d');
                const width = canvas.width = canvas.offsetWidth;
                const height = canvas.height = canvas.offsetHeight;
                
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

        // Export
        window.ToneMeter = ToneMeter;
     

    
     
        document.addEventListener('DOMContentLoaded', function() {
            const startBtn = document.getElementById('startBtn');
            const stopBtn = document.getElementById('stopBtn');
            const volumeValue = document.getElementById('volumeValue');
            const frequencyValue = document.getElementById('frequencyValue');
            const noteValue = document.getElementById('noteValue');
            const statusIndicator = document.getElementById('statusIndicator');
            const canvas = document.getElementById('visualizerCanvas');
            
            let toneMeter = null;
            
            startBtn.addEventListener('click', async function() {
                try {
                    toneMeter = new ToneMeter({
                        onToneDetected: (data) => {
                            frequencyValue.textContent = data.frequency + ' Hz';
                            noteValue.textContent = data.note || '---';
                        },
                        onVolumeChange: (volume) => {
                            volumeValue.textContent = volume + '%';
                        }
                    });
                    
                    await toneMeter.start();
                    toneMeter.createVisualizer(canvas);
                    
                    statusIndicator.className = 'tone-meter-status active';
                    statusIndicator.textContent = '🎵 AKTIVNÍ - ANALYZUJI ZVUK';
                    
                    startBtn.disabled = true;
                    stopBtn.disabled = false;
                    
                } catch (error) {
                    statusIndicator.className = 'tone-meter-status error';
                    statusIndicator.textContent = '❌ CHYBA - POVOLTE MIKROFON';
                }
            });
            
            stopBtn.addEventListener('click', function() {
                if (toneMeter) {
                    toneMeter.stop();
                    
                    statusIndicator.className = 'tone-meter-status inactive';
                    statusIndicator.textContent = '⏹️ ZASTAVENO';
                    
                    startBtn.disabled = false;
                    stopBtn.disabled = true;
                    
                    volumeValue.textContent = '0%';
                    frequencyValue.textContent = '0 Hz';
                    noteValue.textContent = '---';
                }
            });
        });