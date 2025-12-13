/**
 * Minimal Timer Widget
 * 点击切换：开始 ↔ 暂停
 */

(function () {
    'use strict';

    let timerInterval = null;
    let elapsedTime = 0;
    let isRunning = false;

    const timerWidget = document.getElementById('timer-widget');
    const timerDisplay = document.getElementById('timer-display');
    const timerHint = document.getElementById('timer-hint');

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds]
            .map(v => v.toString().padStart(2, '0'))
            .join(':');
    }

    function updateDisplay() {
        timerDisplay.textContent = formatTime(elapsedTime);
    }

    function toggleTimer() {
        if (isRunning) {
            // 暂停
            isRunning = false;
            clearInterval(timerInterval);
            timerInterval = null;
        } else {
            // 开始
            isRunning = true;
            const startTime = Date.now() - elapsedTime;
            timerInterval = setInterval(() => {
                elapsedTime = Date.now() - startTime;
                updateDisplay();
            }, 100);
        }
    }

    timerWidget.addEventListener('click', toggleTimer);

    // 显示提示3秒后隐藏
    setTimeout(() => {
        if (timerHint) {
            timerHint.style.opacity = '0';
            setTimeout(() => timerHint.style.display = 'none', 500);
        }
    }, 3000);

    updateDisplay();
})();
