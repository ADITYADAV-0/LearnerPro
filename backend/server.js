import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js'

import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import flashcardRoutes from './routes/flashcardRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import progressRoutes from './routes/progressRoutes.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

connectDB();



app.use(
    cors({
        origin:"*",
        methods: ["GET","POST","PUT","DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    })
);

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/uploads', express.static(path.join(__dirname,'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/progress', progressRoutes);

if (process.env.NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../frontend/LearnerPro/dist');

    // Serve built frontend static assets
    app.use(express.static(staticPath));

        // SPA fallback - serve index.html for any unknown route (after static middleware)
        // use app.use without a path so Express does not attempt to parse the route pattern
        app.use((req, res) => {
            res.sendFile(path.join(staticPath, 'index.html'));
        });
}

app.use(errorHandler);


app.use((req, res) =>{
    res.status(404).json({
        success: false,
        error: "Route not found",
        statusCode: 404
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, ()=>{
    if (process.env.NODE_ENV !== 'production') {
        console.log(`server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    }
});

process.on('unhandledRejection', (err)=>{
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
});
