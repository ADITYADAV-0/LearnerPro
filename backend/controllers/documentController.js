import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import {extractTextFromPDF} from '../utils/pdfParser.js';
import {chunkText} from '../utils/textChunker.js';
import fs from 'fs/promises';
import mongoose from 'mongoose';

const getPublicFilePath = (document) => {
    if (document?.fileName) {
        return `/uploads/documents/${encodeURIComponent(document.fileName)}`;
    }

    if (!document?.filePath) {
        return null;
    }

    const normalizedPath = document.filePath.replace(/\\/g, '/');
    const uploadsIndex = normalizedPath.indexOf('/uploads/');

    if (uploadsIndex === -1) {
        return null;
    }

    return normalizedPath.slice(uploadsIndex);
};

export const uploadDocument = async (req, res, next) => {
    try {
        if (!req.file){
            return res.status(400).json({
                success: false,
                error: 'Please upload a PDF file',
                statusCode: 400
            });
        }

        const {title} = req.body;

        if(!title){
            await fs.unlink(req.file.path);
            return res.status(400).json({
                success: false,
                error: 'Please provide a document title',
                statusCode: 400
            });
        }

        const document = await Document.create({
            userId: req.user._id,
            title,
            fileName: req.file.filename,
            filePath: req.file.path,
            fileSize: req.file.size,
            status: 'Processing'
        });

        processPDF(document._id, req.file.path).catch(err => {
            console.error('PDF processing error:', err);
        });

        res.status(201).json({
            success:true,
            data: document,
            message: 'Document uploaded successfully, Processing in progess...'
        });
    } catch (error) {
        if(req.file){
            await fs.unlink(req.file.path).catch(() => {});
        }
        next(error);
    }
};

const processPDF = async ( documentId, filePath) =>{
    try{
        const {text} = await extractTextFromPDF (filePath);

        const chunks = chunkText (text, 500, 50);

        await Document.findByIdAndUpdate(documentId, {
            extractedText: text,
            chunks: chunks,
            status: 'Ready'
        });
        console.log(`Document ${documentId} processed successfully`);
    }catch (error){
        console.error(`Error processing document ${documentId}`, error);

        await Document.findByIdAndUpdate(documentId, {
            status: 'Failed'
        });
    }
};

export const getDocuments = async (req, res, next) => {
    try {
        const documents = await Document.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(req.user._id) }
            },
            {
                $lookup: {
                    from: 'flashcards',
                    localField: '_id',
                    foreignField: 'DocumentId',
                    as: 'flashcardSets'
                }
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: '_id',
                    foreignField: 'documentId',
                    as: 'quizzes'
                }
            },
            {
                $addFields: {
                    flashcardCount: { $size: '$flashcardSets' },
                    quizCount: { $size: '$quizzes' }
                }
            },
            {
                $project: {
                    extractedText: 0,
                    chunks: 0,
                    flashcardSets: 0,
                    quizzes: 0
                }
            },
            {
                $sort: {
                    uploadDate: -1
                }
            }
        ]);

        const documentsWithPublicPath = documents.map((doc) => ({
            ...doc,
            filePath: getPublicFilePath(doc)
        }));

        res.status(200).json({
            success: true,
            count: documentsWithPublicPath.length,
            data: documentsWithPublicPath
        });
    } catch (error) {
        next(error);
    }
};

export const getDocument = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if(!document){
            return res.status(404).json({
                success: false,
                error: 'Document Not Found',
                statusCode: 404
            });
        }

        const flashcardCount = await Flashcard.countDocuments({ documentId: document._id, userId: req.user._id});
        const quizCount = await Quiz.countDocuments({ documentId: document._id, userId: req.user._id});

        document.lastAccessed = Date.now()
        await document.save()

        const documentData = document.toObject();
        documentData.flashcardCount = flashcardCount;
        documentData.quizCount = quizCount;
        documentData.filePath = getPublicFilePath(documentData);

        res.status(200).json({
            success: true,
            data: documentData
        })
    } catch (error) {
        next(error);
    }
};


export const deleteDocument = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if(!document){
            return res.status(404).json({
                success: false,
                error: 'Document Not Found',
                statusCode: 404
            });
        }

        // Delete the file from the filesystem
        if (document.filePath) {
            await fs.unlink(document.filePath).catch((err) => {
                console.warn(`Warning: Could not delete file ${document.filePath}:`, err.message);
            });
        }

        // Remove related flashcards and quizzes for this document
        try {
            await Flashcard.deleteMany({ 
                DocumentId: document._id, 
                userId: req.user._id 
            });
        } catch (err) {
            console.error('Error deleting flashcards:', err);
        }

        try {
            await Quiz.deleteMany({ 
                documentId: document._id, 
                userId: req.user._id 
            });
        } catch (err) {
            console.error('Error deleting quizzes:', err);
        }

        // Delete the document from database
        await document.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('Delete document error:', error);
        next(error);
    }
};
