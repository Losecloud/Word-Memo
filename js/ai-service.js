// ============================================
// AI服务模块 - 通用 AI 大模型调用
// ============================================

const AIService = {
    // API 格式（用户可在设置中选择）
    API_FORMATS: {
        OPENAI: 'openai',       // OpenAI Chat Completions 格式（默认）
        ANTHROPIC: 'anthropic'  // Anthropic Messages 格式
    },

    // API 端点：baseUrl 由用户自定义（如 https://api.openai.com/v1）
    // 仅在用户未填写时按格式给出合理默认值
    DEFAULT_BASE_URLS: {
        openai: 'https://api.openai.com/v1',
        anthropic: 'https://api.anthropic.com/v1'
    },
    
    // 模型配置：不强设默认（避免硬编码），缺省时交由 _requireModel 校验并提示用户配置
    MODEL_HINT: {
        LIGHT: '单词字段补充',
        ADVANCED: '文件识别/高级任务'
    },

    // 解析并校验调用所需的模型。未传入 model 时，尝试从全局应用读取当前选择；仍无则抛错提示用户配置
    _requireModel(model, purpose) {
        let resolved = model;
        if (!resolved) {
            try {
                // 读取全局 app 实例中用户当前选择/最近使用的模型（app.js 初始化时已挂到 window.app）
                const appInst = (typeof window !== 'undefined' && window.app) || null;
                if (appInst && typeof appInst.getLastUsedModel === 'function') {
                    resolved = appInst.getLastUsedModel();
                }
            } catch (e) { resolved = null; }
        }
        if (!resolved) {
            console.warn(`[ai-service] 未配置 AI 模型（${purpose || 'AI 调用'}）。请在设置中选择或添加自定义模型后再重试。`);
            throw new Error(`未配置 AI 模型：请在设置中选择或添加自定义模型后再使用「${purpose || 'AI 功能'}」。`);
        }
        return resolved;
    },
    
    // 分批处理配置
    BATCH_SIZE: {
        LIGHT: 30,      // 轻量模型每批处理30个单词
        ADVANCED: 50    // 高级模型每批处理50个单词
    },
    
    // 用户主动取消补缺时的专用错误标记（供上层捕获后保存已补充数据，不视为失败）
    CANCEL_ERROR: 'AI_ENRICHMENT_CANCELLED',
    
    /**
     * 调用轻量模型补充单词字段（支持分批处理）
     * @param {Array} words - 需要补充的单词列表 [{word: 'example'}, ...]
     * @param {Function} progressCallback - 进度回调函数 (current, total, percentage, message)
     * @param {Function} batchCompleteCallback - 每批完成后的回调 (enrichedBatch, batchIndex, totalBatches)
     * @param {string} model - 模型名称
     * @param {Object} [cancelToken] - 取消令牌 { cancelled: false }，设为 true 后会在批次间隙停止并抛出 CANCEL_ERROR
     * @param {Array} [fields] - 本次需要补充的字段列表，如 ['phonetic','meaning','example','category']；不传则全部字段
     * @returns {Promise<Array>} - 补充后的单词列表
     */
    async enrichWordsWithLight(words, progressCallback = null, batchCompleteCallback = null, model = null, cancelToken = null, fields = null) {
        if (!words || words.length === 0) {
            return [];
        }
        
        const totalWords = words.length;
        const batchSize = this.BATCH_SIZE.LIGHT;
        // 使用调用方传入的模型；未指定则校验/提示（不再内置硬编码模型）
        const activeModel = this._requireModel(model, this.MODEL_HINT.LIGHT);
        
        // 检查是否已取消
        const checkCancelled = () => {
            if (cancelToken && cancelToken.cancelled) {
                throw new Error(this.CANCEL_ERROR);
            }
        };
        
        // 如果单词数量少，直接处理
        if (totalWords <= batchSize) {
            checkCancelled();
            console.log(`📝 处理 ${totalWords} 个单词（无需分批）`);
            
            // 更新进度
            if (progressCallback) {
                progressCallback(0, 1, 0, '正在处理单词...');
            }
            
            const prompt = this.buildEnrichmentPrompt(words, fields);
            
            // 支持用户终止：可通过 AbortController 中断当前网络请求
            const controller = (cancelToken && typeof AbortController !== 'undefined') ? new AbortController() : null;
            if (controller) cancelToken.abortController = controller; // 暴露给上层，点击终止时可中断在途请求
            
            // 单次失败自动重试，解析失败时不直接丢失
            let enrichedWords = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                checkCancelled();
                try {
                    const result = await this.callModel(activeModel, prompt, { signal: controller ? controller.signal : undefined });
                    enrichedWords = this.parseEnrichmentResponse(result, words, fields);
                    break; // 解析成功
                } catch (error) {
                    // 用户已取消：不再重试，直接抛出取消标记
                    if (cancelToken && cancelToken.cancelled || (controller && error.name === 'AbortError')) {
                        throw new Error(this.CANCEL_ERROR);
                    }
                    console.error(`轻量模型调用失败（第 ${attempt}/3 次）:`, error);
                    if (attempt < 3) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                }
            }
            
            // 重试多次仍失败则抛出，交由上层降级处理
            if (!enrichedWords) {
                if (batchCompleteCallback) {
                    console.log('📞 调用批次完成回调（处理失败，返回原始数据）');
                    batchCompleteCallback(words, 1, 1);
                }
                throw new Error('AI 补全连续多次失败');
            }
            
            // 🔥 关键修复：即使不分批也要调用回调，让数据能被保存！
            if (batchCompleteCallback) {
                console.log('📞 调用批次完成回调（单批处理）');
                batchCompleteCallback(enrichedWords, 1, 1);
            }
            
            // 完成进度
            if (progressCallback) {
                progressCallback(1, 1, 100, '处理完成！');
            }
            
            return enrichedWords;
        }
        
        // 分批处理
        console.log(`📦 开始分批处理：共 ${totalWords} 个单词，每批 ${batchSize} 个`);
        const allEnrichedWords = [];
        const batches = Math.ceil(totalWords / batchSize);
        
        // 支持用户终止：批次内所有请求共享同一个 AbortController，可中断当前网络请求
        const controller = (cancelToken && typeof AbortController !== 'undefined') ? new AbortController() : null;
        if (controller) cancelToken.abortController = controller; // 暴露给上层，点击终止时可中断在途请求
        
        for (let i = 0; i < batches; i++) {
            checkCancelled(); // 批次间隙检查取消，便于终止时尽快退出
            
            const start = i * batchSize;
            const end = Math.min(start + batchSize, totalWords);
            const batch = words.slice(start, end);
            
            console.log(`🔄 处理第 ${i + 1}/${batches} 批（${start + 1}-${end}）`);
            
            // 更新进度
            if (progressCallback) {
                const percentage = Math.round((i / batches) * 100);
                progressCallback(i + 1, batches, percentage, `正在处理第 ${i + 1}/${batches} 批单词...`);
            }
            
            // 单批失败自动重试，避免AI输出截断等偶发问题导致整批丢失
            const maxAttempts = 3;
            let enrichedBatch = null;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                checkCancelled();
                try {
                    const prompt = this.buildEnrichmentPrompt(batch, fields);
                    const result = await this.callModel(activeModel, prompt, { signal: controller ? controller.signal : undefined });
                    enrichedBatch = this.parseEnrichmentResponse(result, batch, fields);
                    break; // 解析成功，跳出重试
                } catch (error) {
                    // 用户已取消：中断所有批次的补缺（即使请求在途也会被 AbortController 终止）
                    if (cancelToken && cancelToken.cancelled || (controller && error.name === 'AbortError')) {
                        throw new Error(this.CANCEL_ERROR);
                    }
                    console.error(`❌ 第 ${i + 1} 批处理失败（第 ${attempt}/${maxAttempts} 次）:`, error);
                    if (attempt < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1500)); // 重试前稍等，避免限流
                    }
                }
            }
            
            if (enrichedBatch) {
                allEnrichedWords.push(...enrichedBatch);
            } else {
                // 多次重试仍失败，用原始数据兜底，并明确提示用户该批缺失
                console.error(`❌ 第 ${i + 1} 批重试 ${maxAttempts} 次仍失败，本批使用原始数据（仅单词/音标，缺释义/例句）`);
                enrichedBatch = batch;
                allEnrichedWords.push(...batch);
            }
            
            // 🔥 每批完成后立即回调，实时更新表格
            if (batchCompleteCallback) {
                batchCompleteCallback(enrichedBatch, i + 1, batches);
            }
            
            // 批次之间添加短暂延迟，避免API限流
            if (i < batches - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // 完成进度
        if (progressCallback) {
            progressCallback(batches, batches, 100, '所有单词处理完成！');
        }
        
        console.log(`✅ 分批处理完成：共处理 ${allEnrichedWords.length} 个单词`);
        return allEnrichedWords;
    },
    
    /**
     * 调用高级模型识别和补充文件内容（支持分段处理）
     * @param {string} fileContent - 文件内容
     * @param {Function} progressCallback - 进度回调函数
     * @returns {Promise<Array>} - 识别并补充后的单词列表
     */
    async recognizeAndEnrichFile(fileContent, progressCallback = null, model = null) {
        // 估算文件中的单词数量（粗略估计）
        const estimatedWords = (fileContent.match(/\b[a-zA-Z]{2,}\b/g) || []).length;
        const maxWordsPerBatch = this.BATCH_SIZE.ADVANCED;
        
        console.log(`📄 文件预估包含 ${estimatedWords} 个单词`);
        
        // 如果文件较小或单词数量少，直接处理
        if (estimatedWords <= maxWordsPerBatch || fileContent.length < 5000) {
            console.log(`📝 文件较小，直接处理（无需分段）`);
            const prompt = this.buildRecognitionPrompt(fileContent);
            const activeModel = this._requireModel(model, this.MODEL_HINT.ADVANCED);
            try {
                const result = await this.callModel(activeModel, prompt);
                return this.parseRecognitionResponse(result);
            } catch (error) {
                console.error('高级模型调用失败:', error);
                throw error;
            }
        }
        
        // 分段处理大文件
        console.log(`📦 文件较大，开始分段处理`);
        const lines = fileContent.split('\n');
        const totalLines = lines.length;
        const linesPerBatch = Math.ceil(totalLines / Math.ceil(estimatedWords / maxWordsPerBatch));
        const batches = Math.ceil(totalLines / linesPerBatch);
        
        console.log(`📦 共 ${totalLines} 行，分为 ${batches} 段，每段约 ${linesPerBatch} 行`);
        
        const allWords = [];
        
        for (let i = 0; i < batches; i++) {
            const start = i * linesPerBatch;
            const end = Math.min(start + linesPerBatch, totalLines);
            const batchLines = lines.slice(start, end);
            const batchContent = batchLines.join('\n');
            
            console.log(`🔄 处理第 ${i + 1}/${batches} 段（行 ${start + 1}-${end}）`);
            
            // 更新进度
            if (progressCallback) {
                const percentage = Math.round((i / batches) * 100);
                progressCallback(i + 1, batches, percentage, `正在识别第 ${i + 1}/${batches} 段内容...`);
            }
            
            try {
                const prompt = this.buildRecognitionPrompt(batchContent);
                const activeModel = this._requireModel(model, this.MODEL_HINT.ADVANCED);
                const result = await this.callModel(activeModel, prompt);
                const batchWords = this.parseRecognitionResponse(result);
                
                if (batchWords && batchWords.length > 0) {
                    allWords.push(...batchWords);
                    console.log(`✓ 第 ${i + 1} 段识别出 ${batchWords.length} 个单词`);
                }
                
                // 批次之间添加短暂延迟
                if (i < batches - 1) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
            } catch (error) {
                console.error(`❌ 第 ${i + 1} 段处理失败:`, error);
                // 继续处理下一段
            }
        }
        
        // 完成进度
        if (progressCallback) {
            progressCallback(batches, batches, 100, '文件识别完成！');
        }
        
        console.log(`✅ 分段处理完成：共识别 ${allWords.length} 个单词`);
        
        // 去重（基于单词文本）
        const uniqueWords = [];
        const seenWords = new Set();
        for (const word of allWords) {
            const wordLower = word.word.toLowerCase();
            if (!seenWords.has(wordLower)) {
                seenWords.add(wordLower);
                uniqueWords.push(word);
            }
        }
        
        if (uniqueWords.length < allWords.length) {
            console.log(`🔄 去重：${allWords.length} → ${uniqueWords.length} 个单词`);
        }
        
        return uniqueWords;
    },
    
    /**
     * 调用AI模型API（按用户配置的 API 格式与自定义地址）
     * @param {string} modelName - 模型名称
     * @param {string} prompt - 提示词（或 options.messages 提供的完整消息数组）
     * @param {object} [options] - 额外参数（如 { max_tokens, temperature, thinking, signal, messages } ）
     * @returns {Promise<string>} - 模型返回的文本
     */
    async callModel(modelName, prompt, options) {
        // 用户配置的 API 格式（openai 默认 / anthropic）
        const format = this.getApiFormat();
        
        // 支持 AbortController 终止请求
        const signal = options && options.signal;
        
        try {
            if (format === this.API_FORMATS.ANTHROPIC) {
                return await this.callAnthropicAPI(modelName, prompt, options);
            }
            return await this.callOpenAIAPI(modelName, prompt, options);
        } catch (error) {
            console.error(`${format} API调用失败:`, error);
            
            // 用户主动取消，直接抛出（不重试、不降级）
            if (signal && error.name === 'AbortError') {
                throw error;
            }
            
            throw error;
        }
    },
    
    // 获取最终的消息数组：优先使用 options.messages（支持 system 等多轮），否则构造单条 user 消息
    _buildMessages(prompt, options) {
        if (options && Array.isArray(options.messages) && options.messages.length > 0) {
            return options.messages;
        }
        return [{ role: 'user', content: prompt }];
    },

    // 过滤模型返回中混入的思考过程内容（thinking/reasoning 标签块）
    _stripThinking(text) {
        if (!text) return text || '';
        let result = String(text);
        // 常见思考标签块：<thinking> / <reasoning> / <details> / <analysis> 等
        result = result.replace(/<(thinking|reasoning|details|analysis)[\s\S]*?<\/\1>/gi, '');
        // ```thinking 代码块形式
        result = result.replace(/```(?:thinking|reasoning)[\s\S]*?```/gi, '');
        // 清理残留的孤立标签行
        result = result.replace(/^<\/(thinking|reasoning|details|analysis)>\s*$/gim, '');
        result = result.replace(/^<(thinking|reasoning|details|analysis)>\s*$/gim, '');
        return result.trim();
    },
    
    /**
     * 调用 OpenAI Chat Completions 格式 API（兼容 OpenAI / DeepSeek / 硅基流动 等绝大多数平台）
     */
    async callOpenAIAPI(modelName, prompt, options) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('请先在设置中配置 API 密钥！\n\n请在「AI工坊设置」中填写 API 密钥（如 sk-xxxx）后重试。');
        }
        
        console.log('🤖 使用 OpenAI Chat Completions 格式调用模型:', modelName);
        
        const baseUrl = (this.getApiBaseUrl() || this.DEFAULT_BASE_URLS.openai).replace(/\/+$/, '');
        const requestData = {
            model: modelName,
            stream: false,
            max_tokens: (options && options.max_tokens) || 2000,
            temperature: (options && options.temperature != null) ? options.temperature : 0.3,
            top_p: 0.9,
            messages: this._buildMessages(prompt, options)
        };
        
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            signal: (options && options.signal) || undefined
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API调用失败: ${response.status} - ${errorText}`;
            
            // 特殊处理模型被禁用的情况
            if (response.status === 403 && errorText.includes('Model disabled')) {
                errorMessage = `模型 ${modelName} 暂时不可用。\n建议：检查平台模型列表或联系平台确认该模型的可用性。`;
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // 解析OpenAI格式的响应
        if (data.choices && data.choices.length > 0) {
            const message = data.choices[0].message || {};
            // 优先取 content（最终回答）；部分推理模型把思考过程放在 reasoning_content，这里直接忽略
            return this._stripThinking(message.content || '');
        }
        
        throw new Error('无法解析API响应（OpenAI Chat Completions 格式）');
    },
    
    /**
     * 调用 Anthropic Messages 格式 API（Claude 等）
     */
    async callAnthropicAPI(modelName, prompt, options) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('请先在设置中配置 API 密钥！\n\n请在「AI工坊设置」中填写 API 密钥（如 sk-ant-xxxx）后重试。');
        }
        
        console.log('🤖 使用 Anthropic Messages 格式调用模型:', modelName);
        
        const baseUrl = (this.getApiBaseUrl() || this.DEFAULT_BASE_URLS.anthropic).replace(/\/+$/, '');
        const requestData = {
            model: modelName,
            max_tokens: (options && options.max_tokens) || 2000,
            temperature: (options && options.temperature != null) ? options.temperature : 0.3,
            messages: this._buildMessages(prompt, options)
        };
        
        const response = await fetch(`${baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            signal: (options && options.signal) || undefined
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API调用失败: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        // 解析 Anthropic Messages 格式响应（只取 text 块，忽略 thinking 思考块）
        if (data.content && Array.isArray(data.content) && data.content.length > 0) {
            const text = data.content
                .filter(b => b && b.type === 'text')
                .map(b => b.text || '')
                .join('');
            if (text) return this._stripThinking(text);
        }
        
        throw new Error('无法解析API响应（Anthropic Messages 格式）');
    },
    
    /**
     * 提取词义分类树的全部末级分类完整路径（children 为空的节点），用于补缺时让 AI 配对场景类别
     * 按根目录分组输出（组间空行、组头标注序号），引导 AI 先定位根目录再选末级，降低长列表选错概率
     * @returns {string} 分组后的路径列表；分类数据未加载时返回空串
     */
    getLeafCategories() {
        const dict = (typeof window !== 'undefined' && window.词义分类_DICT) || null;
        if (!dict || !Array.isArray(dict.children)) return '';
        // 先收集每组的完整路径
        const walk = (nodes, path, bucket) => {
            for (const n of nodes) {
                if (!n) continue;
                const cur = path ? path + '/' + n.name : n.name;
                if (Array.isArray(n.children) && n.children.length > 0) {
                    walk(n.children, cur, bucket);
                } else {
                    bucket.push(cur);
                }
            }
        };
        const lines = [];
        for (const root of dict.children) {
            if (!root || !root.name) continue;
            const bucket = [];
            walk([root], '', bucket);
            if (bucket.length === 0) continue;
            lines.push(`[${root.code || ''} ${root.name}]`);
            lines.push(bucket.join('\n'));
            lines.push(''); // 组间空行
        }
        return lines.join('\n');
    },

    // 缓存合法分类路径集合（Set），用于校验 AI 返回的 category 是否在分类树中
    _categoryPathSet: null,

    // 缓存末级分类名 → 完整路径数组（用于旧标签按末级名迁移），避免逐个遍历全量路径
    _leafNameIndex: null,

    /**
     * 获取末级分类名到完整路径的索引（仅叶子节点）
     * @returns {Map<string, string[]>} 末级名 → 路径数组
     */
    getLeafNameIndex() {
        if (this._leafNameIndex) return this._leafNameIndex;
        const index = new Map();
        const dict = (typeof window !== 'undefined' && window.词义分类_DICT) || null;
        if (dict && Array.isArray(dict.children)) {
            const walk = (nodes, path) => {
                for (const n of nodes) {
                    if (!n || !n.name) continue;
                    const cur = path ? path + '/' + n.name : n.name;
                    if (Array.isArray(n.children) && n.children.length > 0) {
                        walk(n.children, cur);
                    } else {
                        if (!index.has(n.name)) index.set(n.name, []);
                        index.get(n.name).push(cur);
                    }
                }
            };
            walk(dict.children, '');
        }
        this._leafNameIndex = index;
        return index;
    },

    /**
     * 获取全部合法分类完整路径的集合（供校验 AI 返回的 category）
     * @returns {Set<string>} 路径集合
     */
    getCategoryPathSet() {
        if (this._categoryPathSet) return this._categoryPathSet;
        const set = new Set();
        const dict = (typeof window !== 'undefined' && window.词义分类_DICT) || null;
        if (!dict || !Array.isArray(dict.children)) return set;
        const walk = (nodes, path) => {
            for (const n of nodes) {
                if (!n) continue;
                const cur = path ? path + '/' + n.name : n.name;
                // 收集所有路径（包括非末级），因为本地打标可能匹配到任一层级
                set.add(cur);
                if (Array.isArray(n.children) && n.children.length > 0) {
                    walk(n.children, cur);
                }
            }
        };
        walk(dict.children, '');
        this._categoryPathSet = set;
        return set;
    },

    /**
     * 校验并规范化 AI 返回的场景类别：
     * - 若为合法完整路径（存在于分类树）则直接采用
     * - 若为末级名（不含 /）则尝试匹配唯一路径：唯一则替换为完整路径，歧义则保留末级名
     * - 匹配不到（AI 自创）或其余情况返回空串，绝不写入与分类树对不上的标签
     * @param {string} category - AI 返回的类别
     * @returns {string} 规范后的类别
     */
    normalizeCategory(category) {
        if (!category || typeof category !== 'string') return '';
        let cat = category.trim();
        if (cat === '') return '';
        // 清洗常见格式差异：全角斜杠 → 半角；去除斜杠两侧多余空格；空格统一处理
        cat = cat.replace(/／/g, '/').replace(/\s*\/\s*/g, '/').trim();
        const pathSet = this.getCategoryPathSet();
        if (pathSet.has(cat)) return cat;
        if (cat.includes('/')) {
            // 含 / 但不在分类树中：AI 拼造的路径，直接丢弃
            console.warn(`⚠️ 场景类别 "${category}" 不在分类树中，已丢弃`);
            return '';
        }
        // 末级名匹配：唯一路径才替换为完整路径；多个路径则保留末级名
        const matches = [...pathSet].filter(p => {
            const idx = p.lastIndexOf('/');
            return p.substring(idx + 1) === cat;
        });
        if (matches.length === 0) {
            // 匹配不到：AI 自创的分类，丢弃，避免存入与本地分类树对不上的标签
            console.warn(`⚠️ 场景类别 "${category}" 不在分类树中，已丢弃`);
            return '';
        }
        if (matches.length > 1) {
            console.warn(`⚠️ 场景类别 "${category}" 在分类树中存在多个路径，保留末级名: ${matches.join(' / ')}`);
            return cat;
        }
        return matches[0];
    },

    // 旧分类树路径 → 当前分类树的迁移映射：
    // 覆盖词典独有的学科领域标签（医学/理化/地质矿藏…），以及旧末级名在新树中重名、需按上下文消歧的路径
    legacyCategoryMap: {
        // —— 医疗与身心 ——
        // 医学/医疗为学科级旧标签，落到「伤症症状」（病名、症状占绝大多数）；
        // 释义含「药/剂」的归「诊疗药物」，避免全部堆在一级导致二级悬空
        '专业学科/医学': '医疗与身心/伤症症状',
        '基础领域/医疗': '医疗与身心/伤症症状',
        '专业学科/心理疗法': '医疗与身心/诊疗药物',
        // —— 科学与技术 ——
        '专业学科/理化/化学': '科学与技术/物理化学',
        '专业学科/化学': '科学与技术/物理化学',
        '专业学科/理化/物理': '科学与技术/物理化学',
        '专业学科/物理': '科学与技术/物理化学',
        '专业学科/生物': '科学与技术/生物科学',
        '专业学科/数学': '科学与技术/数学统计',
        '专业学科/统计': '科学与技术/数学统计',
        '专业学科/概率': '科学与技术/数学统计',
        '专业学科/几何': '科学与技术/天文几何',
        '专业学科/天文': '科学与技术/天文几何',
        '空间方位/天文': '科学与技术/天文几何',
        '专业学科/信息技术': '科学与技术/信息技术',
        '基础领域/科教': '科学与技术/校园教学',
        '基础领域/生态': '科学与技术/生态气象',
        '空间方位/气象': '科学与技术/生态气象',
        // —— 经济与产业 ——
        '基础领域/经济': '经济与产业/金融货币',
        '基础领域/经济/商业': '经济与产业/市场交易',
        '基础领域/工业': '经济与产业/工业材料',
        '专业学科/机械': '经济与产业/工业材料',
        '专业学科/冶金': '经济与产业/工业材料',
        '专业学科/材料': '经济与产业/工业材料',
        '基础领域/农业': '经济与产业/农业耕作',
        '专业学科/农学园艺': '经济与产业/农业耕作',
        '基础领域/水利': '经济与产业/能源水利',
        '基础领域/能源': '经济与产业/能源水利',
        '基础领域/建筑': '经济与产业/建筑营造',
        '专业学科/建筑': '经济与产业/建筑营造',
        // —— 空间与交通 ——
        '专业学科/地理': '空间与交通/地理地貌',
        '专业学科/地质矿藏': '空间与交通/地理地貌',
        '专业学科/测绘': '空间与交通/地理地貌',
        '空间方位/地理': '空间与交通/地理地貌',
        '空间方位/空间': '空间与交通/空间范围',
        '空间方位/范围': '空间与交通/空间范围',
        '空间方位/距离': '空间与交通/空间范围',
        '空间方位/地点': '空间与交通/空间范围',
        '空间方位/方向': '空间与交通/方位朝向',
        '空间方位/朝向': '空间与交通/方位朝向',
        '空间方位/方位': '空间与交通/方位朝向',
        '基础领域/交通': '空间与交通/道路交通',
        '基础领域/交通/航海': '空间与交通/航运航空',
        '基础领域/交通/航空': '空间与交通/航运航空',
        '位移': '空间与交通/位移开合',
        // —— 语言与沟通 ——
        '基础领域/语言': '语言与沟通/语言文字',
        '基础领域/出版': '语言与沟通/出版印刷',
        '创造艺术/印刷出版': '语言与沟通/出版印刷',
        '沟通交流/信息通讯': '语言与沟通/信息通讯',
        // —— 生活与休闲 ——
        '基础领域/体育': '生活与休闲/体育运动',
        '基础领域/宗教': '生活与休闲/宗教信仰',
        '基础领域/文艺': '生活与休闲/文史艺术',
        '基础领域/历史': '生活与休闲/文史艺术',
        '创造艺术/音乐': '生活与休闲/文史艺术',
        '创造艺术/摄影': '生活与休闲/文史艺术',
        '生活相关/服装': '生活与休闲/衣着形象',
        '生活相关/饮食相关': '生活与休闲/饮食食物',
        '家务劳动': '生活与休闲/居家生活',
        // —— 政法与军事 ——
        '基础领域/政治': '政法与军事/国家与社会',
        '基础领域/法律': '政法与军事/法规与权利',
        '基础领域/军事': '政法与军事/战争与军队',
        // —— 思维与意志 ——
        '基础领域/哲学思想': '思维与意志/认知思维',
        '判断': '思维与意志/判断寻觅',
        '寻找': '思维与意志/判断寻觅',
        '因果关系': '思维与意志/因果关系',
        '成败': '思维与意志/成败意志',
        // —— 时间与数量 ——
        '程度': '时间与数量/程度',
        '比较': '时间与数量/异同比较',
        '存在': '时间与数量/存在状态',
        '进程': '时间与数量/进程变化',
        '时间度量/频率': '时间与数量/频率周期',
        '时间度量/阶段': '时间与数量/时态阶段',
        '时间度量/时态': '时间与数量/时态阶段',
        '时间度量/其它': '时间与数量/时间安排',
        '关系': '时间与数量/范畴关系',
        '物质': '时间与数量/范畴关系',
        '秩序': '时间与数量/范畴关系',
        '界限': '时间与数量/范畴关系',
        // —— 感知与运动 ——
        '力和运动/机械运动': '感知与运动/机械运动',
        // —— 旧末级名在新树中重名，按原路径上下文消歧 ——
        '生活相关/休闲娱乐/经纪人代理人': '生活与休闲/游戏娱乐/经纪人代理人',
        '动作感官/观看发现/观看': '感知与运动/视觉观察/观看',
        '动作感官/光线相关/发光反射': '感知与运动/色彩光影/发光反射',
        '动作感官/光线相关/柔和悦目': '感知与运动/色彩光影/柔和悦目',
        '专业学科/地理/地形地貌': '空间与交通/地理地貌/地形地貌',
        '基础领域/工业/运转运行': '经济与产业/工业材料/运转运行'
    },

    /**
     * 把历史数据中的旧分类路径迁移到当前分类树
     * 依次尝试：已是合法路径 → 映射表 → 末级名唯一匹配 → 基础词典兜底
     * @param {string} category - 旧的分类路径
     * @param {string} [word] - 可选单词，用于末级名无法确定时从基础词典取新分类
     * @returns {string} 迁移后的合法路径；无法迁移则返回空串
     */
    migrateLegacyCategory(category, word) {
        if (!category || typeof category !== 'string') return '';
        const cat = category.replace(/／/g, '/').replace(/\s*\/\s*/g, '/').trim();
        if (!cat) return '';
        // 已是当前分类树的合法路径，无需迁移
        if (this.getCategoryPathSet().has(cat)) return cat;
        // 映射表命中（词典独有学科标签、重名路径消歧）
        const mapped = this.legacyCategoryMap[cat];
        if (mapped) return mapped;
        // 末级名在新树中唯一，直接替换上层路径
        const seg = cat.split('/').filter(Boolean);
        const cand = this.getLeafNameIndex().get(seg[seg.length - 1]);
        if (cand && cand.length === 1) return cand[0];
        // 兜底：基础词典已迁移到新树，取该词在词典中的分类
        if (word) {
            const dict = (typeof window !== 'undefined' && window.ENGLISHWORDS_DICT) || null;
            const entry = dict ? dict[String(word).trim().toLowerCase()] : null;
            const fromDict = entry && entry[2] ? String(entry[2]).trim() : '';
            if (fromDict && this.getCategoryPathSet().has(fromDict)) return fromDict;
        }
        // 无法迁移：返回空串，由调用方清除，避免残留对不上分类树的旧标签
        return '';
    },

    /**
     * 构建字段补充提示词
     * @param {Array} words - 需要补充的单词列表
     * @param {Array} [fields] - 本次需要补充的字段列表（['phonetic','meaning','example','category']）；不传则全部字段
     */
    buildEnrichmentPrompt(words, fields) {
        // 单词列表：带已有释义作为分类参考（word : 现有中文释义），帮助 AI 更准确配对场景类别
        const wordList = words.map(w => {
            const def = w && w.definitions && w.definitions[0] ? w.definitions[0] : {};
            const meaning = def.meaning && def.meaning.trim() !== '' && def.meaning !== '-'
                ? def.meaning.trim() : '';
            return meaning ? `${w.word}（现有释义: ${meaning}）` : w.word;
        }).join(', ');
        const categoryList = this.getLeafCategories();
        
        // 根据 fields 动态生成要求返回的字段及要求说明
        const wantPhonetic = !fields || fields.includes('phonetic');
        const wantMeaning = !fields || fields.includes('meaning');
        const wantExample = !fields || fields.includes('example');
        const wantCategory = !fields || fields.includes('category');
        
        // JSON 模板：仅包含需要返回的字段
        const tmplFields = [];
        if (wantPhonetic) tmplFields.push(`        "phonetic": "/ɪɡˈzæmpl/"`);
        if (wantMeaning) tmplFields.push(`        "meaning": "n. 例子；榜样 v. 举例说明; adj. 榜样性的 adv. 作为例证..."`);
        if (wantExample) tmplFields.push(`        "example": "Can you give me an example of what you mean?"`);
        if (wantCategory) tmplFields.push(`        "category": "政法与军事/国家与社会/朝代王国"`);
        const tmplJson = `[\n    {\n        "word": "example",\n${tmplFields.join(',\n')}\n    }\n]`;
        
        const reqFields = ['word'];
        if (wantPhonetic) reqFields.push('phonetic');
        if (wantMeaning) reqFields.push('meaning');
        if (wantExample) reqFields.push('example');
        if (wantCategory) reqFields.push('category');
        
        const fieldRules = [];
        if (wantPhonetic) fieldRules.push('3. Phonetic MUST be in IPA format with forward slashes, e.g., "/wɜːrd/"');
        if (wantMeaning) fieldRules.push('4. Meaning MUST include all part-of-speech tags (n./v./adj./adv. etc.) , but no more than 3 similar meanings for one tag.');
        if (wantExample) fieldRules.push('5. Example MUST be a natural, commonly used English sentence');
        if (wantCategory) fieldRules.push(`8. "category" MUST be copied VERBATIM (character-for-character) from the category list below - the complete path from root to the leaf, e.g. "科学与技术/生物科学/具体动物", with "/" separators. First decide which root group ([01]~[10]) the word belongs to, then pick ONE category from that group. STRICTLY FORBIDDEN to invent, create, merge, rephrase or shorten any category name. If you cannot find an exact match, use an empty string "" (never invent one).`);
        
        const categorySection = wantCategory
            ? `Scene category list (grouped by root category [01]~[10], groups separated by blank lines). For each word:
1. Determine its primary meaning's root group.
2. Pick the single most fitting FULL PATH from that group's lines, copying it verbatim.
3. If nothing fits, return "".
Each line is a complete path; the full path reveals context, e.g. "科学与技术/生物科学/动物" vs "经济与产业/渔牧养殖/捕驯动物" are different categories.
${categoryList || '(无分类数据)'}`
            : '';
        
        return `You are a professional English dictionary assistant. For each word provided, you must return its phonetic transcription (IPA), Chinese meaning, an example sentence, and a scene category.

Words to process: ${wordList}

IMPORTANT: You MUST return a valid JSON array with this EXACT structure for each word:
${tmplJson}

Critical Requirements:
1. Return ONLY the JSON array, no markdown code blocks, no explanations, no other text
2. Each word MUST have the following fields: ${reqFields.join(', ')}
${fieldRules.join('\n')}
6. Process ALL ${words.length} words in the list above
7. The JSON must be properly formatted and parseable

${categorySection}

Start your response with [ and end with ]. Do not include any text before or after the JSON array.

[`;
    },
    
    /**
     * 构建文件识别提示词
     */
    buildRecognitionPrompt(fileContent) {
        return `You are a professional English vocabulary file parser. Please analyze the following file content and extract English vocabulary data, then supplement any missing information.

File Content:
${fileContent.substring(0, 2000)} ${fileContent.length > 2000 ? '...(truncated)' : ''}

Please:
1. Identify all English words/vocabulary in the file
2. For each word, provide:
   - word: the English word
   - phonetic: IPA phonetic transcription
   - meaning: Chinese meaning (including part of speech like n./v./adj./adv.)
   - example: a natural example sentence

Return the result in JSON format:
[
    {
        "word": "example",
        "phonetic": "/ɪɡˈzæmpl/",
        "meaning": "n. 例子；榜样 v. 举例说明",
        "example": "Can you give me an example of what you mean?"
    }
]

Requirements:
1. Extract ALL vocabulary words from the file
2. Supplement missing fields (phonetic/meaning/example) for each word
3. Return ONLY the JSON array, no other text
4. Ensure the JSON is valid and properly formatted

JSON:`;
    },
    
    /**
     * 尝试修复被截断/不完整的 JSON 数组（AI 输出达到长度上限或异常中断时常见）
     * @param {string} str - AI 返回的原始文本
     * @returns {Array|null} 修复成功返回解析出的数组，失败返回 null
     */
    repairTruncatedJSON(str) {
        if (!str || typeof str !== 'string') return null;
        const s = str.trim();
        if (!s.startsWith('[')) return null;

        // 从末尾向前找最后一个完整对象"}"，丢弃其后被截断的内容
        const lastBrace = s.lastIndexOf('}');
        if (lastBrace < 0) return null;

        // 截取到最后一个"}"，去掉末尾残留的逗号，再补上闭合的"]"
        let candidate = s.slice(0, lastBrace + 1);
        candidate = candidate.replace(/,\s*$/, '') + ']';

        try {
            const data = JSON.parse(candidate);
            return Array.isArray(data) ? data : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * 解析字段补充响应
     * @param {string} response - AI 返回的原始文本
     * @param {Array} originalWords - 原始单词列表
     * @param {Array} [fields] - 本次勾选要更新的字段（['phonetic','meaning','example','category']）；
     *                           不传表示默认全部字段（沿用旧行为：本地已有优先，AI 仅补缺失）；
     *                           传入则被勾选的字段以 AI 结果优先（用于"数据完整时强制更新选中列"），未勾选字段保留原值
     */
    parseEnrichmentResponse(response, originalWords, fields) {
        try {
            console.log('🔍 开始解析AI响应...');
            console.log('📥 AI原始响应（前500字符）:', response.substring(0, 500));
            
            // 尝试提取JSON部分
            let jsonStr = response.trim();
            
            // 移除可能的markdown代码块标记
            jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            
            // 查找JSON数组
            const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
                console.log('✅ 找到JSON数组');
            } else {
                console.warn('⚠️ 未找到JSON数组格式，尝试直接解析');
            }
            
            console.log('📝 准备解析的JSON（前300字符）:', jsonStr.substring(0, 300));
            
            let enrichedData;
            try {
                enrichedData = JSON.parse(jsonStr);
            } catch (jsonError) {
                // AI 输出被截断时先尝试修复，修复成功则继续，否则抛出以便上层重试
                const repaired = this.repairTruncatedJSON(jsonStr);
                if (repaired && repaired.length > 0) {
                    console.warn(`⚠️ AI返回的JSON不完整（${jsonError.message}），已尝试修复并提取 ${repaired.length} 个单词`);
                    enrichedData = repaired;
                } else {
                    throw jsonError;
                }
            }
            console.log(`✅ JSON解析成功，获得 ${enrichedData.length} 个单词数据`);
            
            // 打印前3个解析结果
            if (enrichedData.length > 0) {
                console.log('📋 AI返回的前3个单词数据:');
                enrichedData.slice(0, 3).forEach((item, i) => {
                    console.log(`  ${i}: word="${item.word}" phonetic="${item.phonetic}" meaning="${item.meaning?.substring(0, 30)}..."`);
                });
            }
            
            const hasFields = Array.isArray(fields) && fields.length > 0;
            const isFieldChecked = (f) => !hasFields || fields.includes(f);
            // 字段取值规则：
            // - 未传 fields（默认全部）：沿用旧行为，本地已有优先，AI 仅补缺失
            // - 传了 fields：勾选列以 AI 结果优先（强制更新选中列），未勾选列保留原值
            const pick = (field, aiVal, oldVal) => {
                if (!isFieldChecked(field)) return oldVal || '';
                return hasFields ? (aiVal || oldVal || '') : (oldVal || aiVal || '');
            };
            
            // 合并原始数据和补充数据
            const result = originalWords.map((word, index) => {
                const enriched = enrichedData.find(e => 
                    e.word.toLowerCase() === word.word.toLowerCase()
                ) || enrichedData[index] || {};
                
                const merged = {
                    word: word.word,
                    phonetic: pick('phonetic', enriched.phonetic, word.phonetic),
                    definitions: [{
                        pos: word.definitions?.[0]?.pos || '',
                        meaning: pick('meaning', enriched.meaning, word.definitions?.[0]?.meaning),
                        example: pick('example', enriched.example, word.definitions?.[0]?.example)
                    }],
                    // 场景类别：勾选时以 AI 结果优先并校验规范化；未勾选保留原值
                    category: isFieldChecked('category')
                        ? (hasFields
                            ? (this.normalizeCategory(enriched.category) || word.category || '')
                            : (word.category || this.normalizeCategory(enriched.category) || ''))
                        : (word.category || '')
                };
                
                // 调试：打印第一个合并结果
                if (index === 0) {
                    console.log('🔀 合并示例（第1个单词）:');
                    console.log(`  原始: word="${word.word}" phonetic="${word.phonetic || '空'}"`);
                    console.log(`  AI补充: phonetic="${enriched.phonetic || '空'}" meaning="${enriched.meaning?.substring(0, 30) || '空'}..."`);
                    console.log(`  合并后: phonetic="${merged.phonetic}" meaning="${merged.definitions[0].meaning?.substring(0, 30)}..."`);
                }
                
                return merged;
            });
            
            console.log(`✅ 补充数据合并完成，返回 ${result.length} 个单词`);
            return result;
        } catch (error) {
            console.error('❌ 解析补充响应失败:', error);
            console.error('📄 失败的响应内容（前1000字符）:', response.substring(0, 1000));
            // 返回原始数据
            return originalWords;
        }
    },
    
    /**
     * 解析文件识别响应
     */
    parseRecognitionResponse(response) {
        try {
            // 尝试提取JSON部分
            let jsonStr = response.trim();
            
            // 移除可能的markdown代码块标记
            jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            
            // 查找JSON数组
            const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }
            
            const wordsData = JSON.parse(jsonStr);
            
            // 转换为应用所需格式
            const result = wordsData.map(item => ({
                word: item.word || '',
                phonetic: item.phonetic || '',
                definitions: [{
                    pos: '',
                    meaning: item.meaning || '',
                    example: item.example || ''
                }]
            }));
            
            return result.filter(w => w.word); // 过滤掉空单词
        } catch (error) {
            console.error('解析识别响应失败:', error, response);
            throw new Error('AI模型返回的数据格式无法解析');
        }
    },
    
    // 统一读取 AI 配置：优先 per-user 配置，未登录时回退旧全局键
    _loadSettings() {
        try {
            if (typeof Storage !== 'undefined') {
                const s = Storage.loadSettings();
                // 存在任一 AI 配置字段即采用（新字段 aiProviders/aiApiFormat/aiApiBaseUrl 或旧字段 aiApiKey）
                if (s && (Array.isArray(s.aiProviders) || s.aiApiFormat !== undefined || s.aiApiBaseUrl !== undefined || s.aiApiKey !== undefined)) return s;
            }
        } catch (e) { /* 忽略 */ }
        return JSON.parse(localStorage.getItem('wordMemory_settings') || '{}');
    },

    // 统一写入 AI 配置：登录用户写入 per-user 分区，否则回退旧全局键
    _saveApiKey(key, value) {
        try {
            if (typeof Storage !== 'undefined' && Storage.getCurrentUser()) {
                Storage.saveSettings({ [key]: value });
                return;
            }
        } catch (e) { /* 忽略 */ }
        const settings = JSON.parse(localStorage.getItem('wordMemory_settings') || '{}');
        settings[key] = value;
        localStorage.setItem('wordMemory_settings', JSON.stringify(settings));
    },

    // 获取当前激活的厂商配置（aiProviders[aiActiveProviderIndex]），缺失时回退旧全局字段
    _getActiveProvider() {
        const s = this._loadSettings();
        if (Array.isArray(s.aiProviders) && s.aiProviders.length > 0) {
            const idx = s.aiActiveProviderIndex || 0;
            const p = s.aiProviders[idx] || s.aiProviders[0];
            if (p) return p;
        }
        return null;
    },

    /**
     * 获取当前激活厂商的 API 格式（默认 openai）
     */
    getApiFormat() {
        const p = this._getActiveProvider();
        if (p && p.apiFormat) return p.apiFormat;
        return this._loadSettings().aiApiFormat || this.API_FORMATS.OPENAI;
    },
    
    /**
     * 获取当前激活厂商的 API 请求地址（baseUrl），未填写时返回空
     */
    getApiBaseUrl() {
        const p = this._getActiveProvider();
        if (p && p.baseUrl) return p.baseUrl;
        return this._loadSettings().aiApiBaseUrl || '';
    },
    
    /**
     * 获取当前激活厂商的 API 密钥
     */
    getApiKey() {
        const p = this._getActiveProvider();
        if (p && p.apiKey) return p.apiKey;
        return this._loadSettings().aiApiKey || '';
    },
    
    /**
     * 设置 API 密钥
     */
    setApiKey(apiKey) {
        this._saveApiKey('aiApiKey', apiKey);
    }
};

