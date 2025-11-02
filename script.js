/**
 * 专注力波浪计时器 - 核心功能实现
 * 结合番茄工作法和注意力波浪理论，实现计时、动画和提醒功能
 * 增强版：改进物理模拟、粒子系统和视觉效果
 */

// DOM元素引用
const timeLeftElement = document.getElementById('timeLeft');
const sessionTypeElement = document.getElementById('sessionType');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const focusTimeInput = document.getElementById('focusTime');
const breakTimeInput = document.getElementById('breakTime');
const waveReminderInput = document.getElementById('waveReminder');
const notificationElement = document.getElementById('notification');
const waveCanvas = document.getElementById('waveCanvas');
const ctx = waveCanvas.getContext('2d');
const particlesContainer = document.querySelector('.particles-container');
const progressBar = document.querySelector('.progress-bar');
const completionAnimation = document.querySelector('.completion-animation');
const completionText = document.getElementById('completionText');

// 计时器状态变量
let timer;
let isRunning = false;
let isPaused = false;
let isFocusMode = true;
let timeLeft = focusTimeInput.value * 60;
let totalTime = timeLeft;
let lastReminderTime = 0;

// 波浪动画变量
let waveHeight = 0;
let waveSpeed = 0.02;
let waveOffset = 0;
let waveColor = '#3498db';
let particleSystem = []; // 粒子系统数组
let lastUpdateTime = 0; // 上一次更新时间，用于性能优化
let lastAttentionBoostTime = 0; // 上次注意力提升时间
let attentionIntensity = 1.0; // 注意力强度（影响波浪效果）
let rippleEffects = []; // 波纹效果数组

/**
 * 初始化应用
 */
function initApp() {
    updateTimerDisplay();
    setupEventListeners();
    startWaveAnimation();
    initBackgroundParticles();
    updateProgressBar();
}

/**
 * 设置事件监听器 - 支持鼠标点击和触摸事件，优化移动设备体验
 */
function setupEventListeners() {
    // 为按钮同时添加点击和触摸事件，优化移动设备体验
    startBtn.addEventListener('click', startTimer);
    startBtn.addEventListener('touchstart', handleTouchEvent(startTimer));
    
    pauseBtn.addEventListener('click', pauseTimer);
    pauseBtn.addEventListener('touchstart', handleTouchEvent(pauseTimer));
    
    resetBtn.addEventListener('click', resetTimer);
    resetBtn.addEventListener('touchstart', handleTouchEvent(resetTimer));
    
    // 输入控件事件监听
    focusTimeInput.addEventListener('change', updateFocusTime);
    focusTimeInput.addEventListener('input', debounce(updateFocusTime, 300));
    
    breakTimeInput.addEventListener('change', validateBreakTime);
    breakTimeInput.addEventListener('input', debounce(validateBreakTime, 300));
    
    waveReminderInput.addEventListener('change', validateWaveReminder);
    waveReminderInput.addEventListener('input', debounce(validateWaveReminder, 300));
    
    // 波浪画布交互事件
    waveCanvas.addEventListener('click', createRippleEffect);
    waveCanvas.addEventListener('touchstart', handleTouchEvent(createRippleEffect));
    
    // 窗口大小调整时重新初始化应用
    window.addEventListener('resize', debounce(initApp, 300));
}

/**
 * 处理触摸事件的辅助函数
 * 防止触摸事件触发多次和与点击事件冲突
 * @param {Function} callback - 要执行的回调函数
 * @returns {Function} - 处理触摸事件的函数
 */
function handleTouchEvent(callback) {
    return function(e) {
        // 阻止默认行为和事件冒泡
        e.preventDefault();
        e.stopPropagation();
        
        // 执行回调函数
        callback(e);
        
        // 返回false以确保事件不会继续传播
        return false;
    };
}

/**
 * 防抖函数 - 限制函数在短时间内的执行频率
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} - 防抖后的函数
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * 创建波纹效果的函数
 * @param {Event} e - 鼠标或触摸事件
 */
function createRippleEffect(e) {
    // 获取点击位置（支持触摸和鼠标事件）
    let x, y;
    if (e.touches && e.touches.length > 0) {
        const rect = waveCanvas.getBoundingClientRect();
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.offsetX;
        y = e.offsetY;
    }
    
    // 添加波纹效果（如果应用中已有波纹系统）
    if (typeof rippleEffects !== 'undefined' && Array.isArray(rippleEffects)) {
        rippleEffects.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: Math.min(waveCanvas.width, waveCanvas.height) * 0.3,
            opacity: 0.8,
            speed: 2
        });
    }
}

/**
 * 启动计时器
 */
function startTimer() {
    if (!isRunning && !isPaused) {
        // 首次启动
        timeLeft = focusTimeInput.value * 60;
        totalTime = timeLeft;
        lastReminderTime = timeLeft;
        lastAttentionBoostTime = timeLeft;
        isFocusMode = true;
        attentionIntensity = 1.0; // 重置注意力强度
        updateSessionType();
    }
    
    if (!isRunning) {
        isRunning = true;
        isPaused = false;
        
        // 更新波浪颜色和速度以反映专注模式
        waveColor = isFocusMode ? '#e74c3c' : '#27ae60';
        waveSpeed = isFocusMode ? 0.02 : 0.04;
        
        timer = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
                updateProgressBar();
                
                // 检查是否需要波浪提醒（仅在专注模式下）
                if (isFocusMode && shouldShowWaveReminder()) {
                    showWaveReminder();
                }
                
                // 更新波浪高度反映剩余时间
                updateWaveHeight();
                
                // 模拟注意力波动（仅在专注模式下）
                if (isFocusMode) {
                    simulateAttentionFluctuation();
                }
            } else {
                // 计时结束，切换模式
                switchMode();
            }
        }, 1000);
    }
}

/**
 * 暂停计时器
 */
function pauseTimer() {
    if (isRunning) {
        clearInterval(timer);
        isRunning = false;
        isPaused = true;
        waveSpeed = 0.01; // 暂停时减缓波浪速度
    }
}

/**
 * 重置计时器
 */
function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    isPaused = false;
    isFocusMode = true;
    
    timeLeft = focusTimeInput.value * 60;
    totalTime = timeLeft;
    lastReminderTime = timeLeft;
    
    updateTimerDisplay();
    updateSessionType();
    updateProgressBar();
    
    // 重置波浪
    waveColor = '#3498db';
    waveSpeed = 0.02;
    waveHeight = 0;
    
    // 隐藏完成动画
    if (completionAnimation) {
        completionAnimation.classList.add('hidden');
    }
}

/**
 * 更新计时器显示
 */
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    timeLeftElement.textContent = `${minutes}:${seconds}`;
    
    // 更新容器类以改变颜色
    document.querySelector('.container').className = 'container ' + 
        (isFocusMode ? 'focus-mode' : 'break-mode');
}

/**
 * 更新会话类型显示
 */
function updateSessionType() {
    sessionTypeElement.textContent = isFocusMode ? '专注时间' : '休息时间';
}

/**
 * 切换专注/休息模式
 */
function switchMode() {
    isFocusMode = !isFocusMode;
    
    if (isFocusMode) {
        timeLeft = focusTimeInput.value * 60;
        lastReminderTime = timeLeft;
        lastAttentionBoostTime = timeLeft;
        attentionIntensity = 1.0; // 重置注意力强度
        rippleEffects = []; // 清空波纹效果
    } else {
        timeLeft = breakTimeInput.value * 60;
    }
    
    totalTime = timeLeft;
    updateSessionType();
    updateTimerDisplay();
    
    // 播放提示音
    playNotificationSound();
    
    // 显示通知
    showNotification(isFocusMode ? '开始专注！' : '休息一下吧！');
    
    // 显示完成动画
    showCompletionAnimation(isFocusMode ? '专注完成！' : '休息完成！');
    
    // 触发模式切换动画效果
    triggerModeTransition();
    
    // 更新波浪属性
    waveColor = isFocusMode ? '#e74c3c' : '#27ae60';
    waveSpeed = isFocusMode ? 0.02 : 0.04;
    
    // 添加模式切换粒子效果
    addModeTransitionParticles();
    
    // 添加模式切换波纹效果
    addModeTransitionRipples();
}

/**
 * 触发模式切换动画
 */
function triggerModeTransition() {
    // 添加画布闪烁效果
    const flashDuration = 300; // 毫秒
    const flashInterval = 50;   // 闪烁间隔
    let flashCount = 0;
    const maxFlashes = 3;
    
    const flashEffect = setInterval(() => {
        if (flashCount < maxFlashes) {
            // 交替设置透明度
            const isVisible = flashCount % 2 === 0;
            ctx.globalAlpha = isVisible ? 0.8 : 0.3;
            
            // 填充全屏颜色
            ctx.fillStyle = isFocusMode ? 'rgba(231, 76, 60, 0.1)' : 'rgba(39, 174, 96, 0.1)';
            ctx.fillRect(0, 0, waveCanvas.width, waveCanvas.height);
            
            ctx.globalAlpha = 1.0; // 重置透明度
            flashCount++;
        } else {
            clearInterval(flashEffect);
            // 清除画布，准备正常渲染
            ctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
        }
    }, flashInterval);
}

/**
 * 添加模式切换粒子效果
 */
function addModeTransitionParticles() {
    const particleCount = 30;
    const centerX = waveCanvas.width / 2;
    const centerY = waveCanvas.height / 2;
    
    for (let i = 0; i < particleCount; i++) {
        // 计算发射角度
        const angle = (i / particleCount) * Math.PI * 2;
        const speed = 3 + Math.random() * 3;
        
        // 创建切换粒子
        const particle = {
            x: centerX,
            y: centerY,
            size: 2 + Math.random() * 4,
            color: isFocusMode ? '#e74c3c' : '#27ae60',
            alpha: 0.7 + Math.random() * 0.3,
            life: 100 + Math.random() * 50,
            decay: 1.5 + Math.random() * 1,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            applyGravity: false
        };
        
        particleSystem.push(particle);
    }
}

/**
 * 检查是否应该显示波浪提醒
 * @returns {boolean} 是否应该显示提醒
 */
function shouldShowWaveReminder() {
    const reminderInterval = waveReminderInput.value * 60;
    return timeLeft % reminderInterval === 0 && timeLeft < lastReminderTime && timeLeft > 0;
}

/**
 * 显示波浪提醒
 */
function showWaveReminder() {
    lastReminderTime = timeLeft;
    showNotification('注意力提醒：该调整一下啦！');
    
    // 临时加快波浪动画
    const originalSpeed = waveSpeed;
    waveSpeed = 0.05;
    
    // 恢复注意力强度
    attentionIntensity = 1.0;
    lastAttentionBoostTime = timeLeft;
    
    // 添加波纹效果
    addRippleEffect();
    
    // 3秒后恢复原速度
    setTimeout(() => {
        waveSpeed = originalSpeed;
    }, 3000);
}

/**
 * 显示通知
 * @param {string} message 通知内容
 */
function showNotification(message) {
    notificationElement.textContent = message;
    notificationElement.classList.remove('hidden');
    
    // 3秒后隐藏通知
    setTimeout(() => {
        notificationElement.classList.add('hidden');
    }, 3000);
}

/**
 * 播放通知音效（简单的蜂鸣）
 */
function playNotificationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = isFocusMode ? 800 : 600; // 专注开始高音，休息开始低音
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
}

/**
 * 更新波浪高度，反映剩余时间
 */
function updateWaveHeight() {
    const percentageLeft = timeLeft / totalTime;
    // 波浪高度从0到60变化，剩余时间越少波浪越低
    // 使用缓动函数使变化更自然
    waveHeight = easeOutQuad(percentageLeft) * 60;
    
    // 根据注意力强度调整波浪高度
    waveHeight = waveHeight * attentionIntensity;
}

/**
 * 缓动函数 - 二次方缓出
 * @param {number} t - 0到1之间的值
 * @returns {number} 缓动后的值
 */
function easeOutQuad(t) {
    return t * (2 - t);
}

/**
 * 启动波浪动画
 */
function startWaveAnimation() {
    // 初始化粒子系统
    initParticleSystem();
    
    function animate(timestamp) {
        // 性能优化：限制更新频率
        if (!lastUpdateTime || timestamp - lastUpdateTime > 16) { // 约60fps
            lastUpdateTime = timestamp;
            
            ctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
            
            // 绘制渐变背景，随模式变化
            drawBackgroundGradient();
            
            // 绘制波浪
            drawWave();
            
            // 更新波浪偏移，根据状态动态调整速度
            updateWaveOffset();
            
            // 更新和绘制粒子系统
            updateAndDrawParticles();
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

/**
 * 绘制渐变背景
 */
function drawBackgroundGradient() {
    const gradient = ctx.createLinearGradient(0, 0, waveCanvas.width, waveCanvas.height);
    
    if (isFocusMode) {
        // 专注模式背景：深蓝色到浅蓝色
        gradient.addColorStop(0, isRunning && !isPaused ? 'rgba(231, 76, 60, 0.05)' : 'rgba(52, 73, 94, 0.05)');
        gradient.addColorStop(1, isRunning && !isPaused ? 'rgba(230, 126, 34, 0.05)' : 'rgba(52, 152, 219, 0.05)');
    } else {
        // 休息模式背景：绿色到青色
        gradient.addColorStop(0, 'rgba(39, 174, 96, 0.05)');
        gradient.addColorStop(1, 'rgba(26, 188, 156, 0.05)');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, waveCanvas.width, waveCanvas.height);
}

/**
 * 更新波浪偏移
 */
function updateWaveOffset() {
    // 根据时间和状态动态调整波浪速度
    let dynamicSpeed = waveSpeed;
    
    // 如果在专注模式且活跃，波浪速度会有轻微变化，模拟注意力波动
    if (isFocusMode && isRunning && !isPaused) {
        // 添加小的周期性变化
        dynamicSpeed += Math.sin(waveOffset * 0.1) * 0.002;
        // 根据注意力强度调整速度
        dynamicSpeed = dynamicSpeed * (0.8 + attentionIntensity * 0.2);
    }
    
    waveOffset += dynamicSpeed;
    
    // 更新波纹效果
    updateRippleEffects();
}

/**
 * 初始化粒子系统
 */
function initParticleSystem() {
    particleSystem = [];
}

/**
 * 更新和绘制粒子系统
 */
function updateAndDrawParticles() {
    const currentTime = Date.now();
    
    // 如果活跃，定期添加新粒子
    if (isRunning && !isPaused) {
        if (currentTime % 100 < 20) { // 约每5帧添加一次粒子
            addRandomParticles(1);
        }
    }
    
    // 更新和绘制所有粒子
    for (let i = particleSystem.length - 1; i >= 0; i--) {
        const particle = particleSystem[i];
        
        // 更新粒子位置
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // 更新粒子生命周期
        particle.life -= particle.decay;
        
        // 应用重力效果
        if (particle.applyGravity) {
            particle.vy += 0.02;
        }
        
        // 如果粒子生命周期结束，从数组中移除
        if (particle.life <= 0) {
            particleSystem.splice(i, 1);
            continue;
        }
        
        // 绘制粒子
        drawParticle(particle);
    }
    
    // 限制粒子数量，避免性能问题
    if (particleSystem.length > 100) {
        particleSystem = particleSystem.slice(-100);
    }
}

/**
 * 添加随机粒子
 * @param {number} count - 要添加的粒子数量
 */
function addRandomParticles(count) {
    const canvasWidth = waveCanvas.width;
    const canvasHeight = waveCanvas.height;
    const centerY = canvasHeight / 2;
    
    for (let i = 0; i < count; i++) {
        // 在波浪顶部附近生成粒子
        const x = Math.random() * canvasWidth;
        const phase = (x * 0.035 + waveOffset * 2.0) % (Math.PI * 2);
        const y = centerY + Math.sin(phase) * (waveHeight * 0.4) - 15;
        
        // 创建粒子对象
        const particle = {
            x: x,
            y: y,
            size: 1 + Math.random() * 3,
            color: waveColor,
            alpha: 0.4 + Math.random() * 0.3,
            life: 60 + Math.random() * 120,
            decay: 0.8 + Math.random() * 0.4,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -1 - Math.random() * 2,
            applyGravity: true
        };
        
        particleSystem.push(particle);
    }
}

/**
 * 绘制单个粒子
 * @param {Object} particle - 粒子对象
 */
function drawParticle(particle) {
    ctx.save();
    
    // 设置粒子颜色和透明度
    const color = particle.color.replace(')', `, ${particle.alpha * (particle.life / 100)})`).replace('rgb', 'rgba');
    
    ctx.fillStyle = color;
    ctx.beginPath();
    
    // 绘制圆形粒子
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 添加光晕效果
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    ctx.restore();
}

/**
 * 绘制波浪
 * 增强版：多层波浪、物理模拟、波纹效果、动态光效
 */
function drawWave() {
    const canvasWidth = waveCanvas.width;
    const canvasHeight = waveCanvas.height;
    const centerY = canvasHeight / 2;
    
    // 根据模式和时间调整波浪参数
    const baseHeight = waveHeight;
    const isActive = isRunning && !isPaused;
    
    // 根据状态动态调整波浪参数
    const waveIntensity = isActive ? 1.0 : 0.6;
    
    // 绘制底层波浪阴影（增加深度感）
    if (isActive) {
        drawWaveShadow(canvasWidth, canvasHeight, centerY, baseHeight * 0.8 * waveIntensity);
    }
    
    // 绘制多层波浪，增加层次感
    // 第一层波浪（底层）- 更宽广、移动更慢
    drawSingleWave(
        canvasWidth, 
        canvasHeight, 
        centerY, 
        baseHeight * 0.9 * waveIntensity, 
        0.012, 
        0.8, 
        getColorWithAlpha(waveColor, 0.2), 
        getColorWithAlpha(waveColor, 0.05)
    );
    
    // 第二层波浪（中层）- 中等大小和速度
    drawSingleWave(
        canvasWidth, 
        canvasHeight, 
        centerY, 
        baseHeight * 0.7 * waveIntensity, 
        0.020, 
        1.3, 
        getColorWithAlpha(waveColor, 0.35), 
        getColorWithAlpha(waveColor, 0.1)
    );
    
    // 第三层波浪（顶层）- 更小、更快，更明显
    drawSingleWave(
        canvasWidth, 
        canvasHeight, 
        centerY, 
        baseHeight * 0.5 * waveIntensity, 
        0.030, 
        1.8, 
        getColorWithAlpha(waveColor, 0.5), 
        getColorWithAlpha(waveColor, 0.2)
    );
    
    // 绘制波纹效果
    drawRippleEffects();
    
    // 绘制波浪顶部高光
    drawWaveHighlight(canvasWidth, centerY, baseHeight * 0.4 * waveIntensity);
    
    // 绘制波浪顶部边框（仅在最上层）
    drawWaveBorder(canvasWidth, centerY, baseHeight * 0.5 * waveIntensity);
    
    // 绘制波浪反射效果（增强视觉深度）
    if (isActive && baseHeight > 10) {
        drawWaveReflection(canvasWidth, canvasHeight, centerY, baseHeight * 0.3 * waveIntensity);
    }
}

/**
 * 获取带透明度的颜色
 * @param {string} color - 基础颜色
 * @param {number} alpha - 透明度（0-1）
 * @returns {string} RGBA颜色值
 */
function getColorWithAlpha(color, alpha) {
    // 如果是RGB格式
    if (color.startsWith('rgb')) {
        return color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    }
    // 如果是十六进制格式，转换为RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 绘制单个波浪层
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @param {number} centerY - Y轴中心点
 * @param {number} waveHeight - 波浪高度
 * @param {number} frequency - 波浪频率
 * @param {number} offsetMultiplier - 偏移乘数
 * @param {string} topColor - 顶部颜色
 * @param {string} bottomColor - 底部颜色
 */
function drawSingleWave(width, height, centerY, waveHeight, frequency, offsetMultiplier, topColor, bottomColor) {
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    
    // 创建波浪路径，使用物理模拟使波浪更自然
    for (let x = 0; x < width; x++) {
        // 基础波浪参数
        const baseX = x * frequency + waveOffset * offsetMultiplier;
        
        // 使用多重正弦波叠加，并添加随机性，创造更自然的波浪效果
        const mainWave = Math.sin(baseX) * waveHeight;
        
        // 次级波（更小、更快）
        const secondaryWave = Math.sin(baseX * 1.7 + 1.2) * (waveHeight * 0.3);
        
        // 三级波（最细微）
        const tertiaryWave = Math.sin(baseX * 2.5 + 0.5) * (waveHeight * 0.15);
        
        // 添加微小的随机波动，使波浪不那么规律
        const randomVariation = Math.sin(x * 0.1 + waveOffset * 0.05) * 0.5;
        
        // 添加基于注意力强度的变化
        const attentionVariation = isFocusMode && isRunning ? 
            Math.sin(baseX * 0.8) * (waveHeight * 0.05 * attentionIntensity) : 0;
        
        // 应用波纹效果的影响
        const rippleEffect = calculateRippleEffect(x, centerY);
        
        const y = centerY + mainWave + secondaryWave + tertiaryWave + randomVariation + attentionVariation + rippleEffect;
        
        // 使用贝塞尔曲线使波浪更平滑
        if (x > 0 && x < width - 1) {
            const nextX = x + 1;
            const nextBaseX = nextX * frequency + waveOffset * offsetMultiplier;
            const nextY = centerY + 
                          Math.sin(nextBaseX) * waveHeight +
                          Math.sin(nextBaseX * 1.7 + 1.2) * (waveHeight * 0.3) +
                          Math.sin(nextBaseX * 2.5 + 0.5) * (waveHeight * 0.15) +
                          Math.sin(nextX * 0.1 + waveOffset * 0.05) * 0.5 +
                          (isFocusMode && isRunning ? Math.sin(nextBaseX * 0.8) * (waveHeight * 0.05 * attentionIntensity) : 0) +
                          calculateRippleEffect(nextX, centerY);
            
            const controlPointX = (x + nextX) / 2;
            const controlPointY = (y + nextY) / 2 + Math.sin(baseX * 0.5) * 2;
            
            ctx.quadraticCurveTo(x, y, controlPointX, controlPointY);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    // 闭合路径
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    // 创建更自然的渐变填充
    const gradient = ctx.createLinearGradient(0, centerY - waveHeight * 1.5, 0, height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(0.6, interpolateColor(topColor, bottomColor, 0.5));
    gradient.addColorStop(1, bottomColor);
    
    ctx.fillStyle = gradient;
    ctx.fill();
}

/**
 * 颜色插值函数
 * @param {string} color1 - 起始颜色
 * @param {string} color2 - 结束颜色
 * @param {number} factor - 插值因子（0-1）
 * @returns {string} 插值后的颜色
 */
function interpolateColor(color1, color2, factor) {
    // 简化实现，假设颜色格式一致
    if (color1.includes('rgba') && color2.includes('rgba')) {
        const rgba1 = color1.match(/\d+/g).map(Number);
        const rgba2 = color2.match(/\d+/g).map(Number);
        
        const r = Math.round(rgba1[0] + (rgba2[0] - rgba1[0]) * factor);
        const g = Math.round(rgba1[1] + (rgba2[1] - rgba1[1]) * factor);
        const b = Math.round(rgba1[2] + (rgba2[2] - rgba1[2]) * factor);
        const a = rgba1[3] + (rgba2[3] - rgba1[3]) * factor;
        
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return color1; // 回退到原始颜色
}

/**
 * 绘制波浪顶部高光
 * @param {number} width - 画布宽度
 * @param {number} centerY - Y轴中心点
 * @param {number} waveHeight - 波浪高度
 */
function drawWaveHighlight(width, centerY, waveHeight) {
    // 仅在波浪高度足够高时绘制高光
    if (waveHeight < 5) return;
    
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
        const baseX = x * 0.030 + waveOffset * 1.8;
        const y = centerY + 
                 Math.sin(baseX) * waveHeight +
                 Math.sin(baseX * 1.7 + 1.2) * (waveHeight * 0.3) +
                 Math.sin(baseX * 2.5 + 0.5) * (waveHeight * 0.15) +
                 (isFocusMode && isRunning ? Math.sin(baseX * 0.8) * (waveHeight * 0.05 * attentionIntensity) : 0);
        
        if (x === 0) {
            ctx.moveTo(x, y - 3);
        } else {
            // 使用更平滑的线条
            const nextX = x + 1;
            const nextBaseX = nextX * 0.030 + waveOffset * 1.8;
            const nextY = centerY + 
                          Math.sin(nextBaseX) * waveHeight +
                          Math.sin(nextBaseX * 1.7 + 1.2) * (waveHeight * 0.3) +
                          Math.sin(nextBaseX * 2.5 + 0.5) * (waveHeight * 0.15) +
                          (isFocusMode && isRunning ? Math.sin(nextBaseX * 0.8) * (waveHeight * 0.05 * attentionIntensity) : 0);
            
            const controlPointX = (x + nextX) / 2;
            const controlPointY = (y + nextY) / 2 - 1;
            
            ctx.quadraticCurveTo(x, y - 3, controlPointX, controlPointY - 3);
        }
    }
    
    // 根据波浪高度动态调整高光
    const highlightAlpha = Math.min(0.7, 0.2 + waveHeight / 100);
    
    // 设置高光样式
    ctx.strokeStyle = getColorWithAlpha('white', highlightAlpha);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // 添加第二层柔和高光
    ctx.beginPath();
    for (let x = 0; x < width; x += 2) {
        const baseX = x * 0.030 + waveOffset * 1.8;
        const y = centerY + 
                 Math.sin(baseX) * waveHeight +
                 Math.sin(baseX * 1.7 + 1.2) * (waveHeight * 0.3) +
                 Math.sin(baseX * 2.5 + 0.5) * (waveHeight * 0.15) +
                 (isFocusMode && isRunning ? Math.sin(baseX * 0.8) * (waveHeight * 0.05 * attentionIntensity) : 0);
        
        if (x === 0) {
            ctx.moveTo(x, y - 5);
        } else {
            ctx.lineTo(x, y - 5);
        }
    }
    
    ctx.strokeStyle = getColorWithAlpha('white', highlightAlpha * 0.4);
    ctx.lineWidth = 5;
    ctx.stroke();
}

/**
 * 绘制波浪顶部边框
 * @param {number} width - 画布宽度
 * @param {number} centerY - Y轴中心点
 * @param {number} waveHeight - 波浪高度
 */
function drawWaveBorder(width, centerY, waveHeight) {
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
        // 与顶层波浪相同的计算，但添加微小变化
        const y = centerY + 
                 Math.sin(x * 0.030 + waveOffset * 1.8) * waveHeight +
                 Math.sin(x * 0.051 + waveOffset * 1.62) * (waveHeight * 0.3) +
                 Math.sin(x * 0.075 + waveOffset * 2.34) * (waveHeight * 0.15);
        
        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    // 设置边框样式，使用半透明效果
    ctx.strokeStyle = getColorWithAlpha(waveColor, 0.8);
    ctx.lineWidth = 2;
    
    // 使用更平滑的线条
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.stroke();
}

/**
 * 更新专注时间
 */
function updateFocusTime() {
    if (!isRunning) {
        timeLeft = focusTimeInput.value * 60;
        totalTime = timeLeft;
        updateTimerDisplay();
    }
    validateWaveReminder();
}

/**
 * 验证休息时间输入
 */
function validateBreakTime() {
    if (breakTimeInput.value < 1) breakTimeInput.value = 1;
    if (breakTimeInput.value > 30) breakTimeInput.value = 30;
}

/**
 * 验证波浪提醒间隔输入
 */
function validateWaveReminder() {
    const maxReminder = focusTimeInput.value;
    if (waveReminderInput.value > maxReminder) {
        waveReminderInput.value = maxReminder;
    }
    if (waveReminderInput.value < 1) waveReminderInput.value = 1;
}

// 窗口大小变化时调整画布
window.addEventListener('resize', () => {
    if (window.innerWidth < 500) {
        waveCanvas.width = window.innerWidth - 80;
    } else {
        waveCanvas.width = 400;
    }
});

/**
 * 模拟注意力波动（专注模式下）
 */
function simulateAttentionFluctuation() {
    // 每30秒注意力会有一定的波动
    const timeSinceLastBoost = lastAttentionBoostTime - timeLeft;
    
    if (timeSinceLastBoost > 30) {
        // 注意力随时间自然下降（使用非线性衰减）
        const decayFactor = Math.max(0.7, 1 - (timeSinceLastBoost / 300));
        attentionIntensity = Math.max(0.7, decayFactor);
    }
}

/**
 * 添加波纹效果
 */
function addRippleEffect() {
    const ripple = {
        centerX: waveCanvas.width / 2,
        centerY: waveCanvas.height / 2,
        radius: 0,
        maxRadius: Math.min(waveCanvas.width, waveCanvas.height) * 0.8,
        speed: 3,
        opacity: 1.0,
        color: getColorWithAlpha(waveColor, 0.7)
    };
    
    rippleEffects.push(ripple);
}

/**
 * 添加模式切换波纹效果
 */
function addModeTransitionRipples() {
    const rippleCount = 3;
    const centerX = waveCanvas.width / 2;
    const centerY = waveCanvas.height / 2;
    
    for (let i = 0; i < rippleCount; i++) {
        setTimeout(() => {
            const ripple = {
                centerX: centerX + (Math.random() - 0.5) * 20,
                centerY: centerY + (Math.random() - 0.5) * 20,
                radius: 0,
                maxRadius: Math.min(waveCanvas.width, waveCanvas.height) * 0.8,
                speed: 2 + i, // 每个波纹速度递增
                opacity: 0.8,
                color: getColorWithAlpha(isFocusMode ? '#e74c3c' : '#27ae60', 0.7)
            };
            
            rippleEffects.push(ripple);
        }, i * 200);
    }
}

/**
 * 更新波纹效果
 */
function updateRippleEffects() {
    for (let i = rippleEffects.length - 1; i >= 0; i--) {
        const ripple = rippleEffects[i];
        
        // 更新波纹半径
        ripple.radius += ripple.speed;
        
        // 更新透明度（随半径增加而降低）
        ripple.opacity = 1 - (ripple.radius / ripple.maxRadius);
        
        // 如果波纹超出最大半径或透明度为0，移除它
        if (ripple.radius > ripple.maxRadius || ripple.opacity <= 0) {
            rippleEffects.splice(i, 1);
        }
    }
}

/**
 * 绘制波纹效果
 */
function drawRippleEffects() {
    for (let i = 0; i < rippleEffects.length; i++) {
        const ripple = rippleEffects[i];
        
        ctx.beginPath();
        ctx.arc(ripple.centerX, ripple.centerY, ripple.radius, 0, Math.PI * 2);
        
        // 设置波纹样式
        ctx.strokeStyle = getColorWithAlpha(ripple.color, ripple.opacity);
        ctx.lineWidth = 2;
        
        ctx.stroke();
        
        // 添加内环波纹效果
        if (ripple.radius > 30) {
            ctx.beginPath();
            ctx.arc(ripple.centerX, ripple.centerY, ripple.radius * 0.7, 0, Math.PI * 2);
            ctx.strokeStyle = getColorWithAlpha(ripple.color, ripple.opacity * 0.7);
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        if (ripple.radius > 60) {
            ctx.beginPath();
            ctx.arc(ripple.centerX, ripple.centerY, ripple.radius * 0.4, 0, Math.PI * 2);
            ctx.strokeStyle = getColorWithAlpha(ripple.color, ripple.opacity * 0.5);
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

/**
 * 计算指定位置的波纹效果影响
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @returns {number} 波纹效果对该点的影响值
 */
function calculateRippleEffect(x, y) {
    let effect = 0;
    
    for (let i = 0; i < rippleEffects.length; i++) {
        const ripple = rippleEffects[i];
        
        // 计算点到波纹中心的距离
        const distance = Math.sqrt(Math.pow(x - ripple.centerX, 2) + Math.pow(y - ripple.centerY, 2));
        
        // 如果点在波纹范围内，计算影响
        if (Math.abs(distance - ripple.radius) < 15) {
            // 计算影响强度（距离波纹边缘越近，影响越大）
            const intensity = 1 - Math.abs(distance - ripple.radius) / 15;
            effect += Math.sin(distance * 0.02) * 3 * intensity * ripple.opacity;
        }
    }
    
    return effect;
}

/**
 * 绘制波浪阴影（增强深度感）
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @param {number} centerY - Y轴中心点
 * @param {number} waveHeight - 波浪高度
 */
function drawWaveShadow(width, height, centerY, waveHeight) {
    ctx.save();
    
    // 使用模糊滤镜
    ctx.filter = 'blur(10px)';
    
    ctx.beginPath();
    ctx.moveTo(0, centerY + 10);
    
    for (let x = 0; x < width; x++) {
        const baseX = x * 0.015 + waveOffset * 0.7;
        const y = centerY + 10 + 
                 Math.sin(baseX) * waveHeight +
                 Math.sin(baseX * 1.6 + 1.0) * (waveHeight * 0.25);
        
        ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    // 使用半透明黑色作为阴影
    ctx.fillStyle = getColorWithAlpha('black', 0.1);
    ctx.fill();
    
    // 重置滤镜
    ctx.filter = 'none';
    ctx.restore();
}

/**
 * 绘制波浪反射效果
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @param {number} centerY - Y轴中心点
 * @param {number} waveHeight - 波浪高度
 */
function drawWaveReflection(width, height, centerY, waveHeight) {
    ctx.save();
    
    // 仅在画布下半部分绘制反射
    if (centerY < height / 2) return;
    
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    
    for (let x = 0; x < width; x++) {
        const baseX = x * 0.030 + waveOffset * 1.8;
        // 反射效果是波浪的镜像
        const y = centerY - 
                 (Math.sin(baseX) * waveHeight +
                 Math.sin(baseX * 1.7 + 1.2) * (waveHeight * 0.3) +
                 Math.sin(baseX * 2.5 + 0.5) * (waveHeight * 0.15));
        
        ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    // 使用波浪颜色的渐变作为反射
    const gradient = ctx.createLinearGradient(0, centerY, 0, height);
    gradient.addColorStop(0, getColorWithAlpha(waveColor, 0.3));
    gradient.addColorStop(1, getColorWithAlpha(waveColor, 0));
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.restore();
}

/**
 * 更新进度条显示
 */
function updateProgressBar() {
    if (!progressBar) return;
    
    const percentage = ((totalTime - timeLeft) / totalTime) * 100;
    progressBar.style.width = `${percentage}%`;
    
    // 根据模式和状态改变进度条颜色
    if (isFocusMode) {
        progressBar.style.background = `linear-gradient(90deg, #e74c3c, #f39c12)`;
    } else {
        progressBar.style.background = `linear-gradient(90deg, #27ae60, #1abc9c)`;
    }
    
    // 暂停时添加暂停效果
    if (isPaused) {
        progressBar.style.opacity = '0.7';
    } else {
        progressBar.style.opacity = '1';
    }
}

/**
 * 初始化背景粒子效果
 */
function initBackgroundParticles() {
    if (!particlesContainer) return;
    
    const particleCount = 30; // 粒子数量
    
    for (let i = 0; i < particleCount; i++) {
        createParticle();
    }
    
    // 定期更新粒子
    setInterval(() => {
        // 移除已经消失的粒子
        const particles = particlesContainer.querySelectorAll('.particle');
        particles.forEach(particle => {
            if (particle.style.opacity <= 0) {
                particle.remove();
            }
        });
        
        // 根据需要添加新粒子
        if (particles.length < particleCount) {
            const missingCount = particleCount - particles.length;
            for (let i = 0; i < missingCount; i++) {
                createParticle();
            }
        }
    }, 500);
}

/**
 * 创建单个背景粒子
 */
function createParticle() {
    if (!particlesContainer) return;
    
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // 随机大小
    const size = Math.random() * 4 + 1;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // 随机位置
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    
    // 随机动画参数
    const duration = Math.random() * 10 + 10;
    const delay = Math.random() * 5;
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    // 随机动画路径（正弦波或直线）
    const animationType = Math.random() > 0.5 ? 'wave' : 'straight';
    
    // 设置样式
    particle.style.position = 'absolute';
    particle.style.borderRadius = '50%';
    particle.style.opacity = Math.random() * 0.5 + 0.1;
    particle.style.pointerEvents = 'none';
    particle.style.animation = animationType === 'wave' ? 
        `particleFloat ${duration}s linear infinite` : 
        `particleMove ${duration}s linear infinite`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.transform = `translateY(0px) translateX(0px)`;
    
    // 随机颜色，匹配主题
    const colors = ['rgba(231, 76, 60, 0.5)', 'rgba(52, 152, 219, 0.5)', 
                   'rgba(46, 204, 113, 0.5)', 'rgba(155, 89, 182, 0.5)'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    particlesContainer.appendChild(particle);
    
    // 添加粒子动画
    animateParticle(particle, duration, direction, animationType);
}

/**
 * 动画单个粒子
 */
function animateParticle(particle, duration, direction, type) {
    let startTime = null;
    
    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = (elapsed % (duration * 1000)) / (duration * 1000);
        
        let x, y;
        
        if (type === 'wave') {
            // 波浪运动
            x = progress * window.innerWidth * direction;
            y = Math.sin(progress * Math.PI * 4) * 50;
        } else {
            // 直线运动
            x = progress * window.innerWidth * direction;
            y = progress * 100;
        }
        
        particle.style.transform = `translate(${x}px, ${y}px)`;
        
        // 淡出效果
        particle.style.opacity = Math.sin(progress * Math.PI) * 0.4 + 0.1;
        
        requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
}

/**
 * 显示完成动画
 * @param {string} message 完成信息文本
 */
function showCompletionAnimation(message) {
    if (!completionAnimation || !completionText) return;
    
    // 设置完成文本
    completionText.textContent = message;
    
    // 移除隐藏类以显示动画
    completionAnimation.classList.remove('hidden');
    
    // 添加点击关闭功能
    function closeOnClick() {
        completionAnimation.classList.add('hidden');
        completionAnimation.removeEventListener('click', closeOnClick);
    }
    
    // 3秒后自动隐藏，或点击任何位置隐藏
    setTimeout(() => {
        completionAnimation.classList.add('hidden');
        completionAnimation.removeEventListener('click', closeOnClick);
    }, 3000);
    
    completionAnimation.addEventListener('click', closeOnClick);
}

// 添加粒子相关的CSS动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes particleFloat {
        0% { transform: translateY(0) translateX(0); opacity: 0.1; }
        25% { transform: translateY(-30px) translateX(50px); opacity: 0.4; }
        50% { transform: translateY(0) translateX(100px); opacity: 0.2; }
        75% { transform: translateY(30px) translateX(50px); opacity: 0.4; }
        100% { transform: translateY(0) translateX(0); opacity: 0.1; }
    }
    
    @keyframes particleMove {
        0% { transform: translateY(0) translateX(0); opacity: 0.1; }
        50% { opacity: 0.5; }
        100% { transform: translateY(100px) translateX(200px); opacity: 0.1; }
    }
`;
document.head.appendChild(style);

// 初始化应用
window.addEventListener('DOMContentLoaded', initApp);