/**
 * Storage adapter.
 * Uses Tauri commands for durable app-data files and localStorage in browsers.
 */

(function () {
    'use strict';

    const isTauri = window.__TAURI__ !== undefined;
    const allowedKeys = new Set(['stats', 'N', 'config']);

    let cache = {
        stats: null,
        N: null,
        config: null
    };

    let dataLoaded = false;
    let loadPromise = null;
    let saveQueue = Promise.resolve();

    async function tauriInvoke(cmd, args) {
        if (window.__TAURI__ && window.__TAURI__.core) {
            return await window.__TAURI__.core.invoke(cmd, args);
        }
        return null;
    }

    function filenameForKey(key) {
        if (!allowedKeys.has(key)) {
            throw new Error('Unknown storage key: ' + key);
        }
        return key + '.json';
    }

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
            try { cache.stats = JSON.parse(localStorage.getItem('stats')); } catch (e) { }
            try { cache.N = JSON.parse(localStorage.getItem('N')); } catch (e) { }
            try { cache.config = JSON.parse(localStorage.getItem('config')); } catch (e) { }
        }

        dataLoaded = true;
    }

    function enqueueSave(task) {
        saveQueue = saveQueue.then(task, task);
        return saveQueue;
    }

    async function saveItem(key, value) {
        filenameForKey(key);
        cache[key] = value;

        return enqueueSave(async function () {
            if (isTauri) {
                try {
                    return await tauriInvoke('save_data', { filename: filenameForKey(key), data: value });
                } catch (error) {
                    console.error('Error saving data to file:', error);
                    return false;
                }
            }

            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Error saving to localStorage:', e);
                return false;
            }
        });
    }

    function getItem(key) {
        filenameForKey(key);
        return cache[key];
    }

    async function removeItem(key) {
        filenameForKey(key);
        cache[key] = null;

        return enqueueSave(async function () {
            if (isTauri) {
                try {
                    return await tauriInvoke('save_data', { filename: filenameForKey(key), data: null });
                } catch (error) {
                    console.error('Error removing data:', error);
                    return false;
                }
            }

            localStorage.removeItem(key);
            return true;
        });
    }

    async function clearAll() {
        cache = { stats: null, N: null, config: null };

        return enqueueSave(async function () {
            if (isTauri) {
                return await Promise.all([
                    tauriInvoke('save_data', { filename: 'stats.json', data: null }),
                    tauriInvoke('save_data', { filename: 'N.json', data: null }),
                    tauriInvoke('save_data', { filename: 'config.json', data: null })
                ]);
            }

            localStorage.removeItem('stats');
            localStorage.removeItem('N');
            localStorage.removeItem('config');
            return true;
        });
    }

    function flush() {
        return saveQueue;
    }

    window.AppStorage = {
        isTauri: isTauri,
        loadAllData: loadAllData,
        saveItem: saveItem,
        getItem: getItem,
        removeItem: removeItem,
        clearAll: clearAll,
        flush: flush,

        getStats: () => getItem('stats'),
        setStats: (v) => saveItem('stats', v),
        getN: () => getItem('N'),
        setN: (v) => saveItem('N', v),
        getConfig: () => getItem('config'),
        setConfig: (v) => saveItem('config', v)
    };

    window.AppStorage.init = function () {
        if (!loadPromise) {
            loadPromise = loadAllData();
        }
        return loadPromise;
    };
})();
