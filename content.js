let visualizerActive = false;
let canvas = null;
let ctx = null;
let audioContext = null;
let analyser = null;
let dataArray = null;
let bufferLength = null;
let animationId = null;
let particles = [];

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
        sendResponse({pong: true});
    } else if (request.action === 'start') {
        startVisualizer().then(() => {
            sendResponse({success: true});
        }).catch((error) => {
            console.error('Visualizer start error:', error);
            sendResponse({success: false});
        });
        return true; // 非同期レスポンス
    } else if (request.action === 'stop') {
        stopVisualizer();
        sendResponse({success: true});
    } else if (request.action === 'getStatus') {
        sendResponse({isActive: visualizerActive});
    }
});

async function startVisualizer() {
    if (visualizerActive) return;
    
    try {
        // タブの音声をキャプチャ
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });
        
        // 映像トラックは停止
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.stop();
        }
        
        // キャンバスを作成
        createCanvas();
        
        // オーディオコンテキストを初期化
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 4096;
        analyser.smoothingTimeConstant = 0.6;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        source.connect(analyser);
        
        // パーティクルを初期化
        particles = [];
        for (let i = 0; i < 50; i++) {
            particles.push(new Particle());
        }
        
        visualizerActive = true;
        animate();
        
    } catch (error) {
        console.error('Failed to start visualizer:', error);
        throw error;
    }
}

function stopVisualizer() {
    visualizerActive = false;
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
        canvas = null;
    }
    
    particles = [];
}

function createCanvas() {
    // 既存のキャンバスを削除
    if (canvas) {
        canvas.parentNode.removeChild(canvas);
    }
    
    canvas = document.createElement('canvas');
    canvas.id = 'yt-visualizer-canvas';
    canvas.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 9999 !important;
        pointer-events: none !important;
    `;
    
    document.body.appendChild(canvas);
    
    ctx = canvas.getContext('2d');
    resizeCanvas();
    
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// パーティクルクラス
class Particle {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = window.innerHeight + 20;
        this.speed = 0.5 + Math.random() * 1.5;
        this.size = 1 + Math.random() * 2;
        this.opacity = Math.random() * 0.5;
    }
    
    update() {
        this.y -= this.speed;
        if (this.y < -20) {
            this.reset();
        }
    }
    
    draw() {
        ctx.fillStyle = `rgba(100, 200, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function animate() {
    if (!visualizerActive) return;
    
    animationId = requestAnimationFrame(animate);
    
    analyser.getByteFrequencyData(dataArray);
    
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景を半透明の黒で
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, 'rgba(10, 14, 39, 0.7)');
    bgGradient.addColorStop(0.5, 'rgba(22, 33, 62, 0.7)');
    bgGradient.addColorStop(1, 'rgba(10, 14, 39, 0.7)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // パーティクルを描画
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    // バーの設定
    const samplesPerBar = 8;
    const displayBarCount = bufferLength / samplesPerBar;
    const totalWidth = canvas.width * 1.3;
    const barWidth = totalWidth / displayBarCount;
    const offsetX = -canvas.width * 0.15;
    const centerY = canvas.height / 2;
    const maxBarHeight = canvas.height / 1.0;
    
    // 平均音量を計算
    const avgVolume = dataArray.reduce((a, b) => a + b) / dataArray.length / 255;
    
    // 帯状の縦バーを描画
    for (let i = 0; i < displayBarCount; i++) {
    // samplesPerBar本分の最大値を取る
        let maxValue = 0;
        for (let j = 0; j < samplesPerBar; j++) {
            const normalized = dataArray[i * samplesPerBar + j] / 255;
            const squared = normalized * normalized;
            maxValue = Math.max(maxValue, squared);
    }
        const percent = Math.min(1.0, maxValue * 1.5);
        const barHeight = percent * maxBarHeight;
        
        const x = i * barWidth + offsetX;
        
        // 色の計算
        const hue = 180 + (i / displayBarCount) * 80;
        const lightness = 40 + percent * 40;
        const alpha = 0.6 + percent * 0.4;
        
        // グロー効果
        if (percent > 0.3) {
            ctx.shadowBlur = 20 * percent;
            ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
        }
        
        // バーの描画
        const barGradient = ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
        barGradient.addColorStop(0, `hsla(${hue}, 90%, ${lightness + 25}%, ${alpha})`);
        barGradient.addColorStop(0.5, `hsla(${hue}, 70%, ${lightness}%, ${alpha * 0.7})`);
        barGradient.addColorStop(1, `hsla(${hue}, 90%, ${lightness + 25}%, ${alpha})`);
        
        ctx.fillStyle = barGradient;
        ctx.fillRect(x, centerY - barHeight, barWidth - 0.5, barHeight * 2);
        
        // 光の効果
        if (percent > 0.5) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(percent - 0.5) * 0.4})`;
            const glowHeight = barHeight * 0.3;
            ctx.fillRect(x, centerY - glowHeight, barWidth - 0.5, glowHeight * 2);
        }
        
        ctx.shadowBlur = 0;
    }
    
    // 波エフェクト
    if (avgVolume > 0.1) {
        ctx.strokeStyle = `rgba(100, 200, 255, ${avgVolume * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let x = 0; x < canvas.width; x += 5) {
            const waveOffset = Math.sin(x * 0.01 + Date.now() * 0.002) * 30 * avgVolume;
            const y = centerY + waveOffset;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // 中央のライン
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
}
