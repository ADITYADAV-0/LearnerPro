import mongoose from 'mongoose';
import Quiz from './Quiz.js';
import Flashcard from './Flashcard.js';

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please provide a document title'],
        trim: true
    },
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    extractedText: {
        type: String,
        default: ''
    },
    chunks: [{
        content: {
        type: String,
        required: true
    },
    pageNumber: {
        type: Number,
        default: 0
    },
    chunkIndex: {
        type: Number,
        required: true
    }
}],
 uploadDate: {
    type: Date,
    default: Date.now
 },
 lastAccessed: {
    type: Date,
    default: Date.now
 },
 status: {
    type: String,
    enum: ['Processing', 'Ready', 'Failed'],
    default: 'Processing'
 }
}, {
    timestamps: true
});

documentSchema.index({ userId: 1, uploadDate: -1 });

documentSchema.pre('findOneAndDelete', async function(next) {
    try {
        // `this` is the query. Find the document being deleted so we have its _id.
        const doc = await this.model.findOne(this.getQuery());
        if (doc) {
            await Quiz.deleteMany({ documentId: doc._id });
            await Flashcard.deleteMany({ DocumentId: doc._id });
        }
        next();
    } catch (err) {
        next(err);
    }
});

documentSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    try {
        const doc = this;
        if (doc && doc._id) {
            await Quiz.deleteMany({ documentId: doc._id });
            await Flashcard.deleteMany({ DocumentId: doc._id });
        }
        next();
    } catch (err) {
        next(err);
    }
});

const Document = mongoose.model('Document', documentSchema);

export default Document;
