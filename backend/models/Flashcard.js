import mongoose from "mongoose";

const flashcardSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        DocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            required: true
        },
        cards: [
            { 
                question: {type: String,required: true},
                answer: {type: String,required: true},
                difficulty: {
                    type: String,
                    enum: ['Easy', 'Medium', 'Hard'],
                    default: 'Medium'
                },
                lastReviewed: {
                    type: Date,
                    default: null,
                },
                reviewCount: {
                    type: Number,
                    default: 0,
                },
                isStarred: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
    },
    { 
        timestamps: true 
    }
);

flashcardSchema.index({userId: 1, DocumentId: 1});

const Flashcard = mongoose.model('Flashcard', flashcardSchema);

export default Flashcard;