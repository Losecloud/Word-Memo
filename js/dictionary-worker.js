// 词忆 - 英文词典后台加载 Worker
// 在后台线程 fetch 并解析 data/englishwords-dict.json（纯数据，不执行远程代码），
// 主线程通过消息异步查询，避免 8.8MB 数据的加载与解析阻塞网页交互。

let _dict = null;

self.onmessage = async (e) => {
    const msg = e.data;
    if (!msg) return;

    // 加载词典数据（JSON 版：fetch + JSON.parse，不用 importScripts 执行脚本）
    if (msg.type === 'load') {
        try {
            const res = await fetch(msg.url, { cache: 'no-cache' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            _dict = await res.json();
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