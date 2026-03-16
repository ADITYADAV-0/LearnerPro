import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

if(!process.env.GEMINI_API_KEY) {
    console.error('FATAL ERROR: GEMINI_API_KEY is not set in the environment variable');
    process.exit(1);
}


/**
 * 
 * @param { string } text
 * @param { number } count
 * @returns { Promise<Array<{question: string, answer: string, difficulty: string}>>}
 */

export const generateFlashcards = async(text, count= 10) => {
    const prompt = `Generate exactly ${count} educational flashcards from the follwing text.
    Format each card as:
    Q: [Clear, specific question]
    A: [Concise, accurate answer]
    D: [Difficulty level: easy, medium, or hard]
    
    Separate each flashcard with "---"
    
    Text: 
    ${text.substring(0,15000)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt
        });

        const generatedText = response.text;

        const flashcards = [];

        const cards = generatedText.split('---').filter(c=>c.trim());


        for(const card of cards){
            const lines = card.trim().split('\n');
            let question = '', answer = '', difficulty = 'medium';

            for(const line of lines) {
                if(line.startsWith('Q:')) {
                    question = line.substring(2).trim();
                } else if (line.startsWith('A:')){
                    answer = line.substring(2).trim();
                } else if (line.startsWith('D:')) {
                    const diff = line.substring(2).trim().toLowerCase();
                    if(['easy','medium','hard'].includes(diff)) {
                        difficulty = diff;
                    }
                }
            }

            if(question && answer) {
                flashcards.push({ question, answer, difficulty});
            } 
        }

        return flashcards.slice(0, count);
    } catch (error) {
        console.error('Gemini Api error: ', error);
        throw new Error('Failed to generate flashcards');
    }
};

/**
 * 
 * @param { string } text
 * @param { number } numQuestions
 * @returns { Promise<Array<{question: string, option:Array, correctAnswer: string,explanation: string, difficulty: string}>>}
 */

export const generateQuiz = async (text, numQuestions = 5) => {
    const prompt = `Generate exactly ${numQuestions} multiple choice questions from the following text.
    Format each question as:
    Q: [Question]
    O1: [Option 1]
    O2: [Option 2]
    O3: [Option 3]
    O4: [Option 4]
    C: [Correct option - exaclty as written above]
    E: [Brief Explanation]
    D: [Difficulty: easy, meduim, or hard]

    sepearate question with "---"
    Text:
    ${text.substring(0,15000)}`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt
        });

        const generatedText = response.text;

        const questions = [];

        const questionBlocks = generatedText.split('---').filter(q => q.trim());

        for(const block of questionBlocks){
            const lines = block.trim().split('\n');
            let question = '', option = [], correctAnswer = '', explanation = '', difficulty = 'medium';

            for(const line of lines) {
                const trimmed = line.trim();
                if(trimmed.startsWith('Q:')) {
                    question = trimmed.substring(2).trim();
                } else if (trimmed.match(/^O\d:/)){
                    option.push(trimmed.substring(3).trim());
                } else if(trimmed.startsWith('C:')) {
                    correctAnswer = trimmed.substring(2).trim(); 
                } else if(trimmed.startsWith('E:')) {
                    explanation = trimmed.substring(2).trim();
                } else if (trimmed.startsWith('D:')) {
                    const diff = trimmed.substring(2).trim().toLowerCase();
                    if(['easy','medium','hard'].includes(diff)) {
                        difficulty = diff;
                    }
                }
            }

            if(question && option.length === 4 && correctAnswer) {
                questions.push({ question, option, correctAnswer, explanation, difficulty});
            } 
        }

        return questions.slice(0, numQuestions)
    } catch (error) {
        console.error('Gemini Api key error:', error);
        throw new Error ('Failed to generate quiz');
    }
};

/**
 * 
 * @param { string } text
 * @returns {Promise<string>}
 */
export const generateSummary = async (text) => {
    const prompt = `Provide a concise summary of the following text, highlighting the key concept, main ideas, and important points
    Keep the summary clear and structured
    
    Text:
    ${text.substring(0, 20000)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt
        });
        const generatedText = response.text;
        return generatedText
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to generate summary');     
    }
};

/**
 * 
 * @param { string } question
 * @param { Array<Object>} chunks
 * @returns {Promise<string>}
 */
export const chatWithContext = async (question, chunks) => {
    const context = chunks.map((c, i) => `[Chunk ${i+1}]\n${c.content}`).join('\n\n');

    const prompt = `Based on following context from a document, Analyse the context and answer the user's question
    If the answer is not in the context, say so.
    
    Context:
    ${context}
    
    Question: ${question}
    
    Answer:`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt
        });
    const generatedText = response.text;
    return generatedText
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to process chat request');
    }
};

/**
 * 
 * @param {string} concept
 * @param {string} context
 * @return {Promise<string>}
 */
export const explainConcept = async (concept, context) => {
    const prompt = `Explain the concept of "${concept}" based on the following context.
    Provide a clear, educational explanation that's easy to understand.
    Inculde examples If relevant.
    
    Context:
    ${context.substring(0, 10000)}`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt
        });
        const generatedText = response.text;
        return generatedText
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to explain the concept');
    }
}
