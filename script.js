class ChicaApp {
    constructor() {
        // Check for speech synthesis support
        if (!('speechSynthesis' in window)) {
            this.showMessage('Speech synthesis is not supported in your browser. Please try Chrome, Safari, or Edge.', 'error');
            return;
        }
        
        this.speechSynthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.voices = [];
        this.isPaused = false;
        this.audioChunks = [];
        this.mediaRecorder = null;
        this.currentText = '';
        this.isInitialized = false;
        
        console.log('ChicaApp: Initializing...');
        
        this.initializeElements();
        this.initializeEventListeners();
        
        // Load voices with retry mechanism
        this.loadVoicesWithRetry();
    }

    initializeElements() {
        // Tab elements
        this.textTab = document.getElementById('textTab');
        this.fileTab = document.getElementById('fileTab');
        this.textPanel = document.getElementById('textPanel');
        this.filePanel = document.getElementById('filePanel');
        
        // Text input elements
        this.textInput = document.getElementById('textInput');
        this.charCount = document.getElementById('charCount');
        this.clearText = document.getElementById('clearText');
        
        // File upload elements
        this.fileInput = document.getElementById('fileInput');
        this.browseBtn = document.getElementById('browseBtn');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.removeFile = document.getElementById('removeFile');
        
        // Voice settings
        this.voiceSelect = document.getElementById('voiceSelect');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.pitchSlider = document.getElementById('pitchSlider');
        this.pitchValue = document.getElementById('pitchValue');
        
        // Settings elements
        this.toggleSettings = document.getElementById('toggleSettings');
        this.settingsIcon = document.getElementById('settingsIcon');
        this.settingsContent = document.getElementById('settingsContent');
        this.maxFileSizeInput = document.getElementById('maxFileSize');
        this.chunkSizeInput = document.getElementById('chunkSize');
        this.saveSettings = document.getElementById('saveSettings');
        this.currentFileSizeLimit = document.getElementById('currentFileSizeLimit');
        this.currentChunkLimit = document.getElementById('currentChunkLimit');
        
        // Control buttons
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        // Progress section
        this.progressSection = document.getElementById('progressSection');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        
        // Upload area
        this.uploadArea = document.querySelector('.border-dashed');
        
        // Settings defaults
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.maxChunkSize = 30000;
        
        // Load saved settings
        this.loadSettings();
    }

    initializeEventListeners() {
        // Tab switching
        this.textTab.addEventListener('click', () => this.switchTab('text'));
        this.fileTab.addEventListener('click', () => this.switchTab('file'));
        
        // Text input events
        this.textInput.addEventListener('input', () => this.updateCharCount());
        this.clearText.addEventListener('click', () => this.clearTextInput());
        
        // File upload events
        this.browseBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.removeFile.addEventListener('click', () => this.removeUploadedFile());
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
        
        // Voice settings
        this.speedSlider.addEventListener('input', (e) => {
            this.speedValue.textContent = `${e.target.value}x`;
        });
        
        this.pitchSlider.addEventListener('input', (e) => {
            this.pitchValue.textContent = e.target.value;
        });
        
        // Control buttons
        this.playBtn.addEventListener('click', () => this.playAudio());
        this.pauseBtn.addEventListener('click', () => this.pauseAudio());
        this.stopBtn.addEventListener('click', () => this.stopAudio());
        this.downloadBtn.addEventListener('click', () => this.downloadMP3());
        
        // Voice loading
        this.speechSynthesis.addEventListener('voiceschanged', () => this.loadVoices());
        
        // Settings events
        this.toggleSettings.addEventListener('click', () => this.toggleSettingsPanel());
        this.saveSettings.addEventListener('click', () => this.saveSettings());
        this.maxFileSizeInput.addEventListener('change', () => this.updateLimitsDisplay());
        this.chunkSizeInput.addEventListener('change', () => this.updateLimitsDisplay());
    }

    switchTab(tab) {
        if (tab === 'text') {
            this.textTab.classList.add('text-purple-600', 'border-b-2', 'border-purple-600');
            this.textTab.classList.remove('text-gray-600');
            this.fileTab.classList.remove('text-purple-600', 'border-b-2', 'border-purple-600');
            this.fileTab.classList.add('text-gray-600');
            this.textPanel.classList.remove('hidden');
            this.filePanel.classList.add('hidden');
        } else {
            this.fileTab.classList.add('text-purple-600', 'border-b-2', 'border-purple-600');
            this.fileTab.classList.remove('text-gray-600');
            this.textTab.classList.remove('text-purple-600', 'border-b-2', 'border-purple-600');
            this.textTab.classList.add('text-gray-600');
            this.filePanel.classList.remove('hidden');
            this.textPanel.classList.add('hidden');
        }
    }

    updateCharCount() {
        const count = this.textInput.value.length;
        this.charCount.textContent = `${count} characters`;
        this.updateButtonStates();
    }

    clearTextInput() {
        this.textInput.value = '';
        this.updateCharCount();
        this.currentText = '';
        this.updateButtonStates();
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleFileDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        // Professional file validation
        const validTypes = ['application/pdf', 'application/msword', 
                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                           'text/plain'];
        
        // File size validation using configurable limit
        if (file.size > this.maxFileSize) {
            const limitMB = Math.round(this.maxFileSize / (1024 * 1024));
            this.showMessage(`File size exceeds ${limitMB}MB limit. Please choose a smaller file.`, 'error');
            return;
        }
        
        // File type validation
        if (!validTypes.includes(file.type)) {
            this.showMessage('Please upload a valid file (PDF, Word, or Text)', 'error');
            return;
        }

        // Display file info with size
        const fileSize = this.formatFileSize(file.size);
        this.fileName.innerHTML = `${file.name} <span class="text-sm text-gray-500">(${fileSize})</span>`;
        this.fileInfo.classList.remove('hidden');
        
        // Show processing progress
        this.showProgress('Processing file...');
        
        try {
            let text = '';
            
            if (file.type === 'application/pdf') {
                this.progressText.textContent = 'Extracting text from PDF...';
                text = await this.extractPDFText(file);
            } else if (file.type.includes('word')) {
                this.progressText.textContent = 'Extracting text from Word document...';
                text = await this.extractWordText(file);
            } else if (file.type === 'text/plain') {
                this.progressText.textContent = 'Reading text file...';
                text = await this.extractTextText(file);
            }
            
            // Validate extracted content
            if (!text || text.trim().length === 0) {
                throw new Error('No readable text found in the file');
            }
            
            // Show preview before applying
            this.showTextPreview(text, file.name);
            
        } catch (error) {
            this.showMessage('Error processing file: ' + error.message, 'error');
            this.hideProgress();
            this.removeUploadedFile();
        }
    }

    async extractPDFText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    let text = '';
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        text += pageText + '\n';
                    }
                    
                    resolve(text);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async extractWordText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    resolve(result.value);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async extractTextText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    removeUploadedFile() {
        this.fileInput.value = '';
        this.fileInfo.classList.add('hidden');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showTextPreview(text, fileName) {
        // Create preview modal
        const previewModal = document.createElement('div');
        previewModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        previewModal.innerHTML = `
            <div class="bg-white rounded-lg max-w-4xl max-h-[80vh] w-full overflow-hidden">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-xl font-semibold text-gray-800">Text Preview</h3>
                    <p class="text-sm text-gray-600 mt-1">File: ${fileName}</p>
                </div>
                <div class="p-6 overflow-y-auto max-h-[50vh]">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <p class="text-sm text-gray-700 whitespace-pre-wrap">${text.substring(0, 1000)}${text.length > 1000 ? '...' : ''}</p>
                        <p class="text-xs text-gray-500 mt-2">Total characters: ${text.length.toLocaleString()}</p>
                    </div>
                </div>
                <div class="p-6 border-t border-gray-200 flex justify-end space-x-3">
                    <button id="cancelPreview" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                        Cancel
                    </button>
                    <button id="acceptPreview" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        Use This Text
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(previewModal);

        // Handle button clicks
        document.getElementById('cancelPreview').addEventListener('click', () => {
            previewModal.remove();
            this.hideProgress();
            this.removeUploadedFile();
        });

        document.getElementById('acceptPreview').addEventListener('click', () => {
            this.textInput.value = text;
            this.currentText = text;
            this.updateCharCount();
            this.switchTab('text');
            previewModal.remove();
            this.hideProgress();
            this.showMessage('File processed successfully!', 'success');
        });

        // Close on background click
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                previewModal.remove();
                this.hideProgress();
                this.removeUploadedFile();
            }
        });
    }

    loadVoicesWithRetry() {
        console.log('Loading voices...');
        
        // First attempt
        this.loadVoices();
        
        // Retry mechanism for voices loading
        if (this.voices.length === 0) {
            setTimeout(() => {
                console.log('Retrying voice loading...');
                this.loadVoices();
                
                if (this.voices.length > 0) {
                    console.log('Voices loaded successfully:', this.voices.length);
                    this.isInitialized = true;
                } else {
                    console.warn('No voices available');
                    this.showMessage('No speech voices available. Please check your browser settings.', 'error');
                }
            }, 1000);
        } else {
            console.log('Voices loaded on first attempt:', this.voices.length);
            this.isInitialized = true;
        }
    }

    loadVoices() {
        this.voices = this.speechSynthesis.getVoices();
        console.log('Available voices:', this.voices.length);
        
        if (!this.voiceSelect) return;
        
        this.voiceSelect.innerHTML = '<option value="">Default Voice</option>';
        
        // Sort voices by language and name
        this.voices.sort((a, b) => {
            const langCompare = a.lang.localeCompare(b.lang);
            if (langCompare !== 0) return langCompare;
            return a.name.localeCompare(b.name);
        });
        
        this.voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${voice.name} (${voice.lang})`;
            this.voiceSelect.appendChild(option);
        });
        
        // Set default voice if available
        if (this.voices.length > 0) {
            // Try to find English voice first
            const englishVoice = this.voices.find(voice => voice.lang.startsWith('en'));
            if (englishVoice) {
                const index = this.voices.indexOf(englishVoice);
                this.voiceSelect.value = index;
                console.log('Selected English voice:', englishVoice.name);
            }
        }
    }

    updateButtonStates() {
        const hasText = this.textInput.value.trim().length > 0;
        this.playBtn.disabled = !hasText;
        this.downloadBtn.disabled = !hasText;
    }

    async playAudio() {
        const text = this.textInput.value.trim();
        if (!text) {
            this.showMessage('Please enter some text to convert to speech', 'error');
            return;
        }

        console.log('Playing audio, text length:', text.length);
        console.log('Speech synthesis available:', !!this.speechSynthesis);
        console.log('Voices available:', this.voices.length);
        console.log('Is initialized:', this.isInitialized);

        this.currentText = text;
        this.showProgress('Starting audio playback...');

        try {
            // Check if speech synthesis is ready
            if (!this.isInitialized) {
                throw new Error('Speech synthesis not initialized yet. Please wait a moment and try again.');
            }

            // Stop any current playback
            this.stopAudio();

            // Check if text needs chunking using configurable limit
            if (text.length > this.maxChunkSize) {
                console.log('Using chunked audio for long text');
                await this.playChunkedAudio(text, this.maxChunkSize);
            } else {
                console.log('Using single utterance for short text');
                await this.playSingleUtterance(text);
            }
            
        } catch (error) {
            console.error('Audio playback error:', error);
            this.showMessage('Error playing audio: ' + error.message, 'error');
            this.hideProgress();
        }
    }

    async playSingleUtterance(text, retryCount = 0) {
        return new Promise((resolve, reject) => {
            console.log('Creating utterance for text:', text.substring(0, 50) + '...');
            console.log('Retry count:', retryCount);
            
            // Check if speech synthesis is available
            if (!this.speechSynthesis) {
                reject(new Error('Speech synthesis not supported in this browser'));
                return;
            }
            
            // Cancel any ongoing speech
            this.speechSynthesis.cancel();
            
            this.currentUtterance = new SpeechSynthesisUtterance(text);
            
            // Apply voice settings with fallback logic
            let selectedVoice = null;
            if (this.voiceSelect.value && this.voices[this.voiceSelect.value]) {
                selectedVoice = this.voices[this.voiceSelect.value];
                console.log('Attempting to use voice:', selectedVoice.name);
            } else {
                // Try to find a reliable default voice
                selectedVoice = this.findReliableVoice();
                console.log('Using fallback voice:', selectedVoice ? selectedVoice.name : 'system default');
            }
            
            if (selectedVoice) {
                this.currentUtterance.voice = selectedVoice;
            }
            
            this.currentUtterance.rate = parseFloat(this.speedSlider.value);
            this.currentUtterance.pitch = parseFloat(this.pitchSlider.value);
            this.currentUtterance.volume = 1.0;
            
            console.log('Utterance settings - rate:', this.currentUtterance.rate, 'pitch:', this.currentUtterance.pitch);
            console.log('Voice used:', this.currentUtterance.voice ? this.currentUtterance.voice.name : 'default');
            
            // Set up event handlers
            this.currentUtterance.onstart = () => {
                console.log('Speech started successfully');
                this.isPaused = false;
                this.updatePlaybackButtons();
                this.hideProgress();
            };
            
            this.currentUtterance.onend = () => {
                console.log('Speech ended successfully');
                this.isPaused = false;
                this.currentUtterance = null;
                this.updatePlaybackButtons();
                resolve();
            };
            
            this.currentUtterance.onerror = async (event) => {
                console.error('Speech synthesis error:', event.error);
                this.currentUtterance = null;
                this.updatePlaybackButtons();
                
                // Retry logic for synthesis-failed errors
                if (event.error === 'synthesis-failed' && retryCount < 3) {
                    console.log('Retrying with different voice...');
                    try {
                        await this.retryWithDifferentVoice(text, retryCount + 1);
                        resolve();
                    } catch (retryError) {
                        reject(retryError);
                    }
                } else {
                    reject(new Error('Speech synthesis error: ' + event.error));
                }
            };
            
            // Start speaking immediately
            console.log('Calling speechSynthesis.speak()');
            this.speechSynthesis.speak(this.currentUtterance);
        });
    }

    findReliableVoice() {
        // Try to find a reliable voice in order of preference
        const preferences = [
            // Prefer local voices over online services
            (voice) => !voice.name.includes('Online') && voice.lang.startsWith('en'),
            // Fallback to any English voice
            (voice) => voice.lang.startsWith('en'),
            // Fallback to any voice
            () => true
        ];
        
        for (const preference of preferences) {
            const voice = this.voices.find(preference);
            if (voice) {
                console.log('Found reliable voice:', voice.name);
                return voice;
            }
        }
        
        return null;
    }

    async retryWithDifferentVoice(text, retryCount) {
        console.log('Retrying with different voice, attempt:', retryCount);
        
        // Try different voice selection strategies
        let fallbackVoice = null;
        
        switch (retryCount) {
            case 1:
                // Try a different English voice
                fallbackVoice = this.voices.find(voice => 
                    voice.lang.startsWith('en') && 
                    voice.name !== this.voiceSelect.options[this.voiceSelect.value]?.text
                );
                break;
            case 2:
                // Try the first available voice
                fallbackVoice = this.voices[0];
                break;
            case 3:
                // Try system default (no voice specified)
                fallbackVoice = null;
                break;
        }
        
        if (fallbackVoice) {
            console.log('Retrying with voice:', fallbackVoice.name);
            const tempVoice = this.voiceSelect.value;
            // Temporarily set the fallback voice
            const fallbackIndex = this.voices.indexOf(fallbackVoice);
            this.voiceSelect.value = fallbackIndex;
            
            // Try speaking with fallback voice
            await this.playSingleUtterance(text, retryCount);
            
            // Restore original voice selection
            this.voiceSelect.value = tempVoice;
        } else {
            // Try with no voice (system default)
            console.log('Retrying with system default voice');
            await this.playSingleUtterance(text, retryCount);
        }
    }

    async playChunkedAudio(text, chunkSize) {
        const chunks = this.splitTextIntoChunks(text, chunkSize);
        this.totalChunks = chunks.length;
        this.currentChunk = 0;
        
        this.showProgress(`Playing chunk 1 of ${this.totalChunks}...`);
        
        for (let i = 0; i < chunks.length; i++) {
            this.currentChunk = i + 1;
            this.progressText.textContent = `Playing chunk ${this.currentChunk} of ${this.totalChunks}...`;
            this.progressBar.style.width = `${(this.currentChunk / this.totalChunks) * 100}%`;
            
            try {
                await this.playSingleUtterance(chunks[i]);
                
                // Small delay between chunks
                if (i < chunks.length - 1) {
                    await this.delay(500);
                }
            } catch (error) {
                throw error;
            }
        }
        
        this.hideProgress();
        this.showMessage(`Completed playing ${this.totalChunks} chunks!`, 'success');
    }

    splitTextIntoChunks(text, maxChunkSize) {
        const chunks = [];
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        let currentChunk = '';
        
        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > maxChunkSize) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = sentence;
                } else {
                    // Sentence itself is too long, split by words
                    const words = sentence.split(' ');
                    let wordChunk = '';
                    
                    for (const word of words) {
                        if ((wordChunk + word).length > maxChunkSize) {
                            if (wordChunk) {
                                chunks.push(wordChunk.trim());
                                wordChunk = word;
                            } else {
                                // Single word is too long, force split
                                chunks.push(word.substring(0, maxChunkSize));
                                wordChunk = word.substring(maxChunkSize);
                            }
                        } else {
                            wordChunk += (wordChunk ? ' ' : '') + word;
                        }
                    }
                    
                    if (wordChunk) {
                        currentChunk = wordChunk;
                    }
                }
            } else {
                currentChunk += sentence;
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    toggleSettingsPanel() {
        const isHidden = this.settingsContent.classList.contains('hidden');
        
        if (isHidden) {
            this.settingsContent.classList.remove('hidden');
            this.settingsIcon.classList.remove('fa-chevron-down');
            this.settingsIcon.classList.add('fa-chevron-up');
        } else {
            this.settingsContent.classList.add('hidden');
            this.settingsIcon.classList.remove('fa-chevron-up');
            this.settingsIcon.classList.add('fa-chevron-down');
        }
    }

    loadSettings() {
        // Load settings from localStorage with error handling
        try {
            const savedSettings = localStorage.getItem('chicaSettings');
            
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.maxFileSize = settings.maxFileSize || 50 * 1024 * 1024;
                this.maxChunkSize = settings.maxChunkSize || 30000;
            }
        } catch (error) {
            console.warn('Could not load settings from localStorage:', error);
            // Use defaults if localStorage is blocked
            this.maxFileSize = 50 * 1024 * 1024;
            this.maxChunkSize = 30000;
        }
        
        // Update UI with loaded settings
        if (this.maxFileSizeInput) {
            this.maxFileSizeInput.value = Math.round(this.maxFileSize / (1024 * 1024));
        }
        if (this.chunkSizeInput) {
            this.chunkSizeInput.value = this.maxChunkSize;
        }
        this.updateLimitsDisplay();
    }

    saveSettings() {
        // Get values from inputs
        const maxFileSizeMB = parseInt(this.maxFileSizeInput.value);
        const chunkSize = parseInt(this.chunkSizeInput.value);
        
        // Validate inputs
        if (maxFileSizeMB < 1 || maxFileSizeMB > 100) {
            this.showMessage('File size limit must be between 1MB and 100MB', 'error');
            return;
        }
        
        if (chunkSize < 1000 || chunkSize > 100000) {
            this.showMessage('Chunk size must be between 1,000 and 100,000 characters', 'error');
            return;
        }
        
        // Update settings
        this.maxFileSize = maxFileSizeMB * 1024 * 1024;
        this.maxChunkSize = chunkSize;
        
        // Save to localStorage with error handling
        const settings = {
            maxFileSize: this.maxFileSize,
            maxChunkSize: this.maxChunkSize
        };
        
        try {
            localStorage.setItem('chicaSettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Could not save settings to localStorage:', error);
            // Continue even if localStorage fails
        }
        
        // Update display
        this.updateLimitsDisplay();
        
        // Show success message
        this.showMessage('Settings saved successfully!', 'success');
        
        // Close settings panel
        this.toggleSettingsPanel();
    }

    updateLimitsDisplay() {
        const maxFileSizeMB = Math.round(this.maxFileSize / (1024 * 1024));
        this.currentFileSizeLimit.textContent = `${maxFileSizeMB}MB`;
        this.currentChunkLimit.textContent = this.maxChunkSize.toLocaleString();
    }

    pauseAudio() {
        if (this.speechSynthesis.speaking && !this.speechSynthesis.paused) {
            this.speechSynthesis.pause();
            this.isPaused = true;
            this.updatePlaybackButtons();
        }
    }

    resumeAudio() {
        if (this.speechSynthesis.paused) {
            this.speechSynthesis.resume();
            this.isPaused = false;
            this.updatePlaybackButtons();
        }
    }

    stopAudio() {
        this.speechSynthesis.cancel();
        this.isPaused = false;
        this.currentUtterance = null;
        this.updatePlaybackButtons();
    }

    updatePlaybackButtons() {
        const isSpeaking = this.speechSynthesis.speaking;
        const isPaused = this.speechSynthesis.paused;
        
        this.playBtn.disabled = isSpeaking && !isPaused;
        this.pauseBtn.disabled = !isSpeaking || isPaused;
        this.stopBtn.disabled = !isSpeaking;
        
        if (isPaused) {
            this.playBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Resume';
        } else {
            this.playBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Play Audio';
        }
    }

    async downloadMP3() {
        const text = this.textInput.value.trim();
        if (!text) return;

        this.showProgress('Preparing audio download...');
        
        try {
            // Check if text needs chunking for download
            if (text.length > this.maxChunkSize) {
                await this.downloadChunkedAudio(text);
            } else {
                await this.downloadSingleAudio(text);
            }
            
        } catch (error) {
            this.showMessage('Error creating audio file: ' + error.message, 'error');
            this.hideProgress();
        }
    }

    async downloadSingleAudio(text) {
        this.progressText.textContent = 'Generating speech audio...';
        
        // Capture audio from speech synthesis
        const audioBlob = await this.captureSpeechAudio(text);
        
        this.progressText.textContent = 'Creating download file...';
        
        // Create download
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `chica-audio-${timestamp}.wav`;
        
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage('Audio file downloaded successfully!', 'success');
        this.hideProgress();
    }

    async downloadChunkedAudio(text) {
        const chunks = this.splitTextIntoChunks(text, this.maxChunkSize);
        this.totalChunks = chunks.length;
        
        this.showProgress(`Processing audio for chunk 1 of ${this.totalChunks}...`);
        
        // For chunked audio, we'll create separate files or merge them
        // For now, let's create a single file with all chunks
        
        const audioBlobs = [];
        
        for (let i = 0; i < chunks.length; i++) {
            this.currentChunk = i + 1;
            this.progressText.textContent = `Processing audio for chunk ${this.currentChunk} of ${this.totalChunks}...`;
            this.progressBar.style.width = `${(this.currentChunk / this.totalChunks) * 100}%`;
            
            try {
                const blob = await this.captureSpeechAudio(chunks[i]);
                audioBlobs.push(blob);
                
                // Small delay between chunks
                if (i < chunks.length - 1) {
                    await this.delay(100);
                }
            } catch (error) {
                throw error;
            }
        }
        
        // Merge audio blobs
        this.progressText.textContent = 'Merging audio files...';
        const mergedBlob = await this.mergeAudioBlobs(audioBlobs);
        
        // Create download
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `chica-audio-${timestamp}.wav`;
        
        const url = URL.createObjectURL(mergedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage(`Audio file downloaded successfully! (${this.totalChunks} chunks merged)`, 'success');
        this.hideProgress();
    }

    async captureSpeechAudio(text) {
        return new Promise((resolve, reject) => {
            // Create a new audio context for recording
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create media stream destination for capturing audio
            const mediaStreamDestination = audioContext.createMediaStreamDestination();
            const gainNode = audioContext.createGain();
            gainNode.connect(mediaStreamDestination);
            
            // Set up media recorder
            const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
            const audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                resolve(audioBlob);
            };
            
            mediaRecorder.onerror = (event) => {
                reject(new Error('MediaRecorder error: ' + event.error));
            };
            
            // Create utterance with current settings
            const utterance = new SpeechSynthesisUtterance(text);
            
            if (this.voiceSelect.value) {
                utterance.voice = this.voices[this.voiceSelect.value];
            }
            utterance.rate = parseFloat(this.speedSlider.value);
            utterance.pitch = parseFloat(this.pitchSlider.value);
            
            // Set up event handlers
            utterance.onstart = () => {
                mediaRecorder.start();
            };
            
            utterance.onend = () => {
                // Small delay to ensure all audio is captured
                setTimeout(() => {
                    mediaRecorder.stop();
                    audioContext.close();
                }, 500);
            };
            
            utterance.onerror = (event) => {
                reject(new Error('Speech synthesis error: ' + event.error));
            };
            
            // Start speaking
            this.speechSynthesis.speak(utterance);
        });
    }

    async mergeAudioBlobs(audioBlobs) {
        // For now, we'll concatenate the audio data
        // In a production environment, you'd want proper audio merging
        const totalLength = audioBlobs.reduce((sum, blob) => sum + blob.size, 0);
        const mergedArray = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const blob of audioBlobs) {
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            mergedArray.set(uint8Array, offset);
            offset += uint8Array.length;
        }
        
        return new Blob([mergedArray], { type: 'audio/wav' });
    }

    async generateAudioFromText(text) {
        // This is a simplified implementation
        // In production, you'd want to use a proper TTS service
        return new Promise((resolve) => {
            // Create a simple audio blob as placeholder
            // The actual implementation would require server-side processing
            // or integration with a TTS service like Google TTS or Amazon Polly
            
            // For now, we'll create a simple audio file
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const sampleRate = audioContext.sampleRate;
            const duration = Math.max(1, text.length * 0.1); // Rough estimate
            const numSamples = sampleRate * duration;
            
            const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
            const channelData = buffer.getChannelData(0);
            
            // Generate simple sine wave as placeholder
            for (let i = 0; i < numSamples; i++) {
                channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1;
            }
            
            // Convert to WAV blob (simplified)
            const wav = this.audioBufferToWav(buffer);
            const blob = new Blob([wav], { type: 'audio/wav' });
            
            resolve(blob);
        });
    }

    audioBufferToWav(buffer) {
        const length = buffer.length * buffer.numberOfChannels * 2 + 44;
        const arrayBuffer = new ArrayBuffer(length);
        const view = new DataView(arrayBuffer);
        const channels = [];
        let offset = 0;
        let pos = 0;

        // Write WAV header
        const setUint16 = (data) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };
        
        const setUint32 = (data) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };

        // RIFF identifier
        setUint32(0x46464952);
        // file length
        setUint32(length - 8);
        // WAVE identifier
        setUint32(0x45564157);
        // fmt chunk identifier
        setUint32(0x20746d66);
        // chunk length
        setUint32(16);
        // sample format (PCM)
        setUint16(1);
        // channel count
        setUint16(buffer.numberOfChannels);
        // sample rate
        setUint32(buffer.sampleRate);
        // byte rate
        setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
        // block align
        setUint16(buffer.numberOfChannels * 2);
        // bits per sample
        setUint16(16);
        // data chunk identifier
        setUint32(0x61746164);
        // data chunk length
        setUint32(length - pos - 4);

        // Write interleaved data
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        while (pos < length) {
            for (let i = 0; i < buffer.numberOfChannels; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return arrayBuffer;
    }

    showProgress(message) {
        this.progressSection.classList.remove('hidden');
        this.progressText.textContent = message;
        this.progressBar.style.width = '50%';
    }

    hideProgress() {
        this.progressSection.classList.add('hidden');
        this.progressBar.style.width = '0%';
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.success-message, .error-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
        messageDiv.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        const main = document.querySelector('main');
        main.insertBefore(messageDiv, main.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all resources are loaded
    setTimeout(() => {
        new ChicaApp();
    }, 100);
});

// Add PDF.js library for PDF processing
const pdfjsLib = window['pdfjs-dist/build/pdf'];
if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
}
