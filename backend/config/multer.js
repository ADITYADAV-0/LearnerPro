import multer from 'multer';
import path from 'path'
import { fileURLToPath } from 'url';
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads/documents');
if(!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true});
}

const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});


const fileFilter = (req, file, cb) =>{
    if(file.mimetype === 'application/pdf') {
        cb(null, true);
    }else{
        const error = new Error('Only PDF files are allowed!');
        error.statusCode = 400;
        cb(error, false);
    }
};

const upload = multer ({
    storage: storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760
    }
});

export default upload;

