import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import ChatHistory from '../models/ChatHistory.js';
import * as geminiService from '../utils/geminiService.js';
import {chunkText, findRelevantChunks} from '../utils/textChunker.js';

export const generateFlashcards = async (req, res, next) => {
    try {
        const { documentId, count = 10 } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400,
            });
        }

        const document =await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'Ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document Not Found',
                statusCode: 404,
            });
        }

        const cards = await geminiService.generateFlashcards(
            document.extractedText,
            parseInt(count)
        );

        const normalizeDifficulty = (d) => {
            const diff = (d || 'medium').toString().toLowerCase();
            if (['easy', 'medium', 'hard'].includes(diff)) {
                return diff.charAt(0).toUpperCase() + diff.slice(1);
            }
            return 'Medium';
        };

        const flashcardSet = await Flashcard.create({
            userId: req.user._id,
            DocumentId: document._id,
            cards: cards.map(card => ({
                question: card.question,
                answer: card.answer,
                difficulty: normalizeDifficulty(card.difficulty),
                reviewCount: 0,
                isStarred: false
            }))
        });

        res.status(201).json({
            success: true,
            data: flashcardSet,
            message: 'Flashcard generated successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const generateQuiz = async (req, res, next) => {
    try {
        const { documentId, numQuestions = 5, title } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400,
            });
        }

        const document =await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'Ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document Not Found',
                statusCode: 404,
            });
        }

        const questions = await geminiService.generateQuiz(
            document.extractedText,
            parseInt(numQuestions)
        );

        const normalizeDifficulty = (d) => {
            const diff = (d || 'medium').toString().toLowerCase();
            if (['easy', 'medium', 'hard'].includes(diff)) {
                return diff.charAt(0).toUpperCase() + diff.slice(1);
            }
            return 'Medium';
        };

        const normalizeCorrectAnswer = (correctRaw, optionsArr) => {
            if(!correctRaw || !optionsArr || !Array.isArray(optionsArr)) return '';
            const txt = correctRaw.toString().trim();

            // Patterns: O1/O2, 1./2., A)/B)/A/B, 0-based like 0,1, or full option text
            const oMatch = txt.match(/^O\s*(\d)$/i);
            if(oMatch){
                const idx = parseInt(oMatch[1], 10) - 1;
                return optionsArr[idx] || '';
            }

            const numMatch = txt.match(/^(\d+)\.?$/);
            if(numMatch){
                const idx = parseInt(numMatch[1], 10) - 1;
                return optionsArr[idx] || '';
            }

            const letterMatch = txt.match(/^([A-D])\)?$/i);
            if(letterMatch){
                const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
                return optionsArr[idx] || '';
            }

            // If the correctRaw looks like something like "1) Option text" or "A) Option"
            const idxInline = txt.match(/^[A-D]\)\s*(.*)$/i);
            if(idxInline){
                const letter = txt[0].toUpperCase();
                const idx = letter.charCodeAt(0) - 65;
                return optionsArr[idx] || idxInline[1] || '';
            }

            // Otherwise try to find exact match in options
            const exact = optionsArr.find(opt => opt.trim() === txt);
            if(exact) return exact;

            // Try fuzzy match: remove leading labels like "1.", "A)", "O1:" etc
            const cleaned = txt.replace(/^[A-DF\d\)\.:\s]+/, '').trim();
            const fuzzy = optionsArr.find(opt => opt.trim() === cleaned);
            if(fuzzy) return fuzzy;

            // fallback to empty string to avoid storing invalid value
            return '';
        };

        const quiz = await Quiz.create({
            userId: req.user._id,
            documentId: document._id,
            title: title || `${document.title} - Quiz`,
            questions: (questions || []).map(q => {
                const opts = q.option || q.options || [];
                const mappedCorrect = normalizeCorrectAnswer(q.correctAnswer, opts) || q.correctAnswer || '';
                return {
                    question: q.question,
                    options: opts,
                    correctAnswer: mappedCorrect,
                    explanation: q.explanation || '',
                    difficulty: normalizeDifficulty(q.difficulty)
                };
            }),
            totalQuestions: (questions || []).length,
            userAnswers: [],
            score: 0
        });

        res.status(201).json({
            success: true,
            data: quiz,
            message: 'Quiz generated successfully'
        }); 
    } catch (error) {
        next(error);
    }
};

export const generateSummary = async (req, res, next) => {
    try {
        const { documentId } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400,
            });
        }

        const document =await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'Ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document Not Found',
                statusCode: 404,
            });
        }

        const summary = await geminiService.generateSummary(
            document.extractedText
        );

        res.status(200).json({
            success: true,
            data: {
                documentId: document._id,
                title: document.title,
                summary
            },
            message: 'Summary generated successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const chat = async (req, res, next) => {
    try {
        const { documentId, question} = req.body;

        if (!documentId || !question) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId and question',
                statusCode: 400,
            });
        }

        const document =await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'Ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document Not Found',
                statusCode: 404,
            });
        }

        const availableChunks = (document.chunks && document.chunks.length > 0)
            ? document.chunks
            : chunkText(document.extractedText || '');

        const relevantChunks = findRelevantChunks(availableChunks, question, 3);
        const chunkIndices = relevantChunks.map(c => c.chunkIndex);

        let chatHistory = await ChatHistory.findOne({
            userId: req.user._id,
            DocumentId: document._id
        });

        if(!chatHistory){
            chatHistory = await ChatHistory.create({
                userId: req.user._id,
                DocumentId: document._id,
                message: []
            });
        }

        const answer = await geminiService.chatWithContext(question, relevantChunks);

        chatHistory.message.push({
            role: 'user', 
            content: question,
            timestamp: new Date(),
            relevantChunks: []
        },
        {
            role: 'assistant',
            content: answer,
            timestamp: new Date(),
            relevantChunks: chunkIndices
        });

        await chatHistory.save();

        res.status(200).json({
            success: true,
            data: {
                question,
                answer,
                relevantChunks: chunkIndices,
                chatHistoryId: chatHistory._id,
            },
            message: 'Response generated successfully'
        });

    } catch (error) {
        next(error);
    }
};

export const explainConcept = async (req, res, next) => {
    try {
        const { documentId, concept } = req.body;

        if (!documentId || !concept) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId and concept',
                statusCode: 400,
            });
        }

        const document =await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'Ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document Not Found',
                statusCode: 404,
            });
        }

        const availableChunks = (document.chunks && document.chunks.length > 0)
            ? document.chunks
            : chunkText(document.extractedText || '');

        const relevantChunks = findRelevantChunks(availableChunks, concept, 3);
        const context = relevantChunks.map(c => c.content).join('\n\n');

        const explanation = await geminiService.explainConcept(concept, context);

        res.status(200).json({
            success: true,
            data: {
                concept,
                explanation,
                relevantChunks: relevantChunks.map(c => c.chunkIndex)
            },
            message: 'Explanation generated successfully'
        });

    } catch (error) {
        next(error);
    }
};

export const getChatHistory = async (req, res, next) => {
    try {
        const { documentId} = req.params;

        if (!documentId) {
           return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400,
            });
        }

        const chatHistory = await ChatHistory.findOne({
            DocumentId: documentId,
            userId: req.user._id
        }).select('message');

        if (!chatHistory) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No chat history found'
            });
        }

         res.status(200).json({
            success: true,
            data: chatHistory.message,
            message: 'Chat history retrieved successfully'
        });
    } catch (error) {
        next(error);
    }
};
