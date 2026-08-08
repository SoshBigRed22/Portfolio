// --- DOM & Canvas Elements ---
const canvas = document.getElementById('visualizer-canvas');
const ctx = canvas.getContext('2d');
const audioElement = document.getElementById('audio-player');

// --- Web Audio API Context Variables ---
let audioCtx;
let analyser;
let source;
let dataArray;
let isAudioInitialized = false;

// --- Visualizer Configuration Options ---
const CONFIG = {
    fftSize: 256,          
    blockHeight: 4,        
    blockGap: 2,           
    barGap: 5,             
    maxBlocks: 18,         
    centerGap: 4,          
    glowBlur: 12,          
    currentColor: '#ffffff',
    isRainbow: false,
    hueOffset: 0           // Cycles over time in rainbow mode
};

// 1. Resize canvas dynamically
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 2. Initialize Audio Pipeline
function initAudio() {
    if (isAudioInitialized) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = CONFIG.fftSize;
    analyser.smoothingTimeConstant = 0.82;

    source = audioCtx.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    isAudioInitialized = true;
}

// 3. Helper Function: Stack Calculation
function drawBlockStack(x, startY, activeBlocks, direction, color) {
    const totalStep = CONFIG.blockHeight + CONFIG.blockGap;

    ctx.fillStyle = color;
    ctx.shadowColor = color;

    for (let j = 0; j < activeBlocks; j++) {
        let y;
        if (direction === -1) {
            y = (startY - CONFIG.centerGap) - (j + 1) * totalStep;
        } else {
            y = (startY + CONFIG.centerGap) + j * totalStep;
        }

        ctx.fillRect(x, y, 8, CONFIG.blockHeight);
    }
}

// 4. Render Loop
function renderVisualizer() {
    requestAnimationFrame(renderVisualizer);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isAudioInitialized) return;

    analyser.getByteFrequencyData(dataArray);

    const barsPerSide = 36;
    const barWidth = 8;

    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.40; 

    ctx.shadowBlur = CONFIG.glowBlur;

    // Cycle hue smoothly frame by frame for rainbow mode
    if (CONFIG.isRainbow) {
        CONFIG.hueOffset = (CONFIG.hueOffset + 0.5) % 360;
    }

    // Center split line
    const totalHalfWidth = (barsPerSide * barWidth) + ((barsPerSide - 1) * CONFIG.barGap);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = CONFIG.isRainbow ? `hsl(${CONFIG.hueOffset}, 100%, 70%)` : CONFIG.currentColor;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillRect(centerX - totalHalfWidth, centerY - 0.5, totalHalfWidth * 2, 1);
    ctx.globalAlpha = 1.0;

    for (let i = 0; i < barsPerSide; i++) {
        let rawVal = dataArray[i];
        let normalizedVal = rawVal / 255;
        let scaledVal = Math.pow(normalizedVal, 1.25); 

        const activeBlocks = Math.floor(scaledVal * CONFIG.maxBlocks);
        
        const xOffset = i * (barWidth + CONFIG.barGap);
        const xRight = centerX + xOffset;
        const xLeft = centerX - xOffset - barWidth;

        // Determine bar color (Spectrum rainbow or single color)
        let barColor;
        if (CONFIG.isRainbow) {
            const barHue = (CONFIG.hueOffset + (i * 8)) % 360;
            barColor = `hsl(${barHue}, 100%, 65%)`;
        } else {
            barColor = CONFIG.currentColor;
        }

        // --- RIGHT SIDE ---
        drawBlockStack(xRight, centerY, activeBlocks, -1, barColor);
        drawBlockStack(xRight, centerY, activeBlocks, 1, barColor);

        // --- LEFT SIDE ---
        drawBlockStack(xLeft, centerY, activeBlocks, -1, barColor);
        drawBlockStack(xLeft, centerY, activeBlocks, 1, barColor);
    }
}

// Start animation loop
renderVisualizer();