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
                words.push({ word: parts[0] });
            } else {
                // 包含更多信息
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

                        // 调试信息：打印前3行数据结构
                        if (i < startIndex + 3) {
                            console.log(`📊 Excel第${i + 1}行数据 (共${row.length}列):`, row);
                        }

                        // 新格式：单词, 音标, 释义（包含词性）, 例句
                        const word = {
                            word: String(row[0]).trim(),
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

    // 主解析函数
    async parse(file) {
        const fileName = file.name.toLowerCase();
        
        try {
            let words = [];

            if (fileName.endsWith('.txt')) {
                words = await this.parseTXT(file);
            } else if (fileName.endsWith('.csv')) {
                words = await this.parseCSV(file);
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                words = await this.parseExcel(file);
            } else if (fileName.endsWith('.docx')) {
                words = await this.parseDOCX(file);
            } else {
                throw new Error('不支持的文件格式');
            }

            // 过滤空单词
            words = words.filter(w => w.word && w.word.trim());

            // 检查是否需要补充信息
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

