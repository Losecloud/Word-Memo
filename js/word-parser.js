// ============================================
// 文档解析模块 - 支持多种格式
// ============================================

const WordParser = {
    // 解析TXT文件
    async parseTXT(file) {
        const text = await this.readFileAsText(file);
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];

        const words = [];

        // 尝试分割第一行，判断是否为表头
        const firstRow = lines[0].split(/[,\t;]/).map(p => p.trim());
        let startIndex = 0;
        let colMap = { word: 0, phonetic: -1, meaning: -1, example: -1 };

        if (this.isHeaderRow(firstRow)) {
            startIndex = 1;
            console.log('✅ TXT检测到表头行:', firstRow);
            const dataRows = lines.slice(1).map(l => l.split(/[,\t;]/).map(p => p.trim()));
            colMap = this.autoMatchColumns(firstRow, dataRows);
        } else {
            // 尝试判断是否为单列单词列表（仅单词）
            const singleCol = lines.every(l => {
                const p = l.split(/[,\t;]/).map(x => x.trim());
                return p.length === 1 && this.isValidEnglishWord(this.cleanWord(p[0]));
            });
            if (singleCol) {
                console.log('✅ TXT为单列单词列表');
                for (const line of lines) {
                    const cleanedWord = this.cleanWord(line.trim());
                    if (this.isValidEnglishWord(cleanedWord)) {
                        words.push({ word: cleanedWord, phonetic: '', definitions: [{ pos: '', meaning: '', example: '' }] });
                    }
                }
                return words;
            }

            console.log('ℹ️ TXT未检测到表头，基于数据内容自动匹配列');
            const dataRows = lines.map(l => l.split(/[,\t;]/).map(p => p.trim()));
            const emptyHeaders = firstRow.map(() => '');
            colMap = this.autoMatchColumns(emptyHeaders, dataRows);
        }

        for (let i = startIndex; i < lines.length; i++) {
            const parts = lines[i].split(/[,\t;]/).map(p => p.trim());
            const wordCol = colMap.word;
            if (wordCol < 0 || !parts[wordCol]) continue;

            const cleanedWord = this.cleanWord(parts[wordCol]);
            if (!this.isValidEnglishWord(cleanedWord)) continue;

            const phonetic = colMap.phonetic >= 0 && parts[colMap.phonetic]
                ? String(parts[colMap.phonetic]).trim() : '';
            const meaning = colMap.meaning >= 0 && parts[colMap.meaning]
                ? String(parts[colMap.meaning]).trim() : '';
            const example = colMap.example >= 0 && parts[colMap.example]
                ? String(parts[colMap.example]).trim() : '';

            words.push({
                word: cleanedWord,
                phonetic,
                definitions: [{ pos: '', meaning, example }]
            });
        }

        return words;
    },

    // 解析CSV文件
    async parseCSV(file) {
        const text = await this.readFileAsText(file);
        const lines = text.split('\n').filter(line => line.trim());
        const words = [];

        if (lines.length === 0) return words;

        // 按逗号分割首行（CSV标准），判断是否为表头
        const firstRow = this.parseCSVLine(lines[0]).map(cell => (cell || '').trim());
        let startIndex = 0;
        let colMap = { word: 0, phonetic: -1, meaning: -1, example: -1 };

        if (this.isHeaderRow(firstRow)) {
            startIndex = 1;
            console.log('✅ CSV检测到表头行:', firstRow);
            // 用后续行做样本
            const dataRows = lines.slice(1).map(l => this.parseCSVLine(l));
            colMap = this.autoMatchColumns(firstRow, dataRows);
        } else {
            console.log('ℹ️ CSV未检测到表头，基于数据内容自动匹配列');
            const dataRows = lines.map(l => this.parseCSVLine(l));
            const emptyHeaders = firstRow.map(() => '');
            colMap = this.autoMatchColumns(emptyHeaders, dataRows);
        }
        console.log('📌 CSV列映射:', colMap);

        for (let i = startIndex; i < lines.length; i++) {
            const parts = this.parseCSVLine(lines[i]);
            const wordCol = colMap.word;
            if (wordCol < 0 || !parts[wordCol]) continue;

            // 清洗和验证单词
            const cleanedWord = this.cleanWord(parts[wordCol]);
            if (!this.isValidEnglishWord(cleanedWord)) {
                continue;
            }

            const phonetic = colMap.phonetic >= 0 && parts[colMap.phonetic]
                ? String(parts[colMap.phonetic]).trim() : '';
            const meaning = colMap.meaning >= 0 && parts[colMap.meaning]
                ? String(parts[colMap.meaning]).trim() : '';
            const example = colMap.example >= 0 && parts[colMap.example]
                ? String(parts[colMap.example]).trim() : '';

            const word = {
                word: cleanedWord,
                phonetic,
                definitions: []
            };
            word.definitions.push({ pos: '', meaning, example });
            words.push(word);
        }

        return words;
    },

    // 解析CSV行（处理引号）
    parseCSVLine(line) {
        const parts = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        parts.push(current.trim());
        return parts;
    },

    // 解析Excel文件
    async parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // 读取第一个工作表
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    
                    console.log('📁 Excel文件解析开始');
                    console.log(`📄 工作表名称: ${workbook.SheetNames[0]}`);
                    console.log(`📊 总行数: ${rows.length}`);

                    // ---- 自动列匹配 ----
                    let colMap = { word: 0, phonetic: -1, meaning: -1, example: -1 };
                    let startIndex = 0;

                    if (rows.length > 0) {
                        const firstRow = rows[0].map(cell => String(cell ?? '').trim());
                        console.log('📋 第1行:', firstRow);

                        // 判断首行是否为表头
                        if (this.isHeaderRow(firstRow)) {
                            startIndex = 1;
                            console.log('✅ 检测到表头行，从第2行开始解析');
                            // 用表头 + 后续数据行进行自动列匹配
                            const dataRows = rows.slice(1);
                            colMap = this.autoMatchColumns(firstRow, dataRows);
                        } else {
                            console.log('ℹ️ 未检测到表头，从第1行开始解析，基于数据内容自动匹配列');
                            // 无表头：传空表头，用所有行做样本
                            const emptyHeaders = firstRow.map(() => '');
                            colMap = this.autoMatchColumns(emptyHeaders, rows);
                        }
                        console.log('📌 自动列映射:', colMap);
                    }

                    const words = [];

                    for (let i = startIndex; i < rows.length; i++) {
                        const row = rows[i];
                        const wordCol = colMap.word;
                        if (wordCol < 0 || !row[wordCol]) continue;

                        // 清洗和验证单词
                        const cleanedWord = this.cleanWord(String(row[wordCol]));
                        if (!this.isValidEnglishWord(cleanedWord)) {
                            console.log(`⚠️ 跳过无效单词: "${row[wordCol]}"`);
                            continue;
                        }

                        // 调试信息：打印前3行数据结构
                        if (i < startIndex + 3) {
                            console.log(`📊 Excel第${i + 1}行数据 (共${row.length}列):`, row);
                        }

                        const phonetic = colMap.phonetic >= 0 && row[colMap.phonetic]
                            ? String(row[colMap.phonetic]).trim() : '';
                        const meaning = colMap.meaning >= 0 && row[colMap.meaning]
                            ? String(row[colMap.meaning]).trim() : '';
                        const example = colMap.example >= 0 && row[colMap.example]
                            ? String(row[colMap.example]).trim() : '';

                        // 调试信息
                        if (i < startIndex + 3) {
                            console.log(`  ↳ 单词: "${cleanedWord}", 音标: "${phonetic}", 释义: "${meaning}", 例句: "${example}"`);
                        }

                        const word = {
                            word: cleanedWord,
                            phonetic,
                            definitions: []
                        };
                        word.definitions.push({ pos: '', meaning, example });
                        words.push(word);
                    }

                    // 统计有例句的单词数量
                    const wordsWithExample = words.filter(w => 
                        w.definitions && w.definitions[0] && w.definitions[0].example
                    ).length;
                    
                    console.log('✅ Excel文件解析完成');
                    console.log(`📝 成功解析 ${words.length} 个单词`);
                    console.log(`💬 其中 ${wordsWithExample} 个单词有例句`);
                    if (wordsWithExample === 0 && words.length > 0) {
                        console.warn('⚠️ 警告：所有单词都没有例句！可能原因：');
                        console.warn('   1. Excel文件只有3列（单词、音标、释义），缺少第4列（例句）');
                        console.warn('   2. 第4列存在但内容为空');
                        console.warn('   3. 例句在其他列（非第4列）');
                    }

                    resolve(words);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    },

    // 解析DOCX文件
    async parseDOCX(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    const text = result.value;
                    
                    // 按行分割
                    const lines = text.split('\n').filter(line => line.trim());
                    const words = [];

                    for (const line of lines) {
                        // 支持多种分隔符
                        const parts = line.split(/[,\t;]/).map(p => p.trim());
                        
                        if (parts.length === 1) {
                            words.push({ word: parts[0] });
                        } else {
                            // 新格式：单词, 音标, 释义（包含词性）, 例句
                            const word = {
                                word: parts[0],
                                phonetic: parts[1] || '',
                                definitions: []
                            };

                            if (parts.length >= 3) {
                                // parts[2] 现在是完整释义（包含词性）
                                const meaning = parts[2] || '';
                                const example = parts[3] || '';
                                
                                word.definitions.push({ pos: '', meaning, example });
                            }

                            words.push(word);
                        }
                    }

                    resolve(words);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    },

    // 读取文件为文本
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    },

    // 主解析函数（支持智能分析）
    async parse(file, options = {}) {
        const fileName = file.name.toLowerCase();
        const { smartImport = false } = options;
        
        try {
            let words = [];
            let rawContent = '';

            if (fileName.endsWith('.txt')) {
                words = await this.parseTXT(file);
                if (smartImport) {
                    rawContent = await this.readFileAsText(file);
                }
            } else if (fileName.endsWith('.csv')) {
                words = await this.parseCSV(file);
                if (smartImport) {
                    rawContent = await this.readFileAsText(file);
                }
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                words = await this.parseExcel(file);
                // Excel文件的原始内容在parseExcel中已经处理
            } else if (fileName.endsWith('.docx')) {
                words = await this.parseDOCX(file);
            } else {
                throw new Error('不支持的文件格式');
            }

            // 过滤空单词
            words = words.filter(w => w.word && w.word.trim());

            // 智能分析文件格式
            if (smartImport) {
                const analysis = this.analyzeFileFormat(words, rawContent);
                return {
                    words,
                    analysis,
                    rawContent
                };
            }

            // 传统模式：检查是否需要补充信息
            const needsEnrichment = words.some(w => !w.phonetic || !w.definitions || w.definitions.length === 0);

            return {
                words,
                needsEnrichment
            };

        } catch (error) {
            console.error('解析文件失败:', error);
            throw error;
        }
    },

    /**
     * 分析文件格式，判断是否符合模板格式
     * @param {Array} words - 解析出的单词列表
     * @param {string} rawContent - 原始文件内容
     * @returns {Object} 分析结果
     */
    analyzeFileFormat(words, rawContent) {
        console.log('🔍 智能分析文件格式...');
        
        // 1. 检查是否找到了主字段"单词"
        const hasWordField = words.length > 0 && words.every(w => w.word && w.word.trim());
        
        if (!hasWordField) {
            // 无法识别主字段
            return {
                status: 'NO_MAIN_FIELD',
                description: '无法识别主字段（单词），已使用高级AI模型识别',
                needsAdvancedAI: true,
                needsLightAI: false,
                conformsToTemplate: false
            };
        }
        
        // 2. 检查次字段完整性
        const secondaryFields = {
            phonetic: 0,  // 音标
            meaning: 0,   // 释义
            example: 0    // 例句
        };
        
        words.forEach(word => {
            if (word.phonetic && word.phonetic.trim()) {
                secondaryFields.phonetic++;
            }
            if (word.definitions && word.definitions.length > 0) {
                const def = word.definitions[0];
                if (def.meaning && def.meaning.trim()) {
                    secondaryFields.meaning++;
                }
                if (def.example && def.example.trim()) {
                    secondaryFields.example++;
                }
            }
        });
        
        const totalWords = words.length;
        const phoneticRate = totalWords > 0 ? secondaryFields.phonetic / totalWords : 0;
        const meaningRate = totalWords > 0 ? secondaryFields.meaning / totalWords : 0;
        const exampleRate = totalWords > 0 ? secondaryFields.example / totalWords : 0;
        
        console.log(`📊 字段完整度: 音标${(phoneticRate * 100).toFixed(1)}%, 释义${(meaningRate * 100).toFixed(1)}%, 例句${(exampleRate * 100).toFixed(1)}%`);
        
        // 3. 判断是否符合模板格式（所有次字段完整度 >= 80%）
        const conformsToTemplate = phoneticRate >= 0.8 && meaningRate >= 0.8 && exampleRate >= 0.8;
        
        if (conformsToTemplate) {
            return {
                status: 'CONFORMS_TO_TEMPLATE',
                description: '文件符合模板格式，可直接导入',
                needsAdvancedAI: false,
                needsLightAI: false,
                conformsToTemplate: true
            };
        }
        
        // 4. 判断次字段缺失情况
        const missingFields = [];
        if (phoneticRate < 0.8) missingFields.push('音标');
        if (meaningRate < 0.8) missingFields.push('释义');
        if (exampleRate < 0.8) missingFields.push('例句');
        
        return {
            status: 'MISSING_SECONDARY_FIELDS',
            description: `文件包含主字段（单词），但缺少次字段：${missingFields.join('、')}`,
            needsAdvancedAI: false,
            needsLightAI: true,
            conformsToTemplate: false,
            missingFields,
            completeness: {
                phonetic: phoneticRate,
                meaning: meaningRate,
                example: exampleRate
            }
        };
    },

    /**
     * 检测单词字段（支持模糊匹配）
     * @param {string} fieldName - 字段名称
     * @returns {boolean} 是否为单词字段
     */
    isWordField(fieldName) {
        if (!fieldName) return false;
        const normalized = fieldName.toLowerCase().trim();
        const wordPatterns = ['word', '单词', '单词表', '重点词', 'vocabulary', 'vocab', 'term'];
        return wordPatterns.some(pattern => normalized.includes(pattern));
    },

    /**
     * 从文本中提取所有有效的英文单词
     * @param {string} content - 原始文本内容
     * @returns {Array} - 提取出的单词列表 [{word: 'example'}, ...]
     */
    extractEnglishWords(content) {
        if (!content || typeof content !== 'string') {
            return [];
        }

        console.log('🔍 开始提取英文单词...');
        
        // 第一步：检测并移除音标区域
        // IPA音标符号列表（扩充版）
        const phoneticSymbols = [
            // 重音符号
            'ˈ', 'ˌ', 'ː', 'ˑ',
            // 元音
            'ə', 'ɚ', 'ɛ', 'ɜ', 'ɝ', 'ɞ', 'ɔ', 'ɒ', 'æ', 'ɪ', 'ʊ', 'ʌ', 
            'ɑ', 'ɐ', 'ɨ', 'ʉ', 'ɯ', 'ɤ', 'ɵ', 'ʏ', 'ø', 'œ',
            // 辅音
            'θ', 'ð', 'ʃ', 'ʒ', 'ŋ', 'ʧ', 'ʤ', 'ʦ', 'ʣ', 'ɾ', 'ɹ', 'ɬ', 'ɮ',
            // 组合
            'dʒ', 'tʃ', 'ts', 'dz',
            // 其他常见符号
            'ɡ', 'ɲ', 'ʎ', 'β', 'ɣ', 'χ', 'ʁ', 'ħ', 'ʕ', 'ʔ',
            // 音标中的括号（表示可选发音）
            '(', ')'
        ];
        
        // 创建音标检测正则（转义特殊字符）
        const phoneticChars = phoneticSymbols.map(s => 
            s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        ).join('');
        const phoneticPattern = new RegExp(`[${phoneticChars}]`);
        
        let cleanedContent = content;
        
        // 移除 [音标] 格式（如果包含音标符号）
        cleanedContent = cleanedContent.replace(/\[[^\]]+\]/g, (match) => {
            if (phoneticPattern.test(match)) {
                return ' '; // 替换为空格
            }
            return match; // 保留非音标的方括号内容
        });
        
        // 移除 /音标/ 格式（如果包含音标符号）
        cleanedContent = cleanedContent.replace(/\/[^/]+\//g, (match) => {
            if (phoneticPattern.test(match)) {
                return ' '; // 替换为空格
            }
            return match; // 保留非音标的斜线内容
        });
        
        console.log('✓ 已移除音标区域');
        
        // 第二步：正则提取所有可能的英文单词
        const wordPattern = /[a-zA-Z][a-zA-Z\-']*[a-zA-Z]|[a-zA-Z]+/g;
        const matches = cleanedContent.match(wordPattern) || [];
        
        console.log(`📝 正则匹配到 ${matches.length} 个候选词`);
        
        // 第三步：定义词性标签列表（扩充版）
        const posPatterns = [
            /^n\.?$/i,           // n, n. (noun)
            /^v\.?$/i,           // v, v. (verb)
            /^adj\.?$/i,         // adj, adj. (adjective)
            /^adv\.?$/i,         // adv, adv. (adverb)
            /^prep\.?$/i,        // prep, prep. (preposition)
            /^conj\.?$/i,        // conj, conj. (conjunction)
            /^pron\.?$/i,        // pron, pron. (pronoun)
            /^vi\.?$/i,          // vi, vi. (intransitive verb)
            /^vt\.?$/i,          // vt, vt. (transitive verb)
            /^art\.?$/i,         // art, art. (article)
            /^num\.?$/i,         // num, num. (numeral)
            /^interj\.?$/i,      // interj, interj. (interjection)
            /^det\.?$/i,         // det, det. (determiner)
            /^aux\.?$/i,         // aux, aux. (auxiliary)
            /^modal\.?$/i,       // modal (modal verb)
            /^abbr\.?$/i         // abbr, abbr. (abbreviation)
        ];
        
        // 检查是否为词性标签
        const isPOSTag = (word) => {
            return posPatterns.some(pattern => pattern.test(word));
        };
        
        // 第四步：去重并验证（不区分大小写）
        const seenWords = new Set();
        const validWords = [];
        
        for (const word of matches) {
            const cleanedWord = this.cleanWord(word);
            const lowerWord = cleanedWord.toLowerCase();
            
            // 跳过已见过的单词（不区分大小写）
            if (seenWords.has(lowerWord)) {
                console.log(`⊗ 跳过重复单词: ${cleanedWord}`);
                continue;
            }
            
            // 跳过词性标签
            if (isPOSTag(cleanedWord)) {
                console.log(`⊗ 跳过词性标签: ${cleanedWord}`);
                continue;
            }
            
            // 验证是否为有效单词
            if (this.isValidEnglishWord(cleanedWord)) {
                seenWords.add(lowerWord);
                validWords.push({
                    word: cleanedWord,
                    phonetic: '',
                    definitions: [{
                        pos: '',
                        meaning: '',
                        example: ''
                    }]
                });
            }
        }
        
        console.log(`✅ 提取到 ${validWords.length} 个有效英文单词`);
        return validWords;
    },

    /**
     * 验证是否为有效的英文单词
     * @param {string} word - 待验证的单词
     * @returns {boolean} 是否为有效单词
     */
    isValidEnglishWord(word) {
        if (!word || typeof word !== 'string') return false;
        
        const trimmed = word.trim();
        
        // 1. 长度检查（单词长度通常在1-45之间）
        if (trimmed.length === 0 || trimmed.length > 45) return false;
        
        // 2. 纯数字检查（过滤序号）
        if (/^\d+$/.test(trimmed)) return false;
        
        // 3. 包含中文字符检查
        if (/[\u4e00-\u9fa5]/.test(trimmed)) return false;
        
        // 4. 包含特殊符号过多（允许连字符、撇号、空格）
        const validChars = /^[a-zA-Z\s\-'\.]+$/;
        if (!validChars.test(trimmed)) return false;
        
        // 5. 必须包含至少一个字母
        if (!/[a-zA-Z]/.test(trimmed)) return false;
        
        // 6. 过滤明显的标记和提示文本
        const invalidPatterns = [
            /^未分组/,
            /^未命名/,
            /^\*/,
            /^#/,
            /^注[:：]/,
            /^备注/,
            /^说明/,
            /^提示/,
            /^[\d]+[\.、,，]/  // 序号格式：1. 或 1、
        ];
        
        for (const pattern of invalidPatterns) {
            if (pattern.test(trimmed)) return false;
        }
        
        // 7. 过滤纯标点或特殊符号
        if (/^[\-\.\s]+$/.test(trimmed)) return false;
        
        return true;
    },

    /**
     * 清洗单词文本
     * @param {string} word - 原始单词文本
     * @returns {string} 清洗后的单词
     */
    cleanWord(word) {
        if (!word) return '';
        
        let cleaned = word.trim();
        
        // 移除序号（如 "1. word" -> "word"）
        cleaned = cleaned.replace(/^\d+[\.\、,，]\s*/, '');
        
        // 移除前后的特殊符号
        cleaned = cleaned.replace(/^[\*#\-]+\s*/, '');
        cleaned = cleaned.replace(/\s*[\*#\-]+$/, '');
        
        // 移除多余的空格
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        return cleaned;
    },

    // 生成示例单词列表
    getDemoWords() {
        return [    {
        word: 'apple',
        phonetic: '/ˈæpl/',
        definitions: [
            { pos: '', meaning: 'n. 苹果；苹果树', example: 'I eat an apple every day.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'book',
        phonetic: '/bʊk/',
        definitions: [
            { pos: '', meaning: 'n. 书；书籍\nv. 预订', example: 'I love reading books.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'happy',
        phonetic: '/ˈhæpi/',
        definitions: [
            { pos: '', meaning: 'adj. 快乐的；幸福的', example: 'I am very happy today.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'learn',
        phonetic: '/lɜːrn/',
        definitions: [
            { pos: '', meaning: 'v. 学习；学会', example: 'I want to learn English.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'beautiful',
        phonetic: '/ˈbjuːtɪfl/',
        definitions: [
            { pos: '', meaning: 'adj. 美丽的；漂亮的', example: 'She is a beautiful girl.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'computer',
        phonetic: '/kəmˈpjuːtər/',
        definitions: [
            { pos: '', meaning: 'n. 计算机；电脑', example: 'I use my computer every day.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'friend',
        phonetic: '/frend/',
        definitions: [
            { pos: '', meaning: 'n. 朋友', example: 'He is my best friend.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'love',
        phonetic: '/lʌv/',
        definitions: [
            { pos: '', meaning: 'v. 爱；热爱\nn. 爱；爱情', example: 'I love you.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'run',
        phonetic: '/rʌn/',
        definitions: [
            { pos: '', meaning: 'v. 跑；奔跑', example: 'He runs every morning.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'time',
        phonetic: '/taɪm/',
        definitions: [
            { pos: '', meaning: 'n. 时间', example: 'What time is it?'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'water',
        phonetic: '/ˈwɔːtər/',
        definitions: [
            { pos: '', meaning: 'n. 水', example: 'I drink water every day.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'world',
        phonetic: '/wɜːrld/',
        definitions: [
            { pos: '', meaning: 'n. 世界；地球', example: 'The world is full of wonders.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'good',
        phonetic: '/ɡʊd/',
        definitions: [
            { pos: '', meaning: 'adj. 好的；优秀的', example: 'This is a good book.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'big',
        phonetic: '/bɪɡ/',
        definitions: [
            { pos: '', meaning: 'adj. 大的；巨大的', example: 'This is a big house.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'hello',
        phonetic: '/həˈləʊ/',
        definitions: [
            { pos: '', meaning: 'interj. 你好', example: 'Hello, how are you?'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'cat',
        phonetic: '/kæt/',
        definitions: [
            { pos: '', meaning: 'n. 猫', example: 'I have a cute cat.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'dog',
        phonetic: '/dɔːɡ/',
        definitions: [
            { pos: '', meaning: 'n. 狗', example: 'Dogs are loyal animals.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'food',
        phonetic: '/fuːd/',
        definitions: [
            { pos: '', meaning: 'n. 食物；食品', example: 'I like Chinese food.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'small',
        phonetic: '/smɔːl/',
        definitions: [
            { pos: '', meaning: 'adj. 小的；少的', example: 'I need a small bag.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'sad',
        phonetic: '/sæd/',
        definitions: [
            { pos: '', meaning: 'adj. 悲伤的；难过的', example: 'She felt sad after the movie.'}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'skim',
        phonetic: '/skɪm/',
        definitions: [
            { pos: '', meaning: 'v. 略读；浏览；撇去表面漂浮物\nn. 撇去的浮沫；脱脂乳；浏览', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'psychological',
        phonetic: '/ˌsaɪkəˈlɒdʒɪkl/',
        definitions: [
            { pos: '', meaning: 'adj. 心理的；精神的；心理学的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'elaborate',
        phonetic: '/ɪˈlæbəreɪt/',
        definitions: [
            { pos: '', meaning: 'v. 详细阐述，详尽说明，精心制作\nn. 详细阐述，详尽细节', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'prevail',
        phonetic: '/prɪˈveɪl/',
        definitions: [
            { pos: '', meaning: 'v. 盛行；战胜；获胜\nn. 优势；获胜', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'instruct',
        phonetic: '/ɪnˈstrʌkt/',
        definitions: [
            { pos: '', meaning: 'v. 指导；指示；命令\nn. 指令；命令；指示', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'convention',
        phonetic: '/kənˈvenʃn/',
        definitions: [
            { pos: '', meaning: 'v. 召开；召集  \nn. 习俗；惯例；大会', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'genuine',
        phonetic: '/ˈdʒenjuɪn/',
        definitions: [
            { pos: '', meaning: 'adj. 真正的；真诚的；真实的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'crude',
        phonetic: '/kruːd/',
        definitions: [
            { pos: '', meaning: 'v. 提炼，粗制，加工（原油等）\nn. 原油，石油，天然石油', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'inquire',
        phonetic: '/ɪnˈkwaɪə(r)/',
        definitions: [
            { pos: '', meaning: 'v. 询问；打听；调查\nn. 询问；查询；打听', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'controversy',
        phonetic: '/ˈkɒntrəvɜːsi/',
        definitions: [
            { pos: '', meaning: 'n. 争议；争论；论战', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'surge',
        phonetic: '/sɜːrdʒ/',
        definitions: [
            { pos: '', meaning: 'v. 激增；猛涨；急剧上升\nn. 激增；猛增；浪涌', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'plot',
        phonetic: '/plɒt/',
        definitions: [
            { pos: '', meaning: 'v. 密谋；绘制；策划\nn. 情节；阴谋；图表', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'faculty',
        phonetic: '/ˈfæklti/',
        definitions: [
            { pos: '', meaning: 'n. 全体教员；教职工；学院；系', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'competent',
        phonetic: '/ˈkɒmpɪtənt/',
        definitions: [
            { pos: '', meaning: 'adj. 有能力的；能胜任的；称职的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'pension',
        phonetic: '/ˈpenʃn/',
        definitions: [
            { pos: '', meaning: 'v. 发养老金  \nn. 养老金，退休金，抚恤金', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'enforce',
        phonetic: '/ɪnˈfɔːs/',
        definitions: [
            { pos: '', meaning: 'v. 执行；强制实施；坚持要求', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'saucer',
        phonetic: '/ˈsɔːsə(r)/',
        definitions: [
            { pos: '', meaning: 'n. 茶碟，杯托， saucer-shaped object', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'subordinate',
        phonetic: '/səˈbɔːrdɪnət/',
        definitions: [
            { pos: '', meaning: 'v. 使服从；使从属  \nn. 下属；下级；部属', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'venture',
        phonetic: '/ˈventʃə(r)/',
        definitions: [
            { pos: '', meaning: 'v. 冒险；敢于去（危险或令人不快的地方）；小心地说（或做）； n. （尤指有风险的）企业；冒险事业；冒险；', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'arithmetic',
        phonetic: '/əˈrɪθmətɪk/',
        definitions: [
            { pos: '', meaning: 'n. 算术', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'preliminary',
        phonetic: '/prɪˈlɪmɪnəri/',
        definitions: [
            { pos: '', meaning: 'adj. 初步的；预备的；开始的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'circumference',
        phonetic: '/səˈkʌmfərəns/',
        definitions: [
            { pos: '', meaning: 'n. 圆周；周长；周围', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'amateur',
        phonetic: '/ˈæmətər/',
        definitions: [
            { pos: '', meaning: 'n. 业余爱好者；业余选手；外行', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'advisable',
        phonetic: '/ədˈvaɪzəbl/',
        definitions: [
            { pos: '', meaning: 'adj. 明智的；可取的；适当的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'dwelling',
        phonetic: '/ˈdwelɪŋ/',
        definitions: [
            { pos: '', meaning: 'n. 住所；住宅；寓所', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'sponsor',
        phonetic: '/ˈspɒnsə(r)/',
        definitions: [
            { pos: '', meaning: 'v. 赞助；资助；主办\nn. 赞助商；资助者；主办者', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'acre',
        phonetic: '/ˈeɪkər/',
        definitions: [
            { pos: '', meaning: 'n. 英亩', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'racial',
        phonetic: '/ˈreɪʃl/',
        definitions: [
            { pos: '', meaning: 'adj. 种族的；人种的；种族间的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'loaf',
        phonetic: '/loʊf/',
        definitions: [
            { pos: '', meaning: 'v. 烤（面包等）\nn. 一条面包；一块糕点', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'tobacco',
        phonetic: '/təˈbækəʊ/',
        definitions: [
            { pos: '', meaning: 'n. 烟草；烟叶；烟草制品', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'arbitrary',
        phonetic: '/ˈɑːrbɪtreri/',
        definitions: [
            { pos: '', meaning: 'adj. 任意的；随意的；武断的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'casualty',
        phonetic: '/ˈkæʒuəlti/',
        definitions: [
            { pos: '', meaning: 'n. 伤亡人员；受害者；意外事故', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'shallow',
        phonetic: '/ˈʃæləʊ/',
        definitions: [
            { pos: '', meaning: 'v. 使变浅\nn. 浅滩\nadj. 浅的；肤浅的；浅薄的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'choke',
        phonetic: '/tʃəʊk/',
        definitions: [
            { pos: '', meaning: 'v. 窒息；哽咽；阻塞\nn. 窒息；阻气门；哽咽声', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'rage',
        phonetic: '/reɪdʒ/',
        definitions: [
            { pos: '', meaning: 'v. 发怒；怒斥  \nn. 愤怒；狂暴；（风、浪等的）猛烈', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'collar',
        phonetic: '/ˈkɒlə(r)/',
        definitions: [
            { pos: '', meaning: 'v. 抓住，逮住  \nn. 衣领，领子，（动物的）颈圈', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'zealous',
        phonetic: '/ˈzeləs/',
        definitions: [
            { pos: '', meaning: 'adj. 热心的；热情的；狂热的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'scatter',
        phonetic: '/ˈskætə(r)/',
        definitions: [
            { pos: '', meaning: 'v. 撒播；散开；使分散\nn. 散落；散布；散射', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'sanction',
        phonetic: '/ˈsæŋkʃn/',
        definitions: [
            { pos: '', meaning: 'v. 制裁；批准；处罚\nn. 制裁；处罚；认可', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'creep',
        phonetic: '/kriːp/',
        definitions: [
            { pos: '', meaning: 'v. 爬行；蔓延；蹑手蹑脚地移动\nn. 爬行；毛骨悚然的感觉；卑鄙小人', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'ambassador',
        phonetic: '/æmˈbæsədə(r)/',
        definitions: [
            { pos: '', meaning: 'n. 大使；使节；代表', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'embassy',
        phonetic: '/ˈembəsi/',
        definitions: [
            { pos: '', meaning: 'n. 大使馆；使馆官员；大使馆全体人员', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'cast',
        phonetic: '/kɑːst/',
        definitions: [
            { pos: '', meaning: 'v. 投，掷，抛；铸造；选派角色\nn. 全体演员；铸件；模子', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'humble',
        phonetic: '/ˈhʌmbl/',
        definitions: [
            { pos: '', meaning: 'v. 使谦恭\nn. 谦逊的人\nadj. 谦逊的；简陋的；（级别或地位）低下的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'optimum',
        phonetic: '/ˈɒptɪməm/',
        definitions: [
            { pos: '', meaning: 'n. 最佳状态；最适宜条件；最适度', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'monopoly',
        phonetic: '/məˈnɒpəli/',
        definitions: [
            { pos: '', meaning: 'v. 垄断；独占；专营\nn. 垄断；垄断权；专卖权', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'auxiliary',
        phonetic: '/ɔːɡˈzɪliəri/',
        definitions: [
            { pos: '', meaning: 'n. 辅助人员；助动词；辅助设备', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'scarce',
        phonetic: '/skeəs/',
        definitions: [
            { pos: '', meaning: 'adj. 缺乏的，不足的，稀少的\n\nn. 缺乏，不足\n\n（注：scarce 主要用作形容词和名词，无常见动词用法。经核查权威词典，其核心释义为形容词“缺乏的、稀少的”和名词“缺乏、不足”，符合任务要求的同义释义数量控制。）', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'devise',
        phonetic: '/dɪˈvaɪz/',
        definitions: [
            { pos: '', meaning: 'v. 设计；发明；策划\nn. 遗赠；遗赠的财产', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'voyage',
        phonetic: '/ˈvɔɪɪdʒ/',
        definitions: [
            { pos: '', meaning: 'v. 航行；航海；旅行\nn. 航行；航海；旅行', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'vacant',
        phonetic: '/ˈveɪkənt/',
        definitions: [
            { pos: '', meaning: 'adj. 空缺的；空着的；未被占用的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'wicked',
        phonetic: '/ˈwɪkɪd/',
        definitions: [
            { pos: '', meaning: 'adj. 邪恶的；恶劣的；淘气的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'contemporary',
        phonetic: '/kənˈtemprəri/',
        definitions: [
            { pos: '', meaning: 'adj. 当代的；现代的；同时代的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'molecule',
        phonetic: '/ˈmɒlɪkjuːl/',
        definitions: [
            { pos: '', meaning: 'n. 分子', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'pessimistic',
        phonetic: '/ˌpesɪˈmɪstɪk/',
        definitions: [
            { pos: '', meaning: 'adj. 悲观的，悲观主义的  \nn. 悲观主义者  \n\n同义释义：消极的，厌世的，绝望的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'pathetic',
        phonetic: '/pəˈθetɪk/',
        definitions: [
            { pos: '', meaning: 'adj. 可怜的；可悲的；令人同情的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'straw',
        phonetic: '/strɔː/',
        definitions: [
            { pos: '', meaning: 'v. 用吸管吸  \nn. 稻草；吸管；麦秆', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'submerge',
        phonetic: '/səbˈmɜːrdʒ/',
        definitions: [
            { pos: '', meaning: 'v. 淹没；浸没；潜入\nn. 淹没；潜水', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'plain',
        phonetic: '/pleɪn/',
        definitions: [
            { pos: '', meaning: 'v. 澄清，说明，使清楚\nn. 平原，旷野，朴素的东西', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'stoop',
        phonetic: '/stuːp/',
        definitions: [
            { pos: '', meaning: 'v. 弯腰；俯身；屈尊\nn. 驼背；弯腰的姿势；门廊台阶', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'satellite',
        phonetic: '/ˈsætəlaɪt/',
        definitions: [
            { pos: '', meaning: 'n. 卫星；人造卫星；卫星城', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'extravagant',
        phonetic: '/ɪkˈstrævəɡənt/',
        definitions: [
            { pos: '', meaning: 'adj. 奢侈的；挥霍的；过分的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'bourgeois',
        phonetic: '/ˌbʊrʒwɑːˈ/',
        definitions: [
            { pos: '', meaning: 'n. 资产阶级分子\nn. 中产阶级成员\nadj. 资产阶级的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'thrill',
        phonetic: '/θrɪl/',
        definitions: [
            { pos: '', meaning: 'v. 使非常兴奋\nn. 兴奋感\nn. 刺激\nn. 惊险感', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'monarch',
        phonetic: '/ˈmɒnərk/',
        definitions: [
            { pos: '', meaning: 'n. 君主；帝王；元首', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'melancholy',
        phonetic: '/ˈmelənkəli/',
        definitions: [
            { pos: '', meaning: 'n. 忧郁  \nn. 悲伤  \nn. 愁思', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'reconciliation',
        phonetic: '/ˌrekənsɪliˈeɪʃn/',
        definitions: [
            { pos: '', meaning: 'v. 和解；调和；核对\nn. 和解；调和；对账', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'composite',
        phonetic: '/ˈkɒmpəzɪt/',
        definitions: [
            { pos: '', meaning: 'v. 合成；混合；组成\nn. 合成物；复合材料；综合体', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'permanence',
        phonetic: '/ˈpɜːmənəns/',
        definitions: [
            { pos: '', meaning: 'n. 永久；持久；永恒', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'hybrid',
        phonetic: '/ˈhaɪbrɪd/',
        definitions: [
            { pos: '', meaning: 'adj. 混合的；杂种的\nn. 杂种；混合物', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'oyster',
        phonetic: '/ˈɔɪstə(r)/',
        definitions: [
            { pos: '', meaning: 'n. 牡蛎；蚝', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'masculine',
        phonetic: '/ˈmæskjəlɪn/',
        definitions: [
            { pos: '', meaning: 'adj. 男性的；男子气概的；阳性的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'obscene',
        phonetic: '/əbˈsiːn/',
        definitions: [
            { pos: '', meaning: 'adj. 猥亵的；淫秽的；下流的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'overt',
        phonetic: '/əʊˈvɜːt/',
        definitions: [
            { pos: '', meaning: 'adj. 明显的；公开的；公然的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'panther',
        phonetic: '/ˈpænθə(r)/',
        definitions: [
            { pos: '', meaning: 'n. 豹；黑豹；美洲豹', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'rash',
        phonetic: '/ræʃ/',
        definitions: [
            { pos: '', meaning: 'v. 轻率行事\nn. 皮疹；轻率行为', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'absurd',
        phonetic: '/əbˈsɜːrd/',
        definitions: [
            { pos: '', meaning: 'adj. 荒谬的；荒唐的；怪诞不经的', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'prism',
        phonetic: '/ˈprɪzəm/',
        definitions: [
            { pos: '', meaning: 'n. 棱镜；棱柱体；棱镜光谱', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'blaze',
        phonetic: '/bleɪz/',
        definitions: [
            { pos: '', meaning: 'v. 燃烧；熊熊燃烧；猛烈燃烧\nn. 火焰；烈火；火灾', example: ''}
        ],
        synonyms: [],
        antonyms: []
    },
    {
        word: 'transverse',
        phonetic: '/trænzˈvɜːs/',
        definitions: [
            { pos: '', meaning: 'adj. 横向的；横断的；横切的\nn. 横向物；横轴；横肌', example: ''}
        ],
        synonyms: [],
        antonyms: []
    }];
    },

    // ============================================
    // 自动列匹配：智能识别各列所属字段
    // ============================================

    /**
     * 智能识别各列对应的字段（单词、音标、释义、例句）
     * @param {string[]} headers - 表头数组（无表头则传空数组或空字符串数组）
     * @param {Array[]} dataRows - 样本数据行（每行为单元格值数组）
     * @returns {Object} { word: colIdx, phonetic: colIdx, meaning: colIdx, example: colIdx }
     *          各字段值为 -1 表示未找到匹配列
     */
    autoMatchColumns(headers, dataRows) {
        const colCount = Math.max(headers.length, dataRows.length > 0 ? dataRows[0].length : 0);
        if (colCount === 0) return { word: 0, phonetic: -1, meaning: -1, example: -1 };

        // 收集每列的样本数据（最多取前 30 行）
        const sampleSize = Math.min(30, dataRows.length);
        const colSamples = [];
        for (let c = 0; c < colCount; c++) {
            const samples = [];
            for (let r = 0; r < sampleSize; r++) {
                if (dataRows[r] && dataRows[r][c] !== undefined && dataRows[r][c] !== null) {
                    samples.push(String(dataRows[r][c]).trim());
                }
            }
            colSamples.push(samples);
        }

        const headerText = headers.map(h => (h || '').toLowerCase().trim());

        // 对每列计算四种字段的得分
        const scores = [];
        for (let c = 0; c < colCount; c++) {
            const h = headerText[c] || '';
            const samples = colSamples[c];
            const nonEmpty = samples.filter(s => s.length > 0);
            const n = nonEmpty.length || 1;

            // ---- 统计特征 ----
            // 英文单词比例
            const engWordCount = nonEmpty.filter(s => this.isValidEnglishWord(s)).length;
            const engWordRate = engWordCount / n;

            // 含空格（多词/句子）比例
            const hasSpaceCount = nonEmpty.filter(s => /\s/.test(s)).length;
            const hasSpaceRate = hasSpaceCount / n;

            // 平均长度
            const avgLen = nonEmpty.reduce((sum, s) => sum + s.length, 0) / n;

            // 含中文比例
            const hasCnCount = nonEmpty.filter(s => /[\u4e00-\u9fa5]/.test(s)).length;
            const hasCnRate = hasCnCount / n;

            // 含「；」比例
            const hasSemiCount = nonEmpty.filter(s => /；/.test(s)).length;
            const hasSemiRate = hasSemiCount / n;

            // 含词性标签（n./v./adj./adv./prep./pron./conj. 等）比例
            const posTagCount = nonEmpty.filter(s => /^(n|v|adj|adv|prep|pron|conj|art|num|interj|det|aux|vi|vt)\./i.test(s.trim())).length;
            const posTagRate = posTagCount / n;

            // 含 IPA 音标符号比例
            const ipaChars = 'ˈˌːəɚɛɜɝɞɔɒæɪʊʌɑɐɨʉɯɤɵʏøœθðʃʒŋʧʤɾɹɡɲʎβɣχʁħʕʔ';
            const ipaPattern = new RegExp('[' + ipaChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ']');
            const ipaCount = nonEmpty.filter(s => ipaPattern.test(s) || /^\/.*\/$/.test(s.trim()) || /^\[.*\]$/.test(s.trim())).length;
            const ipaRate = ipaCount / n;

            // 含中文标点（逗号句号等）比例
            const cnPunctCount = nonEmpty.filter(s => /[，。！？、]/.test(s)).length;
            const cnPunctRate = cnPunctCount / n;

            // 单值（无空格、无中文、短文本）比例
            const singleWordCount = nonEmpty.filter(s => !/\s/.test(s) && !/[\u4e00-\u9fa5]/.test(s) && s.length <= 30).length;
            const singleWordRate = singleWordCount / n;

            // 中等长度（5-80 字符）比例
            const mediumLenCount = nonEmpty.filter(s => s.length >= 5 && s.length <= 80).length;
            const mediumLenRate = mediumLenCount / n;

            // 长文本（> 30 字符）比例
            const longTextCount = nonEmpty.filter(s => s.length > 30).length;
            const longTextRate = longTextCount / n;

            // ---- 计算得分 ----
            let wordScore = 0;
            let phoneticScore = 0;
            let meaningScore = 0;
            let exampleScore = 0;

            // == 单词列 ==
            // 表头匹配
            if (/词|语|word|vocab|term|phrase|english/i.test(h) && !/例句|释义|音标|meaning|definition|phonetic|pronunciation|翻译|中文|解释|例/.test(h)) {
                wordScore += 50;
            }
            // 数据特征：高英文单词率 + 低空格率 + 短文本
            wordScore += engWordRate * 30;
            wordScore += (1 - hasSpaceRate) * 15;
            wordScore += Math.max(0, Math.min(10, 10 - avgLen)); // 越短分越高
            // 空表头且数据像单词 → 额外加分
            if (!h && engWordRate > 0.6 && hasSpaceRate < 0.3) wordScore += 15;

            // == 音标列 ==
            // 表头匹配
            if (/音标|发音|phonetic|pronunciation|pronounce|ipa/i.test(h)) {
                phoneticScore += 50;
            }
            // 数据特征：含 IPA 符号
            phoneticScore += ipaRate * 40;
            // 含 // 或 [] 包围
            const slashBracketCount = nonEmpty.filter(s => /^\/.*\/$/.test(s.trim()) || /^\[.*\]$/.test(s.trim())).length;
            phoneticScore += (slashBracketCount / n) * 20;

            // == 释义列 ==
            // 表头匹配
            if (/释义|意思|含义|定义|meaning|definition|翻译|translation|中文|解释|注释|汉译|义项/i.test(h)) {
                meaningScore += 50;
            }
            // 数据特征：含中文 + 词性标签 + 含「；」
            meaningScore += hasCnRate * 25;
            meaningScore += posTagRate * 15;
            meaningScore += hasSemiRate * 10;
            // 中等长度
            meaningScore += mediumLenRate * 10;
            // 排除长文本（句子不像是释义）
            if (avgLen > 80) meaningScore -= 15;
            if (avgLen > 5 && avgLen <= 80) meaningScore += 5;

            // == 例句列 ==
            // 表头匹配
            if (/例句|例子|示例|范例|example|sentence|例|用例|e\.?g/i.test(h)) {
                exampleScore += 50;
            }
            // 数据特征：含空格（句子） + 较长文本 + 含中文标点（中文例句）
            exampleScore += hasSpaceRate * 20;
            exampleScore += longTextRate * 20;
            exampleScore += cnPunctRate * 10;
            // 含中文（中文例句）
            if (hasCnRate > 0.3) exampleScore += 10;
            // 短文本惩罚
            if (avgLen < 8) exampleScore -= 20;

            // 记录每列得分
            scores.push({ word: wordScore, phonetic: phoneticScore, meaning: meaningScore, example: exampleScore });
        }

        // 贪心分配：每轮选最高分且未被占用的列
        const assigned = new Set();
        const result = { word: -1, phonetic: -1, meaning: -1, example: -1 };
        const fields = ['word', 'phonetic', 'meaning', 'example'];

        // 多轮分配：优先分配得分明确的
        for (let round = 0; round < fields.length; round++) {
            let bestField = null;
            let bestCol = -1;
            let bestScore = -Infinity;

            for (const field of fields) {
                if (result[field] !== -1) continue; // 已分配
                for (let c = 0; c < colCount; c++) {
                    if (assigned.has(c)) continue;
                    const s = scores[c][field];
                    if (s > bestScore) {
                        bestScore = s;
                        bestField = field;
                        bestCol = c;
                    }
                }
            }

            if (bestField && bestCol >= 0 && bestScore > 0) {
                result[bestField] = bestCol;
                assigned.add(bestCol);
            } else {
                break; // 剩余列得分都 <= 0，不再分配
            }
        }

        // 若单词列未匹配到，回退到第 0 列
        if (result.word === -1 && colCount > 0) {
            result.word = 0;
        }

        console.log('🔍 自动列匹配结果:', result, '表头:', headers, '各列得分:', scores);
        return result;
    },

    /**
     * 判断首行是否为表头行
     */
    isHeaderRow(row) {
        if (!row || row.length === 0) return false;
        const text = row.map(c => String(c).toLowerCase().trim()).filter(Boolean).join(' ');
        // 包含典型的表头关键词
        const headerKeywords = /单词|词书|word|vocab|音标|发音|phonetic|释义|meaning|定义|例句|example|翻译|序号|编号|no\.|id|词性|词频|频率|词根|词缀|词源/i;
        // 且不全是英文单词（表头通常是中文或混合）
        const allEnglish = row.every(c => /^[a-zA-Z\s]+$/.test(String(c)));
        return headerKeywords.test(text) || allEnglish;
    },

    // 生成模板文件内容
    generateTemplate() {
        return `单词,音标,释义,例句
apple,/ˈæpl/,n. 苹果；苹果树,I eat an apple every day.
book,/bʊk/,n. 书；书籍; v. 预订,I love reading books.
happy,/ˈhæpi/,adj. 快乐的；幸福的,I am very happy today.
work,/wɜːrk/,n. 工作; v. 工作,We worked hard for the work.`;
    }
};

// 导出为全局变量
window.WordParser = WordParser;

