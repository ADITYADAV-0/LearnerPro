import Flashcard from "../models/Flashcard.js";

export const getFlashcards = async(req, res, next) => {
    try {
        const flashcards = await Flashcard.find({
            userId: req.user._id,
            DocumentId: req.params.documentId
        })
        .populate('DocumentId','title fileName')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: flashcards.length,
            data: flashcards.map(s => ({ ...s.toObject(), documentId: s.DocumentId }))
        });
    } catch (error) {
      next(error);  
    }
};

export const getAllFlashcardSets = async(req, res, next) => {
    try {
        const flashcardSets = await Flashcard.find({
            userId: req.user._id,
        })
        .populate('DocumentId','title')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: flashcardSets.length,
            data: flashcardSets.map(s => ({ ...s.toObject(), documentId: s.DocumentId }))
        });
    } catch (error) {
      next(error);          
    }
};

export const reviewFlashcard = async(req, res, next) => {
    try {
        const flashcardSet = await Flashcard.findOne({
            'cards._id': req.params.cardId,
            userId: req.user._id
        })

        if(!flashcardSet){
            return res.status(404).json({
                success: false,
                error: 'FlashCard Set not found',
                statusCode: 404
            });
        }

        const cardIndex = flashcardSet.cards.findIndex(card => card._id.toString() ===  req.params.cardId);

        if(cardIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Card not found in set',
                statusCode: 404
            });
        }

        flashcardSet.cards[cardIndex].lastReviewed = new Date();
        flashcardSet.cards[cardIndex].reviewCount += 1;

        await flashcardSet.save(); 

        res.status(200).json({
              success: true,
              data: { ...flashcardSet.toObject(), documentId: flashcardSet.DocumentId },
            message: 'Flashcard reviewed successfully'
        });

    } catch (error) {
      next(error);         
    }
};

export const toggleStarFlashcard = async(req, res, next) => {
    try {
        const flashcardSet = await Flashcard.findOne({
            'cards._id': req.params.cardId,
            userId: req.user._id
        })

        if(!flashcardSet){
            return res.status(404).json({
                success: false,
                error: 'FlashCard Set not found',
                statusCode: 404
            });
        }

        const cardIndex = flashcardSet.cards.findIndex(card => card._id.toString() ===  req.params.cardId);

        if(cardIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Card not found in set',
                statusCode: 404
            });
        }

        flashcardSet.cards[cardIndex].isStarred = !flashcardSet.cards[cardIndex].isStarred;

        await flashcardSet.save();

        res.status(200).json({
              success: true,
              data: { ...flashcardSet.toObject(), documentId: flashcardSet.DocumentId },
            message: `Flashcard ${flashcardSet.cards[cardIndex].isStarred ? 'starred' : 'unstarred'}`
        }); 
    } catch (error) {
      next(error);  
    }
};

export const deleteFlashcard = async(req, res, next) => {
    try {
        const flashcardSet = await Flashcard.findOne({
            _id: req.params.id,
            userId: req.user._id
        }); 
        
        if(!flashcardSet){
            return res.status(404).json({
                success: false,
                error: 'FlashCard Set not found',
                statusCode: 404
            });
        }

        await flashcardSet.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Flashcard set deleted successfully'
        });
    } catch (error) {
      next(error);          
    }
};