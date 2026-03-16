/**
 * split text into chunks
 * @param {string} text - the text to be chunked
 * @param {number} chunkSize - the size of each chunk
 * @param {number} overlap - the overlap between chunks
 * @returns {Array<{content: string, chunkIndex: number, pageNumber: number}>}
 */

// no external imports required for this utility

// escape a string for use in RegExp
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const chunkText = (text, chunkSize = 500, overlap = 50) => {
    if(!text || text.trim().length===0) {
        return [];
    }

    const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .trim();

    const paragraphs = cleanedText.split(/\n+/).filter(p => p.trim().length > 0);

    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
        const paragraphWords = paragraph.trim().split(/\s+/);
        const paragraphWordCount = paragraphWords.length;

        if(paragraphWordCount > chunkSize) {
            if(currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk.join('\n\n'),
                    chunkIndex: chunkIndex++,
                    pageNumber: 0
                });
                currentChunk = [];
                currentWordCount = 0;
            }

            for(let i=0; i < paragraphWords.length; i += (chunkSize-overlap)) {
                const chunkWords = paragraphWords.slice(i, i + chunkSize);
                chunks.push({
                 content: chunkWords.join(' '),
                    chunkIndex: chunkIndex++,
                    pageNumber: 0   
                });

                if(i + chunkSize >=paragraphWords.length) break;
            }
            continue;
        }

        if(currentWordCount + paragraphWordCount > chunkSize && currentChunk.length > 0) {
            chunks.push({
                content: currentChunk.join('\n\n'),
                    chunkIndex: chunkIndex++,
                    pageNumber: 0
            });

            const prevChunkText = currentChunk.join(' ');
            const prevWords = prevChunkText.split(/\s+/);
            const overlapText = prevWords.slice(-Math.min(overlap, prevWords.length)).join(' ');

            currentChunk = [overlapText, paragraph.trim()];
            currentWordCount = overlapText.split(/\s+/).length + paragraphWordCount;
        } else {
            currentChunk.push(paragraph.trim());
            currentWordCount += paragraphWordCount;
        }
    }
        if (currentChunk.length > 0){
            chunks.push({
                content: currentChunk.join('\n\n'),
                chunkIndex: chunkIndex++,
                pageNumber: 0   
            });  
        }

        if(chunks.length === 0 && cleanedText.length > 0 ) {
            const allWords = cleanedText.split(/\s+/);
            for(let i=0; i < allWords.length; i += (chunkSize - overlap)) {
                const chunkWords = allWords.slice(i, i + chunkSize);
                chunks.push({
                content: chunkWords.join(' '),
                    chunkIndex: chunkIndex++,
                    pageNumber: 0
                });

                if(i + chunkSize >= allWords.length) break;
            }
        }

    return chunks;
};



/**
 * @param {Array<Object>} chunks
 * @param {string} query
 * @param {number} maxChunks
 * @returns {Array<Object>}
 */

export const findRelevantChunks = (chunks, query, maxChunks = 3) => {
    if(!chunks || chunks.length === 0 || !query) {
        return [];
    }

    const stopWords = new Set ([
        'the','is','at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that', 'it' 
    ]);

        const queryWord = query
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));

    if(queryWord.length === 0) {
        return chunks.slice(0, maxChunks).map(chunk => ({
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            _id: chunk._id
        }));
    }

    const scoredChunks = chunks.map((chunk, index) => {
        const content = chunk.content.toLowerCase();
        const contentWords = content.split(/\s+/).length;
        let score = 0;

        for(const word of queryWord) {
            const esc = escapeRegExp(word);
            const exactMatches = (content.match(new RegExp(`\\b${esc}\\b`, 'g')) || []).length;
            score += exactMatches*3;

            const partialMatch = (content.match(new RegExp(esc, 'g')) || []).length;
            score += Math.max(0, partialMatch - exactMatches) * 1.5;
        }

        const uniqueWordsFound = queryWord.filter(word =>
            content.includes(word)
        ).length;
        if ( uniqueWordsFound > 1) {
            score += uniqueWordsFound * 2;
        }

        const normalizedScore = score/Math.sqrt(contentWords);

        const positionBonus = 1 - (index / chunks.length) * 0.1;

        return {
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            _id: chunk._id,
            score: normalizedScore * positionBonus,
            rawscore: score,
            matchedWords: uniqueWordsFound
        };
    });

    const rankedChunks = scoredChunks
        .filter(chunk =>chunk.score>0)
        .sort((a,b) => {
            if(b.score !== a.score){
                return b.score-a.score;
            }
            if(b.matchedWords !== a.matchedWords){
                return b.matchedWords - a.matchedWords;
            }
            return a.chunkIndex - b.chunkIndex;
        })
        .slice(0, maxChunks);

    // For generic queries (e.g., "what is this document about"),
    // keyword overlap can be zero even with valid context.
    if (rankedChunks.length === 0) {
        return chunks.slice(0, maxChunks).map(chunk => ({
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            _id: chunk._id
        }));
    }

    return rankedChunks;
};
