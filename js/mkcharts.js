'use strict';

var stats = { 'games': [] };

function gaussian_smooth(a, n) {
    if (n < 0.52) return a;
    // mirror the array, with opposite sign (y-shifted to match at ends)
    // in order to preserve values at the ends.
    var mirrored = [];
    for (var i = 0; i < a.length; i++)
        mirrored.push(2 * a[0] - a[a.length - 1 - i]);
    for (var i = 0; i < a.length; i++)
        mirrored.push(a[i]);
    for (var i = 0; i < a.length; i++)
        mirrored.push(2 * a[a.length - 1] - a[a.length - 1 - i]);

    var ret = [];
    for (var i = a.length; i < 2 * a.length; i++) {
        var integral = 0;
        for (var j = 0; j < mirrored.length; j++)
            integral += Math.exp(-Math.pow((i - j), 2) / n) * mirrored[j];
        ret.push(integral / Math.sqrt(3.14159 * n)); // sqrt(pi)
    }
    return ret;
}

function updateSummaryPanel(stats) {
    var panel = document.getElementById("stats-summary");
    if (!panel) return;

    var games = stats['games'];
    if (games.length === 0) return;

    panel.style.display = 'block';

    // 总训练次数
    document.getElementById("total-games").textContent = games.length;

    // 最高等级
    var maxN = 1;
    for (var i = 0; i < games.length; i++) {
        if (games[i]['N'] > maxN) maxN = games[i]['N'];
    }
    document.getElementById("max-level").textContent = "N=" + maxN;

    // 当前等级
    try {
        var currentN = JSON.parse(localStorage.getItem("N")) || 1;
        document.getElementById("current-level").textContent = "N=" + currentN;
    } catch (err) {
        document.getElementById("current-level").textContent = "N=1";
    }

    // 平均反应时间
    var totalDelay = 0;
    var delayCount = 0;
    for (var i = 0; i < games.length; i++) {
        if (games[i].hasOwnProperty('v') && games[i]['v'] >= 1.0) {
            var vDelays = games[i]['vDelays'] || [];
            var lDelays = games[i]['lDelays'] || [];
            for (var j = 0; j < vDelays.length; j++) {
                totalDelay += vDelays[j];
                delayCount++;
            }
            for (var j = 0; j < lDelays.length; j++) {
                totalDelay += lDelays[j];
                delayCount++;
            }
        }
    }
    if (delayCount > 0) {
        var avgDelay = Math.round(totalDelay / delayCount);
        document.getElementById("avg-delay").textContent = avgDelay + "ms";
    }
}

function plot_level_v_time(stats) {
    // everyone starts at 1
    var X = [];
    var Y = [];
    var nmax = 0;
    // get N from each game. Add increment to X.
    for (var i = 0; i < stats['games'].length; i++) {
        X.push(i + 1);
        var N = stats['games'][i]['N'];
        Y.push(N);
        if (N > nmax)
            nmax = N;
    }

    if (X.length == 0)
        return false;

    try {
        var N = JSON.parse(localStorage.getItem("N"));
        X.push(X[X.length - 1] + 1);
        Y.push(N);
        if (N > nmax)
            nmax = N;
    } catch (err) { }

    document.getElementById("levelhistdiv").style.display = 'block';

    Y = gaussian_smooth(Y, Y.length / 150);
    var datas = [];
    for (var i = 0; i < X.length; i++) {
        datas.push({ 'x': X[i], 'y': Y[i] });
    }


    var ctx = document.getElementById("level_v_time").getContext("2d");
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                data: datas,
                backgroundColor: ['rgba(54, 162, 235, 0.2)'],
                borderColor: ['rgba(54, 162, 235, 1)'],
                borderWidth: 1,
                pointRadius: (datas.length < 60 ? 3 : 0)
            }],
        },
        options: {
            legend: {
                display: false
            },
            title: {
                display: false  // 标题移到HTML中
            },
            scales: {
                yAxes: [{
                    type: 'linear',
                    scaleLabel: {
                        display: true,
                        labelString: 'N等级'
                    },
                    ticks: {
                        beginAtZero: true,
                        min: 0,
                        max: nmax + 1,
                        stepSize: 1,
                        autoSkip: true
                    }
                }],
                xAxes: [{
                    type: 'linear',
                    ticks: {
                        min: 0,
                        max: X[X.length - 1] + 1,
                        autoSkip: true
                    },
                    scaleLabel: {
                        display: true,
                        labelString: '训练次数'
                    }
                }]
            }
        }
    });
    return true;
}

function plot_avg_click_delays(stats) {
    var audiodelays = [];
    var visualdelays = [];
    for (var i = 0; i < stats['games'].length; i++) {
        if (stats['games'][i].hasOwnProperty('v') && stats['games'][i]['v'] >= 1.0) {
            var N = stats['games'][i]['N'];
            while (audiodelays.length < N) {
                audiodelays.push([]);
                visualdelays.push([]);
            }
            audiodelays[N - 1] = audiodelays[N - 1].concat(stats['games'][i]['lDelays']);
            visualdelays[N - 1] = visualdelays[N - 1].concat(stats['games'][i]['vDelays']);
        }
    }

    if (audiodelays.length == 0) {
        return false;
    }

    document.getElementById("clickdelaydiv").style.display = 'block';

    var levels = []
    var meanaudiodelays = [];
    var meanvisualdelays = [];
    for (var i = 0; i < audiodelays.length; i++) {
        levels.push(i + 1);
        if (audiodelays[i].length > 0) {
            var thisamean = 0;
            for (var j = 0; j < audiodelays[i].length; j++)
                thisamean += audiodelays[i][j];
            meanaudiodelays.push(thisamean / (audiodelays[i].length));
        } else {
            meanaudiodelays.push(NaN);
        }
        if (visualdelays[i].length > 0) {
            var thisvmean = 0;
            for (var j = 0; j < visualdelays[i].length; j++)
                thisvmean += visualdelays[i][j];
            meanvisualdelays.push(thisvmean / (visualdelays[i].length));
        } else {
            meanvisualdelays.push(NaN);
        }
    }

    var ctx = document.getElementById("avg_click_delay").getContext("2d");
    var myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: levels,
            datasets: [{
                label: '听觉',
                data: meanaudiodelays,
                backgroundColor: 'rgba(54, 54, 235, 0.7)',
                borderColor: 'rgba(54, 54, 235, 1)',
                borderWidth: 1,
                pointRadius: 10
            }, {
                label: '视觉',
                data: meanvisualdelays,
                backgroundColor: 'rgba(120, 162, 54, 0.7)',
                borderColor: 'rgba(120, 162, 54, 1)',
                borderWidth: 1,
                pointRadius: 10
            }]
        },
        options: {
            title: {
                display: false  // 标题移到HTML中
            },
            scales: {
                yAxes: [{
                    type: 'linear',
                    scaleLabel: {
                        display: true,
                        labelString: '延迟（毫秒）'
                    },
                    ticks: {
                        autoSkip: true,
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    type: 'category',
                    ticks: {
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'N等级'
                    }
                }]
            }
        }
    });
    return true;
}

// 训练热力图 - 按星期和小时分布
function plot_training_heatmap(stats) {
    var games = stats['games'];
    if (games.length === 0) return false;

    // 7天 × 24小时的矩阵
    var matrix = [];
    for (var i = 0; i < 7; i++) {
        matrix.push(new Array(24).fill(0));
    }

    // 统计每个时段的训练次数
    var maxCount = 0;
    for (var i = 0; i < games.length; i++) {
        var d = new Date(games[i]['time']);
        var day = d.getDay(); // 0=周日
        var hour = d.getHours();
        matrix[day][hour]++;
        if (matrix[day][hour] > maxCount) {
            maxCount = matrix[day][hour];
        }
    }

    if (maxCount === 0) return false;

    document.getElementById("heatmapdiv").style.display = 'block';
    var grid = document.getElementById("heatmap-grid");
    grid.innerHTML = '';

    var dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

    // 小时标签行
    grid.appendChild(document.createElement('div')); // 空角落
    for (var h = 0; h < 24; h++) {
        var hourLabel = document.createElement('div');
        hourLabel.className = 'heatmap-hour';
        hourLabel.textContent = h;
        grid.appendChild(hourLabel);
    }

    // 数据行
    for (var d = 0; d < 7; d++) {
        var dayLabel = document.createElement('div');
        dayLabel.className = 'heatmap-label';
        dayLabel.textContent = dayLabels[d];
        grid.appendChild(dayLabel);

        for (var h = 0; h < 24; h++) {
            var cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            var count = matrix[d][h];
            var intensity = count / maxCount;
            var r = Math.round(255 - intensity * 200);
            var g = Math.round(255 - intensity * 100);
            var b = Math.round(255 - intensity * 200);
            cell.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
            cell.title = dayLabels[d] + ' ' + h + '时: ' + count + '次';
            grid.appendChild(cell);
        }
    }

    return true;
}

// 学习曲线 + 趋势分析
function plot_learning_curve(stats) {
    var games = stats['games'];
    if (games.length < 3) return false;

    document.getElementById("learningcurvediv").style.display = 'block';

    // 计算7局移动平均
    var movingAvg = [];
    var windowSize = Math.min(7, games.length);
    for (var i = 0; i < games.length; i++) {
        var start = Math.max(0, i - windowSize + 1);
        var sum = 0;
        for (var j = start; j <= i; j++) {
            sum += games[j]['N'];
        }
        movingAvg.push(sum / (i - start + 1));
    }

    // 计算趋势（线性回归斜率）
    var n = movingAvg.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
        sumX += i;
        sumY += movingAvg[i];
        sumXY += i * movingAvg[i];
        sumX2 += i * i;
    }
    var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // 更新趋势指示器
    var indicator = document.getElementById("trend-indicator");
    if (slope > 0.02) {
        indicator.className = 'trend-indicator trend-up';
        indicator.textContent = '↑ 进步';
    } else if (slope < -0.02) {
        indicator.className = 'trend-indicator trend-down';
        indicator.textContent = '↓ 下降';
    } else {
        indicator.className = 'trend-indicator trend-stable';
        indicator.textContent = '→ 平稳';
    }

    // 绘制图表
    var rawData = [];
    var avgData = [];
    for (var i = 0; i < games.length; i++) {
        rawData.push({ x: i + 1, y: games[i]['N'] });
        avgData.push({ x: i + 1, y: movingAvg[i] });
    }

    var ctx = document.getElementById("learning_curve").getContext("2d");
    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: '原始值',
                data: rawData,
                backgroundColor: 'rgba(200, 200, 200, 0.3)',
                borderColor: 'rgba(180, 180, 180, 0.5)',
                borderWidth: 1,
                pointRadius: 2,
                fill: false
            }, {
                label: '移动平均',
                data: avgData,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true
            }]
        },
        options: {
            legend: { display: true, position: 'bottom' },
            scales: {
                yAxes: [{ scaleLabel: { display: true, labelString: 'N等级' }, ticks: { beginAtZero: true } }],
                xAxes: [{ type: 'linear', scaleLabel: { display: true, labelString: '训练次数' } }]
            }
        }
    });

    return true;
}

// 计算变异系数
function calculateCV(delays) {
    if (delays.length < 2) return NaN;
    var sum = 0;
    for (var i = 0; i < delays.length; i++) sum += delays[i];
    var mean = sum / delays.length;
    if (mean === 0) return NaN;

    var sqDiffSum = 0;
    for (var i = 0; i < delays.length; i++) {
        sqDiffSum += Math.pow(delays[i] - mean, 2);
    }
    var std = Math.sqrt(sqDiffSum / delays.length);
    return (std / mean) * 100;
}

// 反应变异系数图表
function plot_cv_chart(stats) {
    var audioDelays = [];
    var visualDelays = [];

    for (var i = 0; i < stats['games'].length; i++) {
        var game = stats['games'][i];
        if (game.hasOwnProperty('v') && game['v'] >= 1.0) {
            var N = game['N'];
            while (audioDelays.length < N) {
                audioDelays.push([]);
                visualDelays.push([]);
            }
            audioDelays[N - 1] = audioDelays[N - 1].concat(game['lDelays'] || []);
            visualDelays[N - 1] = visualDelays[N - 1].concat(game['vDelays'] || []);
        }
    }

    if (audioDelays.length === 0) return false;

    document.getElementById("cvdiv").style.display = 'block';

    var levels = [];
    var audioCVs = [];
    var visualCVs = [];

    for (var i = 0; i < audioDelays.length; i++) {
        levels.push(i + 1);
        audioCVs.push(calculateCV(audioDelays[i]));
        visualCVs.push(calculateCV(visualDelays[i]));
    }

    var ctx = document.getElementById("cv_chart").getContext("2d");
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: levels,
            datasets: [{
                label: '听觉 CV%',
                data: audioCVs,
                backgroundColor: 'rgba(54, 54, 235, 0.7)',
                borderColor: 'rgba(54, 54, 235, 1)',
                borderWidth: 1
            }, {
                label: '视觉 CV%',
                data: visualCVs,
                backgroundColor: 'rgba(120, 162, 54, 0.7)',
                borderColor: 'rgba(120, 162, 54, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{ scaleLabel: { display: true, labelString: 'CV (%)' }, ticks: { beginAtZero: true } }],
                xAxes: [{ scaleLabel: { display: true, labelString: 'N等级' } }]
            }
        }
    });

    return true;
}

// 计算连续训练天数
function calculateStreak(stats) {
    var games = stats['games'];
    if (games.length === 0) return 0;

    var dates = [];
    for (var i = 0; i < games.length; i++) {
        var d = new Date(games[i]['time']);
        var dateStr = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        if (dates.indexOf(dateStr) === -1) dates.push(dateStr);
    }

    // 从今天开始往回数
    var streak = 0;
    var today = new Date();
    for (var i = 0; i <= dates.length; i++) {
        var checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        var checkStr = checkDate.getFullYear() + '-' + (checkDate.getMonth() + 1) + '-' + checkDate.getDate();
        if (dates.indexOf(checkStr) !== -1) {
            streak++;
        } else if (i > 0) {
            break; // 断了
        }
    }
    return streak;
}

// 计算最佳训练时段
function calculateBestTime(stats) {
    var games = stats['games'];
    if (games.length < 5) return '-';

    var hourScores = new Array(24).fill(0);
    var hourCounts = new Array(24).fill(0);

    for (var i = 0; i < games.length; i++) {
        var d = new Date(games[i]['time']);
        var hour = d.getHours();
        hourScores[hour] += games[i]['N'];
        hourCounts[hour]++;
    }

    var bestHour = -1;
    var bestAvg = 0;
    for (var h = 0; h < 24; h++) {
        if (hourCounts[h] >= 2) {
            var avg = hourScores[h] / hourCounts[h];
            if (avg > bestAvg) {
                bestAvg = avg;
                bestHour = h;
            }
        }
    }

    if (bestHour === -1) return '-';
    return bestHour + '时';
}

// 检测学习平台期
function calculatePlateau(stats) {
    var games = stats['games'];
    if (games.length < 10) return '数据不足';

    // 取最近10局
    var recent = games.slice(-10);
    var n = recent.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
        sumX += i;
        sumY += recent[i]['N'];
        sumXY += i * recent[i]['N'];
        sumX2 += i * i;
    }
    var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 0.05) return '进步中';
    if (slope < -0.05) return '下滑中';
    return '平台期';
}

// 计算干扰指数
function calculateInterferenceIndex(stats) {
    var games = stats['games'];
    if (games.length < 3) return '-';

    // 使用最近的游戏数据估算
    var totalVisHits = 0, totalVisTotal = 0;
    var totalAudHits = 0, totalAudTotal = 0;
    var gamesUsed = 0;

    for (var i = Math.max(0, games.length - 10); i < games.length; i++) {
        var game = games[i];
        if (game.hasOwnProperty('v') && game['v'] >= 1.0) {
            var vClicks = game['vClicks'] || [];
            var lClicks = game['lClicks'] || [];
            var vStack = game['vStack'] || [];
            var lStack = game['lStack'] || [];
            var N = game['N'];

            // 计算各模态命中率
            var vHits = 0, vTargets = 0;
            var lHits = 0, lTargets = 0;

            for (var j = N; j < vStack.length; j++) {
                if (vStack[j] === vStack[j - N]) {
                    vTargets++;
                    if (vClicks.indexOf(j) > -1) vHits++;
                }
                if (lStack[j] === lStack[j - N]) {
                    lTargets++;
                    if (lClicks.indexOf(j) > -1) lHits++;
                }
            }

            if (vTargets > 0) { totalVisHits += vHits; totalVisTotal += vTargets; }
            if (lTargets > 0) { totalAudHits += lHits; totalAudTotal += lTargets; }
            gamesUsed++;
        }
    }

    if (totalVisTotal === 0 || totalAudTotal === 0) return '-';

    var visRate = totalVisHits / totalVisTotal;
    var audRate = totalAudHits / totalAudTotal;
    var maxSingle = Math.max(visRate, audRate);
    var dualRate = (visRate + audRate) / 2;

    if (maxSingle === 0) return '-';

    var interference = 1 - (dualRate / maxSingle);
    return (interference * 100).toFixed(0) + '%';
}

// 疲劳曲线
function plot_fatigue_curve(stats) {
    var games = stats['games'];
    if (games.length < 5) return false;

    // 按日期分组
    var dailyGroups = {};
    for (var i = 0; i < games.length; i++) {
        var d = new Date(games[i]['time']);
        var dateStr = d.toDateString();
        if (!dailyGroups[dateStr]) dailyGroups[dateStr] = [];
        dailyGroups[dateStr].push(games[i]['N']);
    }

    // 计算每个位置的平均表现
    var maxLength = 0;
    var dates = Object.keys(dailyGroups);
    for (var i = 0; i < dates.length; i++) {
        if (dailyGroups[dates[i]].length > maxLength) {
            maxLength = dailyGroups[dates[i]].length;
        }
    }

    if (maxLength < 3) return false;

    var positionAvg = [];
    for (var pos = 0; pos < maxLength; pos++) {
        var sum = 0, count = 0;
        for (var i = 0; i < dates.length; i++) {
            if (dailyGroups[dates[i]].length > pos) {
                sum += dailyGroups[dates[i]][pos];
                count++;
            }
        }
        if (count >= 2) {
            positionAvg.push({ x: pos + 1, y: sum / count });
        }
    }

    if (positionAvg.length < 3) return false;

    document.getElementById("fatiguediv").style.display = 'block';

    var ctx = document.getElementById("fatigue_curve").getContext("2d");
    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: '平均N等级',
                data: positionAvg,
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 2,
                pointRadius: 4,
                fill: true
            }]
        },
        options: {
            legend: { display: false },
            scales: {
                yAxes: [{ scaleLabel: { display: true, labelString: 'N等级' }, ticks: { beginAtZero: true } }],
                xAxes: [{ type: 'linear', scaleLabel: { display: true, labelString: '当日第N局' } }]
            }
        }
    });

    return true;
}

// 扩展版统计摘要面板
function updateAdvancedSummary(stats) {
    var streakEl = document.getElementById("streak-days");
    var bestTimeEl = document.getElementById("best-time");
    var learningEl = document.getElementById("learning-status");
    var interferenceEl = document.getElementById("interference-index");

    if (streakEl) streakEl.textContent = calculateStreak(stats) + '天';
    if (bestTimeEl) bestTimeEl.textContent = calculateBestTime(stats);
    if (learningEl) learningEl.textContent = calculatePlateau(stats);
    if (interferenceEl) interferenceEl.textContent = calculateInterferenceIndex(stats);
}

window.onload = function () {
    try {
        stats = JSON.parse(localStorage.getItem("stats"));
    } catch (err) { }

    if (!stats || !stats['games'] || stats['games'].length === 0) {
        var noDataMsg = document.getElementById("no-data-msg");
        if (noDataMsg) noDataMsg.style.display = 'block';
    } else {
        // 更新统计摘要面板
        updateSummaryPanel(stats);
        updateAdvancedSummary(stats);
        // 绘制图表
        plot_level_v_time(stats);
        plot_avg_click_delays(stats);
        plot_training_heatmap(stats);
        plot_learning_curve(stats);
        plot_cv_chart(stats);
        plot_fatigue_curve(stats);
    }
}
