// ============================================
// 字典API - 自动补充单词信息
// ============================================

const DictionaryAPI = {
    // 内置常用单词数据库（用于离线场景）
    fallbackData: {
        'apple': {
            phonetic: '/ˈæpl/',
            definitions: [
                { pos: 'n.', meaning: '苹果；苹果树', example: 'I eat an apple every day.' },
                { pos: 'n.', meaning: '苹果公司', example: 'Apple released a new iPhone.' }
            ],
            synonyms: ['fruit'],
            antonyms: []
        },
        'book': {
            phonetic: '/bʊk/',
            definitions: [
                { pos: 'n.', meaning: '书；书籍', example: 'I love reading books.' },
                { pos: 'v.', meaning: '预订', example: 'I booked a hotel room.' }
            ],
            synonyms: ['volume', 'tome'],
            antonyms: []
        },
        'cat': {
            phonetic: '/kæt/',
            definitions: [
                { pos: 'n.', meaning: '猫', example: 'I have a cute cat.' }
            ],
            synonyms: ['feline', 'kitten'],
            antonyms: ['dog']
        },
        'dog': {
            phonetic: '/dɔːɡ/',
            definitions: [
                { pos: 'n.', meaning: '狗', example: 'Dogs are loyal animals.' }
            ],
            synonyms: ['canine', 'puppy'],
            antonyms: ['cat']
        },
        'happy': {
            phonetic: '/ˈhæpi/',
            definitions: [
                { pos: 'adj.', meaning: '快乐的；幸福的', example: 'I am very happy today.' },
                { pos: 'adj.', meaning: '满意的', example: 'I am happy with the result.' }
            ],
            synonyms: ['joyful', 'cheerful', 'glad'],
            antonyms: ['sad', 'unhappy']
        },
        'sad': {
            phonetic: '/sæd/',
            definitions: [
                { pos: 'adj.', meaning: '悲伤的；难过的', example: 'She felt sad after the movie.' }
            ],
            synonyms: ['unhappy', 'sorrowful', 'melancholy'],
            antonyms: ['happy', 'joyful']
        },
        'run': {
            phonetic: '/rʌn/',
            definitions: [
                { pos: 'v.', meaning: '跑；奔跑', example: 'He runs every morning.' },
                { pos: 'v.', meaning: '经营；管理', example: 'She runs a small business.' }
            ],
            synonyms: ['sprint', 'jog'],
            antonyms: ['walk', 'stop']
        },
        'beautiful': {
            phonetic: '/ˈbjuːtɪfl/',
            definitions: [
                { pos: 'adj.', meaning: '美丽的；漂亮的', example: 'She is a beautiful girl.' }
            ],
            synonyms: ['pretty', 'gorgeous', 'stunning'],
            antonyms: ['ugly', 'hideous']
        },
        'learn': {
            phonetic: '/lɜːrn/',
            definitions: [
                { pos: 'v.', meaning: '学习；学会', example: 'I want to learn English.' },
                { pos: 'v.', meaning: '得知；了解', example: 'I learned the news yesterday.' }
            ],
            synonyms: ['study', 'master'],
            antonyms: ['forget', 'unlearn']
        },
        'computer': {
            phonetic: '/kəmˈpjuːtər/',
            definitions: [
                { pos: 'n.', meaning: '计算机；电脑', example: 'I use my computer every day.' }
            ],
            synonyms: ['PC', 'laptop'],
            antonyms: []
        },
        'hello': {
            phonetic: '/həˈləʊ/',
            definitions: [
                { pos: 'interj.', meaning: '你好', example: 'Hello, how are you?' }
            ],
            synonyms: ['hi', 'hey'],
            antonyms: ['goodbye', 'bye']
        },
        'world': {
            phonetic: '/wɜːrld/',
            definitions: [
                { pos: 'n.', meaning: '世界；地球', example: 'The world is full of wonders.' }
            ],
            synonyms: ['earth', 'globe'],
            antonyms: []
        },
        'love': {
            phonetic: '/lʌv/',
            definitions: [
                { pos: 'v.', meaning: '爱；热爱', example: 'I love you.' },
                { pos: 'n.', meaning: '爱；爱情', example: 'Love is beautiful.' }
            ],
            synonyms: ['adore', 'cherish'],
            antonyms: ['hate', 'dislike']
        },
        'good': {
            phonetic: '/ɡʊd/',
            definitions: [
                { pos: 'adj.', meaning: '好的；优秀的', example: 'This is a good book.' }
            ],
            synonyms: ['great', 'excellent', 'fine'],
            antonyms: ['bad', 'poor']
        },
        'bad': {
            phonetic: '/bæd/',
            definitions: [
                { pos: 'adj.', meaning: '坏的；糟糕的', example: 'That was a bad decision.' }
            ],
            synonyms: ['poor', 'terrible'],
            antonyms: ['good', 'excellent']
        },
        'big': {
            phonetic: '/bɪɡ/',
            definitions: [
                { pos: 'adj.', meaning: '大的；巨大的', example: 'This is a big house.' }
            ],
            synonyms: ['large', 'huge', 'enormous'],
            antonyms: ['small', 'tiny']
        },
        'small': {
            phonetic: '/smɔːl/',
            definitions: [
                { pos: 'adj.', meaning: '小的；少的', example: 'I need a small bag.' }
            ],
            synonyms: ['tiny', 'little'],
            antonyms: ['big', 'large']
        },
        'water': {
            phonetic: '/ˈwɔːtər/',
            definitions: [
                { pos: 'n.', meaning: '水', example: 'I drink water every day.' }
            ],
            synonyms: ['H2O'],
            antonyms: []
        },
        'food': {
            phonetic: '/fuːd/',
            definitions: [
                { pos: 'n.', meaning: '食物；食品', example: 'I like Chinese food.' }
            ],
            synonyms: ['meal', 'cuisine'],
            antonyms: []
        },
        'time': {
            phonetic: '/taɪm/',
            definitions: [
                { pos: 'n.', meaning: '时间', example: 'What time is it?' },
                { pos: 'n.', meaning: '次数；倍', example: 'This is the third time.' }
            ],
            synonyms: ['moment', 'period'],
            antonyms: []
        },
        'surge': {
            phonetic: '/sɜːrdʒ/',
            definitions: [
                { pos: 'n.', meaning: '激增；浪潮', example: 'There was a surge in demand.' },
                { pos: 'v.', meaning: '急剧上升', example: 'Prices surged overnight.' }
            ],
            synonyms: ['increase', 'rise', 'swell'],
            antonyms: ['decline', 'decrease']
        },
        'controversy': {
            phonetic: '/ˈkɑːntrəvɜːrsi/',
            definitions: [
                { pos: 'n.', meaning: '争议；争论', example: 'The decision caused much controversy.' }
            ],
            synonyms: ['debate', 'dispute', 'argument'],
            antonyms: ['agreement', 'consensus']
        },
        'inquire': {
            phonetic: '/ɪnˈkwaɪər/',
            definitions: [
                { pos: 'v.', meaning: '询问；调查', example: 'I inquired about the price.' }
            ],
            synonyms: ['ask', 'question', 'investigate'],
            antonyms: ['answer', 'respond']
        },
        'plot': {
            phonetic: '/plɑːt/',
            definitions: [
                { pos: 'n.', meaning: '情节；阴谋', example: 'The movie has an interesting plot.' },
                { pos: 'v.', meaning: '策划；绘制', example: 'They plotted to overthrow the government.' }
            ],
            synonyms: ['scheme', 'plan', 'story'],
            antonyms: []
        },
        'contempt': {
            phonetic: '/kənˈtempt/',
            definitions: [
                { pos: 'n.', meaning: '轻视；鄙视', example: 'He showed contempt for the rules.' }
            ],
            synonyms: ['scorn', 'disdain', 'disrespect'],
            antonyms: ['respect', 'admiration']
        },
        'clumsy': {
            phonetic: '/ˈklʌmzi/',
            definitions: [
                { pos: 'adj.', meaning: '笨拙的；不灵活的', example: 'He is clumsy with his hands.' }
            ],
            synonyms: ['awkward', 'ungainly', 'inept'],
            antonyms: ['graceful', 'skillful', 'dexterous']
        }
    },

    // 生成标准音标（基于常见规则）
    generatePhonetic(word) {
        const lower = word.toLowerCase();
        
        // 如果在内置数据中，直接返回
        if (this.fallbackData[lower]) {
            return this.fallbackData[lower].phonetic;
        }
        
        // 简单的音标生成规则（仅作为备用）
        return `/${word}/`;
    },

    // 生成常用释义
    generateDefinitions(word) {
        const lower = word.toLowerCase();
        
        // 如果在内置数据中，直接返回
        if (this.fallbackData[lower]) {
            return this.fallbackData[lower].definitions;
        }
        
        // 备用：返回基础模板
        return [
            {
                pos: 'n.',
                meaning: `${word}（请补充释义）`,
                example: `This is a ${word}.`
            }
        ];
    },

    // 生成同义词
    generateSynonyms(word) {
        const lower = word.toLowerCase();
        
        if (this.fallbackData[lower]) {
            return this.fallbackData[lower].synonyms;
        }
        
        return [];
    },

    // 生成反义词
    generateAntonyms(word) {
        const lower = word.toLowerCase();
        
        if (this.fallbackData[lower]) {
            return this.fallbackData[lower].antonyms;
        }
        
        return [];
    },

    // 自动补全单词信息（主函数）
    async enrichWord(word) {
        const wordText = typeof word === 'string' ? word : word.word;
        
        // 如果已经有完整信息，直接返回
        if (typeof word === 'object' && word.phonetic && word.definitions) {
            return word;
        }
        
        try {
            // 尝试使用内置数据
            const data = this.fallbackData[wordText.toLowerCase()];
            
            if (data) {
                return {
                    word: wordText,
                    phonetic: data.phonetic,
                    definitions: data.definitions,
                    synonyms: data.synonyms || [],
                    antonyms: data.antonyms || []
                };
            }
            
            // 如果没有数据，生成基础模板
            return {
                word: wordText,
                phonetic: this.generatePhonetic(wordText),
                definitions: this.generateDefinitions(wordText),
                synonyms: this.generateSynonyms(wordText),
                antonyms: this.generateAntonyms(wordText)
            };
            
        } catch (error) {
            console.error('补全单词信息失败:', error);
            
            // 返回基础模板
            return {
                word: wordText,
                phonetic: `/${wordText}/`,
                definitions: [{
                    pos: 'n.',
                    meaning: `${wordText}`,
                    example: `This is ${wordText}.`
                }],
                synonyms: [],
                antonyms: []
            };
        }
    },

    // 批量补全单词
    async enrichWords(words) {
        const enriched = [];
        
        for (const word of words) {
            try {
                const enrichedWord = await this.enrichWord(word);
                enriched.push(enrichedWord);
                
                // 添加小延迟避免过快
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.error('处理单词失败:', word, error);
                // 即使失败也添加基础数据
                enriched.push({
                    word: typeof word === 'string' ? word : word.word,
                    phonetic: `/${word}/`,
                    definitions: [{ pos: 'n.', meaning: '请补充释义', example: '' }],
                    synonyms: [],
                    antonyms: []
                });
            }
        }
        
        return enriched;
    },

    // 获取干扰选项（用于选择题）
    getDistractors(correctWord, allWords, count = 3) {
        const distractors = [];
        
        // 从所有其他单词中随机选择干扰项
        const candidates = allWords.filter(w => w.word !== correctWord.word);
        const shuffled = this.shuffleArray([...candidates]);
        
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            // 选择第一个定义作为干扰项，同时保存原词
            const def = shuffled[i].definitions[0];
            distractors.push({
                meaning: def.meaning,
                word: shuffled[i].word
            });
        }
        
        // 如果干扰项不够，生成一些通用的
        while (distractors.length < count) {
            distractors.push({
                meaning: '其他含义（请选择正确答案）',
                word: null
            });
        }
        
        return distractors;
    },

    // 随机打乱数组
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
};

// 导出为全局变量
window.DictionaryAPI = DictionaryAPI;

