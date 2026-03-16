import fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';

/**
 * Extracts text from the PDF
 * @param {string} filePath - the path to the pdf file
 * @returns {Promise<{text: string, numPages: number}>}
 */

export const extractTextFromPDF = async (filePath) => {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const parser = new PDFParse(new Uint8Array(dataBuffer));
        const data = await parser.getText();

        return{
            text: data.text,
            numPages: data.numpages,
            info: data.info
        };
    } catch (error) {
        console.error("Error  in parsing the PDF:", error);
        throw new Error("Failed to extract text");
    }
};
