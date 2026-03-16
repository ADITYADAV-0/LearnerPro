import express from 'express';
import{
    getQuizzes,
    getQuizById,
    submitQuiz,
    getQuizResults,
    recalculateQuiz,
    deleteQuiz
} from '../controllers/quizController.js'
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/:documentId', getQuizzes);
router.get('/quiz/:id',getQuizById);
router.post('/:id/submit',submitQuiz);
router.post('/:id/recalculate', recalculateQuiz);
router.get('/:id/results',getQuizResults);
router.delete('/:id', deleteQuiz);

export default router; 
