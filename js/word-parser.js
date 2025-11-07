// ============================================
// 文档解析模块 - 支持多种格式
// ============================================

const WordParser = {
    // 解析TXT文件
    async parseTXT(file) {
        const text = await this.readFileAsText(file);
        const lines = text.split('\n').filter(line => line.trim());
        const words = [];

        for (const line of lines) {
            // 支持多种分隔符：逗号、制表符、分号
            const parts = line.split(/[,\t;]/).map(p => p.trim());
            
            if (parts.length === 1) {
                // 仅包含单词
                const cleanedWord = this.cleanWord(parts[0]);
                if (this.isValidEnglishWord(cleanedWord)) {
                    words.push({ word: cleanedWord });
                }
            } else {
                // 包含更多信息
                // 新格式：单词, 音标, 释义（包含词性）, 例句
                const cleanedWord = this.cleanWord(parts[0]);
                
                // 验证单词是否有效
                if (!this.isValidEnglishWord(cleanedWord)) {
                    continue; // 跳过无效单词
                }
                
                const word = {
                    word: cleanedWord,
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

        return words;
    },

    // 解析CSV文件
    async parseCSV(file) {
        const text = await this.readFileAsText(file);
        const lines = text.split('\n').filter(line => line.trim());
        const words = [];

        // 跳过表头（如果有）
        let startIndex = 0;
        if (lines.length > 0) {
            const firstLine = lines[0].toLowerCase();
            if (firstLine.includes('word') || firstLine.includes('单词')) {
                startIndex = 1;
            }
        }

        for (let i = startIndex; i < lines.length; i++) {
            const parts = this.parseCSVLine(lines[i]);
            
            if (parts.length === 0 || !parts[0]) continue;

            // 清洗和验证单词
            const cleanedWord = this.cleanWord(parts[0]);
            if (!this.isValidEnglishWord(cleanedWord)) {
                continue; // 跳过无效单词
            }

            // 新格式：单词, 音标, 释义（包含词性）, 例句
            const word = {
                word: cleanedWord,
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
                    
                    const words = [];
                    
                    // 跳过表头
                    let startIndex = 0;
                    if (rows.length > 0) {
                        const firstRow = rows[0].map(cell => String(cell).toLowerCase());
                        console.log('📋 表头（第1行）:', rows[0]);
                        console.log(`📌 列数: ${rows[0].length}`);
                        
                        if (firstRow.some(cell => cell.includes('word') || cell.includes('单词'))) {
                            startIndex = 1;
                            console.log('✅ 检测到表头，从第2行开始解析');
                        } else {
                            console.log('ℹ️ 未检测到表头，从第1行开始解析');
                        }
                    }

                    for (let i = startIndex; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row[0]) continue;

                    // 清洗和验证单词
                    const cleanedWord = this.cleanWord(String(row[0]));
                    if (!this.isValidEnglishWord(cleanedWord)) {
                        console.log(`⚠️ 跳过无效单词: "${row[0]}"`);
                        continue; // 跳过无效单词
                    }

                    // 调试信息：打印前3行数据结构
                    if (i < startIndex + 3) {
                        console.log(`📊 Excel第${i + 1}行数据 (共${row.length}列):`, row);
                    }

                        // 新格式：单词, 音标, 释义（包含词性）, 例句
                        const word = {
                            word: cleanedWord,
                            phonetic: row[1] ? String(row[1]).trim() : '',
                            definitions: []
                        };

                        if (row.length >= 3) {
                            // row[2] 现在是完整释义（包含词性）
                            const meaning = row[2] ? String(row[2]).trim() : '';
                            const example = row[3] ? String(row[3]).trim() : '';
                            
                            // 调试信息
                            if (i < startIndex + 3) {
                                console.log(`  ↳ 单词: "${word.word}", 音标: "${word.phonetic}", 释义: "${meaning}", 例句: "${example}"`);
                            }
                            
                            word.definitions.push({ pos: '', meaning, example });
                        }

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
        return [
            {
                word: 'apple',
                phonetic: '/ˈæpl/',
                definitions: [
                    { pos: '', meaning: 'n. 苹果；苹果树', example: 'I eat an apple every day.' }
                ],
                synonyms: ['fruit'],
                antonyms: []
            },
            {
                word: 'book',
                phonetic: '/bʊk/',
                definitions: [
                    { pos: '', meaning: 'n. 书；书籍\nv. 预订', example: 'I love reading books.' }
                ],
                synonyms: ['volume', 'tome'],
                antonyms: []
            },
            {
                word: 'happy',
                phonetic: '/ˈhæpi/',
                definitions: [
                    { pos: '', meaning: 'adj. 快乐的；幸福的', example: 'I am very happy today.' }
                ],
                synonyms: ['joyful', 'cheerful'],
                antonyms: ['sad']
            },
            {
                word: 'learn',
                phonetic: '/lɜːrn/',
                definitions: [
                    { pos: '', meaning: 'v. 学习；学会', example: 'I want to learn English.' }
                ],
                synonyms: ['study', 'master'],
                antonyms: ['forget']
            },
            {
                word: 'beautiful',
                phonetic: '/ˈbjuːtɪfl/',
                definitions: [
                    { pos: '', meaning: 'adj. 美丽的；漂亮的', example: 'She is a beautiful girl.' }
                ],
                synonyms: ['pretty', 'gorgeous'],
                antonyms: ['ugly']
            },
            {
                word: 'computer',
                phonetic: '/kəmˈpjuːtər/',
                definitions: [
                    { pos: '', meaning: 'n. 计算机；电脑', example: 'I use my computer every day.' }
                ],
                synonyms: ['PC', 'laptop'],
                antonyms: []
            },
            {
                word: 'friend',
                phonetic: '/frend/',
                definitions: [
                    { pos: '', meaning: 'n. 朋友', example: 'He is my best friend.' }
                ],
                synonyms: ['companion', 'buddy'],
                antonyms: ['enemy']
            },
            {
                word: 'love',
                phonetic: '/lʌv/',
                definitions: [
                    { pos: '', meaning: 'v. 爱；热爱\nn. 爱；爱情', example: 'I love you.' }
                ],
                synonyms: ['adore', 'cherish'],
                antonyms: ['hate']
            },
            {
                word: 'run',
                phonetic: '/rʌn/',
                definitions: [
                    { pos: '', meaning: 'v. 跑；奔跑', example: 'He runs every morning.' }
                ],
                synonyms: ['sprint', 'jog'],
                antonyms: ['walk']
            },
            {
                word: 'time',
                phonetic: '/taɪm/',
                definitions: [
                    { pos: '', meaning: 'n. 时间', example: 'What time is it?' }
                ],
                synonyms: ['moment', 'period'],
                antonyms: []
            },
            {
                word: 'water',
                phonetic: '/ˈwɔːtər/',
                definitions: [
                    { pos: '', meaning: 'n. 水', example: 'I drink water every day.' }
                ],
                synonyms: ['H2O'],
                antonyms: []
            },
            {
                word: 'world',
                phonetic: '/wɜːrld/',
                definitions: [
                    { pos: '', meaning: 'n. 世界；地球', example: 'The world is full of wonders.' }
                ],
                synonyms: ['earth', 'globe'],
                antonyms: []
            },
            {
                word: 'good',
                phonetic: '/ɡʊd/',
                definitions: [
                    { pos: '', meaning: 'adj. 好的；优秀的', example: 'This is a good book.' }
                ],
                synonyms: ['great', 'excellent'],
                antonyms: ['bad']
            },
            {
                word: 'big',
                phonetic: '/bɪɡ/',
                definitions: [
                    { pos: '', meaning: 'adj. 大的；巨大的', example: 'This is a big house.' }
                ],
                synonyms: ['large', 'huge'],
                antonyms: ['small']
            },
            {
                word: 'hello',
                phonetic: '/həˈləʊ/',
                definitions: [
                    { pos: '', meaning: 'interj. 你好', example: 'Hello, how are you?' }
                ],
                synonyms: ['hi', 'hey'],
                antonyms: ['goodbye']
            },
            {
                word: 'cat',
                phonetic: '/kæt/',
                definitions: [
                    { pos: '', meaning: 'n. 猫', example: 'I have a cute cat.' }
                ],
                synonyms: ['feline', 'kitten'],
                antonyms: ['dog']
            },
            {
                word: 'dog',
                phonetic: '/dɔːɡ/',
                definitions: [
                    { pos: '', meaning: 'n. 狗', example: 'Dogs are loyal animals.' }
                ],
                synonyms: ['canine', 'puppy'],
                antonyms: ['cat']
            },
            {
                word: 'food',
                phonetic: '/fuːd/',
                definitions: [
                    { pos: '', meaning: 'n. 食物；食品', example: 'I like Chinese food.' }
                ],
                synonyms: ['meal', 'cuisine'],
                antonyms: []
            },
            {
                word: 'small',
                phonetic: '/smɔːl/',
                definitions: [
                    { pos: '', meaning: 'adj. 小的；少的', example: 'I need a small bag.' }
                ],
                synonyms: ['tiny', 'little'],
                antonyms: ['big']
            },
            {
                word: 'sad',
                phonetic: '/sæd/',
                definitions: [
                    { pos: '', meaning: 'adj. 悲伤的；难过的', example: 'She felt sad after the movie.' }
                ],
                synonyms: ['unhappy', 'sorrowful'],
                antonyms: ['happy']
            }
        ];
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

