// 词忆 - 英文词典后台加载 Worker
// 在后台线程 fetch 并解析 data/englishwords-dict.js，主线程通过消息异步查询，
// 避免 6.5MB 数据的加载与解析阻塞网页交互。

let _dict = null;

self.onmessage = (e) => {
    const msg = e.data;
    if (!msg) return;

    // 加载数据文件（importScripts 后在 worker 作用域内定义 ENGLISHWORDS_DICT）
    if (msg.type === 'load') {
        try {
            self.importScripts(msg.url);
            _dict = (typeof ENGLISHWORDS_DICT !== 'undefined' && ENGLISHWORDS_DICT) ? ENGLISHWORDS_DICT : null;
            self.postMessage({ type: 'load-result', ok: !!_dict });
        } catch (err) {
            _dict = null;
            self.postMessage({ type: 'load-result', ok: false, error: String(err) });
        }
        return;
    }

    // 单词查询
    if (msg.type === 'lookup') {
        const entry = _dict ? (_dict[msg.key] || null) : null;
        self.postMessage({
            type: 'lookup-result',
            id: msg.id,
            key: msg.key,
            found: !!(entry && Array.isArray(entry)),
            entry: (entry && Array.isArray(entry)) ? entry : null
        });
    }
};