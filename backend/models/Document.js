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

// Pre-hook for findOneAndDelete
documentSchema.pre('findOneAndDelete', async function(next) {
    try {
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

// Pre-hook for deleteOne - FIXED
documentSchema.pre('deleteOne', async function(next) {
    try {
        const doc = this;
        if (doc && doc._id) {
            console.log(`Deleting related data for document ${doc._id}`);
            await Quiz.deleteMany({ documentId: doc._id });
            await Flashcard.deleteMany({ DocumentId: doc._id });
        }
        next();
    } catch (err) {
        console.error('Error in deleteOne pre-hook:', err);
        next(err);
    }
});

const Document = mongoose.model('Document', documentSchema);

export default Document;
