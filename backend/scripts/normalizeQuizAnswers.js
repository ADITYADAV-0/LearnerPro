import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Quiz from '../models/Quiz.js';

dotenv.config();

const normalizeCorrectAnswer = (correctRaw, optionsArr) => {
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

const run = async () => {
    await connectDB();
    console.log('Scanning quizzes...');
    const quizzes = await Quiz.find({});
    let updated = 0;

    for(const quiz of quizzes){
        let changed = false;
        // normalize correct answers
        quiz.questions = quiz.questions.map((q) => {
            const opts = q.options || [];
            const normalized = normalizeCorrectAnswer(q.correctAnswer, opts) || q.correctAnswer || '';
            if(normalized && normalized !== q.correctAnswer){
                q.correctAnswer = normalized;
                changed = true;
            }
            return q;
        });

        // recalc userAnswers correctness and score
        if(Array.isArray(quiz.userAnswers) && quiz.userAnswers.length){
            let correctCount = 0;
            quiz.userAnswers = quiz.userAnswers.map(ua => {
                const q = quiz.questions[ua.questionIndex];
                const resolved = q ? (q.correctAnswer || '') : '';
                const isCorrect = (ua.selectedAnswer === resolved) || (ua.selectedAnswer?.toString().trim() === resolved?.toString().trim());
                if(isCorrect) correctCount++;
                if(ua.isCorrect !== isCorrect) changed = true;
                return { ...ua.toObject ? ua.toObject() : ua, isCorrect };
            });
            const newScore = Math.round((correctCount / quiz.totalQuestions) * 100);
            if(quiz.score !== newScore){
                quiz.score = newScore;
                changed = true;
            }
        }

        if(changed){
            await quiz.save();
            updated++;
            console.log(`Updated quiz ${quiz._id}`);
        }
    }

    console.log(`Done. Updated ${updated} quizzes.`);
    process.exit(0);
};

run().catch(err=>{
    console.error(err);
    process.exit(1);
});
