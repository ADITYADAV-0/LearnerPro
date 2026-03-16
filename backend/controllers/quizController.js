import Quiz from '../models/Quiz.js'

export const getQuizzes = async (req, res, next)=>{
    try {
        const quizzes = await Quiz.find({
            userId: req.user._id,
            documentId: req.params.documentId
        })
        .populate('documentId', 'title fileName')
        .sort({ createdAt: -1});

        res.status(200).json({
            success: true,
            count: quizzes.length,
            data: quizzes
        });
    } catch (error) {
        next(error)
    }
};
export const getQuizById = async (req, res, next)=>{
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if(!quiz){
            return res.status(404).json({
                success: false,
                error: 'Quiz not found',
                statusCode: 404
            });
        }

        res.status(200).json({
            success: true,
            data: quiz
        })
    } catch (error) {
        next(error)
    }
};
export const submitQuiz = async (req, res, next)=>{
    try {
        const { answers } = req.body;

        if(!Array.isArray(answers)){
         return res.status(400).json({
                success: false,
                error: 'PLease provide answers array',
                statusCode: 400
            });   
        }

        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if(!quiz){
            return res.status(404).json({
                success: false,
                error: 'Quiz not found',
                statusCode: 404
            });
        }

        if(quiz.completedAt){
            return res.status(400).json({
                success: false,
                error: 'Quiz Already Completed',
                statusCode: 400
            });
        }

        const resolveCorrectAnswer = (correctRaw, optionsArr) => {
            if(!correctRaw || !optionsArr || !Array.isArray(optionsArr)) return '';
            const txt = correctRaw.toString().trim();

            // 1) O2: Option text  or O2 Option text
            let m = txt.match(/^O\s*(\d)\s*[:\)\.-]?\s*(.*)$/i);
            if(m){
                const idx = parseInt(m[1], 10) - 1;
                if(m[2]) return optionsArr[idx] || m[2].trim() || '';
                return optionsArr[idx] || '';
            }

            // 2) Numeric labels: 1. Option or 2) Option
            m = txt.match(/^(\d+)\s*[:\)\.-]?\s*(.*)$/);
            if(m){
                const idx = parseInt(m[1], 10) - 1;
                if(m[2]) return optionsArr[idx] || m[2].trim() || '';
                return optionsArr[idx] || '';
            }

            // 3) Letter labels: A) Option or B Option
            m = txt.match(/^([A-D])\s*[:\)\.-]?\s*(.*)$/i);
            if(m){
                const idx = m[1].toUpperCase().charCodeAt(0) - 65;
                if(m[2]) return optionsArr[idx] || m[2].trim() || '';
                return optionsArr[idx] || '';
            }

            // 4) Direct exact match
            const exact = optionsArr.find(opt => opt.trim() === txt);
            if(exact) return exact;

            // 5) Try removing common leading labels and match again
            const cleaned = txt.replace(/^[A-Za-z0-9\)\.:\-\s]+/, '').trim();
            const fuzzy = optionsArr.find(opt => opt.trim() === cleaned);
            if(fuzzy) return fuzzy;

            return '';
        };

        let correctCount = 0;
        const userAnswers = [];

        answers.forEach(  answer =>{
            const { questionIndex, selectedAnswer } = answer;

            if(questionIndex < quiz.questions.length){
                const question = quiz.questions[questionIndex];
                const resolvedCorrect = resolveCorrectAnswer(question.correctAnswer, question.options) || question.correctAnswer || '';
                const isCorrect = (selectedAnswer === resolvedCorrect) || (selectedAnswer?.toString().trim() === (resolvedCorrect || '').toString().trim());

                if(isCorrect) correctCount++;

                userAnswers.push({
                    questionIndex,
                    selectedAnswer,
                    isCorrect,
                    answeredAt: new Date()
                });
            }
        });

        const score = Math.round((correctCount/quiz.totalQuestions)*100);

        quiz.userAnswers = userAnswers;
        quiz.score = score;
        quiz.completedAt = new Date();

        await quiz.save();

        res.status(200).json({
            success: true,
            data: {
                quizId: quiz._id,
                score,
                correctCount,
                totalQuestions: quiz.totalQuestions,
                percentage: score,
                userAnswers
            },
            message: 'Quiz submitted successfully'
        });
    } catch (error) {
        next(error)
    }
};
export const getQuizResults = async (req, res, next)=>{
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        }).populate('documentId', 'title');

        if(!quiz){
           return res.status(404).json({
                success: false,
                error: 'Quiz not found',
                statusCode: 404
            }); 
        }

        if(!quiz.completedAt){
            return res.status(400).json({
                success: false,
                error: 'Quiz not Completed yet',
                statusCode: 400
            });
        }

        const detailedResults = quiz.questions.map((question, index) => {
            const userAnswer = quiz.userAnswers.find(a => a.questionIndex === index);

            return {
                questionIndex: index,
                question: question.question,
                options: question.options,
                correctAnswer: question.correctAnswer,
                selectedAnswer: userAnswer ?.selectedAnswer || null,
                isCorrect: userAnswer?.isCorrect || false,
                explanation: question.explanation
            };
        });

        res.status(200).json({
            success: true,
            data: {
                quiz: {
                    id: quiz._id,
                    title: quiz.title,
                    document: quiz.documentId,
                    score: quiz.score,
                    totalQuestions: quiz.totalQuestions,
                    completedAt: quiz.completedAt
                },
                results: detailedResults
            }
        })
    } catch (error) {
        next(error)
    }
};
export const deleteQuiz = async (req, res, next)=>{
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if(!quiz){
           return res.status(404).json({
                success: false,
                error: 'Quiz not found',
                statusCode: 404
            });
        }

        await quiz.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Deleted Successfully'
        });
    } catch (error) {
        next(error)
    }
};

export const recalculateQuiz = async (req, res, next) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
        if(!quiz){
            return res.status(404).json({ success:false, error: 'Quiz not found', statusCode: 404 });
        }

        // helper reused from submit logic
        const resolveCorrectAnswer = (correctRaw, optionsArr) => {
            if(!correctRaw || !optionsArr || !Array.isArray(optionsArr)) return '';
            const txt = correctRaw.toString().trim();

            let m = txt.match(/^O\s*(\d)\s*[:\)\.-]?\s*(.*)$/i);
            if(m){
                const idx = parseInt(m[1], 10) - 1;
                if(m[2]) return optionsArr[idx] || m[2].trim() || '';
                return optionsArr[idx] || '';
            }

            m = txt.match(/^(\d+)\s*[:\)\.-]?\s*(.*)$/);
            if(m){
                const idx = parseInt(m[1], 10) - 1;
                if(m[2]) return optionsArr[idx] || m[2].trim() || '';
                return optionsArr[idx] || '';
            }

            m = txt.match(/^([A-D])\s*[:\)\.-]?\s*(.*)$/i);
            if(m){
                const idx = m[1].toUpperCase().charCodeAt(0) - 65;
                if(m[2]) return optionsArr[idx] || m[2].trim() || '';
                return optionsArr[idx] || '';
            }

            const exact = optionsArr.find(opt => opt.trim() === txt);
            if(exact) return exact;

            const cleaned = txt.replace(/^[A-Za-z0-9\)\.:\-\s]+/, '').trim();
            const fuzzy = optionsArr.find(opt => opt.trim() === cleaned);
            if(fuzzy) return fuzzy;

            return '';
        };

        // normalize stored correctAnswer where possible
        quiz.questions = quiz.questions.map(q => {
            const opts = q.options || [];
            const normalized = resolveCorrectAnswer(q.correctAnswer, opts) || q.correctAnswer || '';
            q.correctAnswer = normalized || q.correctAnswer || '';
            return q;
        });

        // recalc userAnswers correctness and score
        let correctCount = 0;
        if(Array.isArray(quiz.userAnswers) && quiz.userAnswers.length){
            quiz.userAnswers = quiz.userAnswers.map(ua => {
                const q = quiz.questions[ua.questionIndex];
                const resolved = q ? (q.correctAnswer || '') : '';
                const isCorrect = (ua.selectedAnswer === resolved) || (ua.selectedAnswer?.toString().trim() === resolved?.toString().trim());
                if(isCorrect) correctCount++;
                return { ...ua.toObject ? ua.toObject() : ua, isCorrect };
            });
        }

        const newScore = Math.round((correctCount / quiz.totalQuestions) * 100) || 0;
        quiz.score = newScore;

        await quiz.save();

        res.status(200).json({ success:true, data: quiz, message: 'Quiz recalculated' });
    } catch (error) {
        next(error);
    }
};
