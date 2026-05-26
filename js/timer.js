/**
 * Minimal Timer Widget
 * 单击切换：开始 ↔ 暂停
 * 快速点击5次：重置计时器（不自动开始）
 */

(function () {
    'use strict';

    function initTimer() {
        let timerInterval = null;
        let elapsedTime = 0;
        let isRunning = false;

        // 快速点击检测
        let clickTimes = [];
        const QUICK_CLICK_THRESHOLD = 500; // 500ms内算快速点击
        const CLICKS_TO_RESET = 5;
        let cooldownActive = false;
        const COOLDOWN_DURATION = 300; // 重置后300ms冷却期

        const timerWidget = document.getElementById('timer-widget');
        const timerDisplay = document.getElementById('timer-display');
        const timerHint = document.getElementById('timer-hint');

        if (!timerWidget || !timerDisplay) {
            console.error('timer-widget not found');
            return;
        }
        const originalBackground = timerWidget.style.background || '';

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

        function resetTimer() {
            // 停止计时
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            isRunning = false;
            elapsedTime = 0;
            updateDisplay();

            // 显示重置提示
            timerWidget.style.background = '#ffeb3b';
            setTimeout(() => {
                timerWidget.style.background = originalBackground;
            }, 200);

            // 启动冷却期
            cooldownActive = true;
            setTimeout(() => {
                cooldownActive = false;
            }, COOLDOWN_DURATION);
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

        function handleClick() {
            const now = Date.now();

            // 记录点击时间
            clickTimes.push(now);

            // 清理过期的点击记录
            clickTimes = clickTimes.filter(t => now - t < QUICK_CLICK_THRESHOLD * CLICKS_TO_RESET);

            // 检查是否有5次快速点击
            if (clickTimes.length >= CLICKS_TO_RESET) {
                // 检查最近5次点击是否都在阈值内
                const recentClicks = clickTimes.slice(-CLICKS_TO_RESET);
                const firstClick = recentClicks[0];
                const lastClick = recentClicks[recentClicks.length - 1];

                if (lastClick - firstClick < QUICK_CLICK_THRESHOLD * (CLICKS_TO_RESET - 1)) {
                    // 触发重置
                    clickTimes = [];
                    resetTimer();
                    return;
                }
            }

            // 冷却期内不响应点击
            if (cooldownActive) {
                return;
            }

            // 正常切换
            toggleTimer();
        }

        timerWidget.addEventListener('click', handleClick);

        // 显示提示3秒后隐藏
        setTimeout(() => {
            if (timerHint) {
                timerHint.style.opacity = '0';
                setTimeout(() => timerHint.style.display = 'none', 500);
            }
        }, 3000);

        updateDisplay();
    }

    // 确保 DOM 已加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTimer);
    } else {
        initTimer();
    }
})();
