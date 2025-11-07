// ============================================
// AI服务模块 - 调用Qwen大模型
// ============================================

const AIService = {
    // API提供商配置
    PROVIDERS: {
        SILICONFLOW: 'siliconflow',  // 硅基流动（默认）
        HUGGINGFACE: 'huggingface'   // Hugging Face（备选）
    },
    
    // API端点
    API_ENDPOINTS: {
        siliconflow: 'https://api.siliconflow.cn/v1/chat/completions',
        huggingface: 'https://api-inference.huggingface.co/models/'
    },
    
    // 模型配置
    MODELS: {
        LIGHT: 'Qwen/Qwen2.5-7B-Instruct',     // 轻量模型用于字段补充
        ADVANCED: 'Qwen/Qwen2.5-72B-Instruct'  // 高级模型用于文件识别（更新为2.5版本）
    },
    
    // 分批处理配置
    BATCH_SIZE: {
        LIGHT: 30,      // 轻量模型每批处理30个单词
        ADVANCED: 50    // 高级模型每批处理50个单词
    },
    
    /**
     * 调用轻量模型补充单词字段（支持分批处理）
     * @param {Array} words - 需要补充的单词列表 [{word: 'example'}, ...]
     * @param {Function} progressCallback - 进度回调函数 (current, total, percentage, message)
     * @param {Function} batchCompleteCallback - 每批完成后的回调 (enrichedBatch, batchIndex, totalBatches)
     * @returns {Promise<Array>} - 补充后的单词列表
     */
    async enrichWordsWithLight(words, progressCallback = null, batchCompleteCallback = null) {
        if (!words || words.length === 0) {
            return [];
        }
        
        const totalWords = words.length;
        const batchSize = this.BATCH_SIZE.LIGHT;
        
        // 如果单词数量少，直接处理
        if (totalWords <= batchSize) {
            console.log(`📝 处理 ${totalWords} 个单词（无需分批）`);
            
            // 更新进度
            if (progressCallback) {
                progressCallback(0, 1, 0, '正在处理单词...');
            }
            
            const prompt = this.buildEnrichmentPrompt(words);
            try {
                const result = await this.callModel(this.MODELS.LIGHT, prompt);
                const enrichedWords = this.parseEnrichmentResponse(result, words);
                
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
            } catch (error) {
                console.error('轻量模型调用失败:', error);
                
                // 失败时也调用回调，传递原始数据
                if (batchCompleteCallback) {
                    console.log('📞 调用批次完成回调（处理失败，返回原始数据）');
                    batchCompleteCallback(words, 1, 1);
                }
                
                throw error;
            }
        }
        
        // 分批处理
        console.log(`📦 开始分批处理：共 ${totalWords} 个单词，每批 ${batchSize} 个`);
        const allEnrichedWords = [];
        const batches = Math.ceil(totalWords / batchSize);
        
        for (let i = 0; i < batches; i++) {
            const start = i * batchSize;
            const end = Math.min(start + batchSize, totalWords);
            const batch = words.slice(start, end);
            
            console.log(`🔄 处理第 ${i + 1}/${batches} 批（${start + 1}-${end}）`);
            
            // 更新进度
            if (progressCallback) {
                const percentage = Math.round((i / batches) * 100);
                progressCallback(i + 1, batches, percentage, `正在处理第 ${i + 1}/${batches} 批单词...`);
            }
            
            try {
                const prompt = this.buildEnrichmentPrompt(batch);
                const result = await this.callModel(this.MODELS.LIGHT, prompt);
                const enrichedBatch = this.parseEnrichmentResponse(result, batch);
                allEnrichedWords.push(...enrichedBatch);
                
                // 🔥 每批完成后立即回调，实时更新表格
                if (batchCompleteCallback) {
                    batchCompleteCallback(enrichedBatch, i + 1, batches);
                }
                
                // 批次之间添加短暂延迟，避免API限流
                if (i < batches - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error(`❌ 第 ${i + 1} 批处理失败:`, error);
                // 失败时使用原始数据
                allEnrichedWords.push(...batch);
                
                // 即使失败也回调，让用户看到原始数据
                if (batchCompleteCallback) {
                    batchCompleteCallback(batch, i + 1, batches);
                }
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
    async recognizeAndEnrichFile(fileContent, progressCallback = null) {
        // 估算文件中的单词数量（粗略估计）
        const estimatedWords = (fileContent.match(/\b[a-zA-Z]{2,}\b/g) || []).length;
        const maxWordsPerBatch = this.BATCH_SIZE.ADVANCED;
        
        console.log(`📄 文件预估包含 ${estimatedWords} 个单词`);
        
        // 如果文件较小或单词数量少，直接处理
        if (estimatedWords <= maxWordsPerBatch || fileContent.length < 5000) {
            console.log(`📝 文件较小，直接处理（无需分段）`);
            const prompt = this.buildRecognitionPrompt(fileContent);
            try {
                const result = await this.callModel(this.MODELS.ADVANCED, prompt);
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
                const result = await this.callModel(this.MODELS.ADVANCED, prompt);
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
     * 调用AI模型API（默认使用硅基流动）
     * @param {string} modelName - 模型名称
     * @param {string} prompt - 提示词
     * @returns {Promise<string>} - 模型返回的文本
     */
    async callModel(modelName, prompt) {
        // 优先使用硅基流动API，如果失败则尝试Hugging Face
        const provider = this.getPreferredProvider();
        
        try {
            if (provider === this.PROVIDERS.SILICONFLOW) {
                return await this.callSiliconFlowAPI(modelName, prompt);
            } else {
                return await this.callHuggingFaceAPI(modelName, prompt);
            }
        } catch (error) {
            console.error(`${provider} API调用失败:`, error);
            
            // 如果是硅基流动失败，尝试降级到Hugging Face
            if (provider === this.PROVIDERS.SILICONFLOW) {
                console.log('尝试降级到Hugging Face API...');
                const hfApiKey = this.getHuggingFaceApiKey();
                if (hfApiKey) {
                    return await this.callHuggingFaceAPI(modelName, prompt);
                }
            }
            
            throw error;
        }
    },
    
    /**
     * 调用硅基流动API（默认）
     */
    async callSiliconFlowAPI(modelName, prompt) {
        const apiKey = this.getSiliconFlowApiKey();
        if (!apiKey) {
            throw new Error('请先在设置中配置硅基流动 API密钥！\n\n获取免费密钥：\n1. 访问 https://cloud.siliconflow.cn/i/WtZO3i7N\n2. 注册账号（使用邀请码 WtZO3i7N 可免费获赠2000万token）\n3. 在"API密钥管理"中创建新密钥');
        }
        
        console.log('🤖 使用硅基流动API调用模型:', modelName);
        
        const requestData = {
            model: modelName,
            stream: false,
            max_tokens: 2000,
            temperature: 0.3,
            top_p: 0.9,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        };
        
        const response = await fetch(this.API_ENDPOINTS.siliconflow, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `硅基流动API调用失败: ${response.status} - ${errorText}`;
            
            // 特殊处理模型被禁用的情况
            if (response.status === 403 && errorText.includes('Model disabled')) {
                errorMessage = `模型 ${modelName} 暂时不可用。\n建议：请检查硅基流动平台的模型列表，或联系客服确认该模型的可用性。`;
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // 解析OpenAI格式的响应
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content || '';
        }
        
        throw new Error('无法解析硅基流动API响应');
    },
    
    /**
     * 调用Hugging Face API（备选）
     */
    async callHuggingFaceAPI(modelName, prompt) {
        const apiKey = this.getHuggingFaceApiKey();
        if (!apiKey) {
            throw new Error('请先在设置中配置Hugging Face API密钥');
        }
        
        console.log('🤖 使用Hugging Face API调用模型:', modelName);
        
        const response = await fetch(`${this.API_ENDPOINTS.huggingface}${modelName}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 2000,
                    temperature: 0.3,
                    top_p: 0.9,
                    return_full_text: false
                }
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Hugging Face API调用失败: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        // 处理不同的响应格式
        if (Array.isArray(data) && data.length > 0) {
            return data[0].generated_text || data[0].text || '';
        } else if (data.generated_text) {
            return data.generated_text;
        } else if (typeof data === 'string') {
            return data;
        }
        
        throw new Error('无法解析Hugging Face API响应');
    },
    
    /**
     * 构建字段补充提示词
     */
    buildEnrichmentPrompt(words) {
        const wordList = words.map(w => w.word).join(', ');
        
        return `You are a professional English dictionary assistant. For each word provided, you must return its phonetic transcription (IPA), Chinese meaning, and an example sentence.

Words to process: ${wordList}

IMPORTANT: You MUST return a valid JSON array with this EXACT structure for each word:
[
    {
        "word": "example",
        "phonetic": "/ɪɡˈzæmpl/",
        "meaning": "n. 例子；榜样 v. 举例说明; adj. 榜样性的 adv. 作为例证...",
        "example": "Can you give me an example of what you mean?"
    }
]

Critical Requirements:
1. Return ONLY the JSON array, no markdown code blocks, no explanations, no other text
2. Each word MUST have "word", "phonetic", "meaning", and "example" fields
3. Phonetic MUST be in IPA format with forward slashes, e.g., "/wɜːrd/"
4. Meaning MUST include all part-of-speech tags (n./v./adj./adv. etc.) , but no more than 3 similar meanings for one tag.
5. Example MUST be a natural, commonly used English sentence
6. Process ALL ${words.length} words in the list above
7. The JSON must be properly formatted and parseable

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
     * 解析字段补充响应
     */
    parseEnrichmentResponse(response, originalWords) {
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
            const enrichedData = JSON.parse(jsonStr);
            console.log(`✅ JSON解析成功，获得 ${enrichedData.length} 个单词数据`);
            
            // 打印前3个解析结果
            if (enrichedData.length > 0) {
                console.log('📋 AI返回的前3个单词数据:');
                enrichedData.slice(0, 3).forEach((item, i) => {
                    console.log(`  ${i}: word="${item.word}" phonetic="${item.phonetic}" meaning="${item.meaning?.substring(0, 30)}..."`);
                });
            }
            
            // 合并原始数据和补充数据
            const result = originalWords.map((word, index) => {
                const enriched = enrichedData.find(e => 
                    e.word.toLowerCase() === word.word.toLowerCase()
                ) || enrichedData[index] || {};
                
                const merged = {
                    word: word.word,
                    phonetic: enriched.phonetic || word.phonetic || '',
                    definitions: [{
                        pos: '',
                        meaning: enriched.meaning || word.definitions?.[0]?.meaning || '',
                        example: enriched.example || word.definitions?.[0]?.example || ''
                    }]
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
    
    /**
     * 获取首选的API提供商
     */
    getPreferredProvider() {
        const settings = JSON.parse(localStorage.getItem('wordMemory_settings') || '{}');
        // 优先使用硅基流动
        if (settings.aiApiKey) {
            return this.PROVIDERS.SILICONFLOW;
        } else if (settings.hfApiKey) {
            return this.PROVIDERS.HUGGINGFACE;
        }
        return this.PROVIDERS.SILICONFLOW; // 默认
    },
    
    /**
     * 获取硅基流动API密钥
     */
    getSiliconFlowApiKey() {
        const settings = JSON.parse(localStorage.getItem('wordMemory_settings') || '{}');
        return settings.aiApiKey || '';
    },
    
    /**
     * 获取Hugging Face API密钥
     */
    getHuggingFaceApiKey() {
        const settings = JSON.parse(localStorage.getItem('wordMemory_settings') || '{}');
        return settings.hfApiKey || '';
    },
    
    /**
     * 设置硅基流动API密钥
     */
    setSiliconFlowApiKey(apiKey) {
        const settings = JSON.parse(localStorage.getItem('wordMemory_settings') || '{}');
        settings.aiApiKey = apiKey;
        localStorage.setItem('wordMemory_settings', JSON.stringify(settings));
    },
    
    /**
     * 设置Hugging Face API密钥
     */
    setHuggingFaceApiKey(apiKey) {
        const settings = JSON.parse(localStorage.getItem('wordMemory_settings') || '{}');
        settings.hfApiKey = apiKey;
        localStorage.setItem('wordMemory_settings', JSON.stringify(settings));
    }
};

