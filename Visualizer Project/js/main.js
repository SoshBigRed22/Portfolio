// --- DOM Elements ---
const fileInput = document.getElementById('audio-upload');
const audioPlayer = document.getElementById('audio-player');
const colorPicker = document.getElementById('color-picker');
const rainbowBtn = document.getElementById('rainbow-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const hideUiBtn = document.getElementById('hide-ui-btn');
const showUiBtn = document.getElementById('show-ui-btn');
const uiPanel = document.getElementById('ui-panel');

// 1. Audio Upload Handler
fileInput.addEventListener('change', function (event) {
    const files = event.target.files;
    if (files.length === 0) return;

    const file = files[0];
    const objectURL = URL.createObjectURL(file);
    
    audioPlayer.src = objectURL;
    audioPlayer.load();
    audioPlayer.play();
});

// 2. Resume Audio Context on Play
audioPlayer.addEventListener('play', () => {
    if (typeof initAudio === 'function') {
        initAudio();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
});

// 3. Custom Color Picker Event
colorPicker.addEventListener('input', (e) => {
    CONFIG.currentColor = e.target.value;
    // Turn off rainbow if user manually picks a custom color
    if (CONFIG.isRainbow) {
        CONFIG.isRainbow = false;
        rainbowBtn.classList.remove('active');
        rainbowBtn.innerText = 'Rainbow: OFF';
    }
});

// 4. Rainbow Toggle Event
rainbowBtn.addEventListener('click', () => {
    CONFIG.isRainbow = !CONFIG.isRainbow;
    if (CONFIG.isRainbow) {
        rainbowBtn.classList.add('active');
        rainbowBtn.innerText = 'Rainbow: ON';
    } else {
        rainbowBtn.classList.remove('active');
        rainbowBtn.innerText = 'Rainbow: OFF';
    }
});

// 5. Hide / Show UI Controls
hideUiBtn.addEventListener('click', () => {
    uiPanel.classList.add('hidden');
    showUiBtn.classList.remove('hidden');
});

showUiBtn.addEventListener('click', () => {
    uiPanel.classList.remove('hidden');
    showUiBtn.classList.add('hidden');
});

// 6. Fullscreen Mode Toggle
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
});