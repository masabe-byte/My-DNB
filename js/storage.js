/**
 * Storage Adapter
 * 在 Tauri 环境中使用文件存储，在浏览器中使用 localStorage
 */

(function () {
    'use strict';

    // 检测是否在 Tauri 环境中
    const isTauri = window.__TAURI__ !== undefined;

    // 内存缓存
    let cache = {
        stats: null,
        N: null,
        config: null
    };

    // 数据已加载标志
    let dataLoaded = false;
    let loadPromise = null;

    // Tauri invoke 封装
    async function tauriInvoke(cmd, args) {
        if (window.__TAURI__ && window.__TAURI__.core) {
            return await window.__TAURI__.core.invoke(cmd, args);
        }
        return null;
    }

    // 加载所有数据
    async function loadAllData() {
        if (dataLoaded) return;

        if (isTauri) {
            try {
                const [stats, N, config] = await Promise.all([
                    tauriInvoke('load_data', { filename: 'stats.json' }),
                    tauriInvoke('load_data', { filename: 'N.json' }),
                    tauriInvoke('load_data', { filename: 'config.json' })
                ]);
                cache.stats = stats;
                cache.N = N;
                cache.config = config;
            } catch (error) {
                console.error('Error loading data from files:', error);
            }
        } else {
            // 从 localStorage 加载
            try { cache.stats = JSON.parse(localStorage.getItem('stats')); } catch (e) { }
            try { cache.N = JSON.parse(localStorage.getItem('N')); } catch (e) { }
            try { cache.config = JSON.parse(localStorage.getItem('config')); } catch (e) { }
        }

        dataLoaded = true;
    }

    // 保存数据
    async function saveItem(key, value) {
        cache[key] = value;

        if (isTauri) {
            try {
                await tauriInvoke('save_data', { filename: key + '.json', data: value });
            } catch (error) {
                console.error('Error saving data to file:', error);
            }
        } else {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error('Error saving to localStorage:', e);
            }
        }
    }

    // 获取数据
    function getItem(key) {
        return cache[key];
    }

    // 删除数据
    async function removeItem(key) {
        cache[key] = null;

        if (isTauri) {
            try {
                await tauriInvoke('save_data', { filename: key + '.json', data: null });
            } catch (error) {
                console.error('Error removing data:', error);
            }
        } else {
            localStorage.removeItem(key);
        }
    }

    // 清除所有数据
    async function clearAll() {
        cache = { stats: null, N: null, config: null };

        if (isTauri) {
            await Promise.all([
                tauriInvoke('save_data', { filename: 'stats.json', data: null }),
                tauriInvoke('save_data', { filename: 'N.json', data: null }),
                tauriInvoke('save_data', { filename: 'config.json', data: null })
            ]);
        } else {
            localStorage.removeItem('stats');
            localStorage.removeItem('N');
            localStorage.removeItem('config');
        }
    }

    // 暴露到全局
    window.AppStorage = {
        isTauri: isTauri,
        loadAllData: loadAllData,
        saveItem: saveItem,
        getItem: getItem,
        removeItem: removeItem,
        clearAll: clearAll,

        // 便捷方法
        getStats: () => getItem('stats'),
        setStats: (v) => saveItem('stats', v),
        getN: () => getItem('N'),
        setN: (v) => saveItem('N', v),
        getConfig: () => getItem('config'),
        setConfig: (v) => saveItem('config', v)
    };

    // 返回加载数据的 Promise
    window.AppStorage.init = function () {
        if (!loadPromise) {
            loadPromise = loadAllData();
        }
        return loadPromise;
    };
})();
