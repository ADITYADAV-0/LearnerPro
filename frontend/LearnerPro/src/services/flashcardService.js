import axiosInstance from "../utils/axiosInstance";
import { API_PATH } from "../utils/apiPaths";

const getAllFlashcardSets = async () => {
  try {
    const response = await axiosInstance.get(API_PATH.FLASHCARDS.GET_ALL_FLASHCARD_SETS);
        return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch flashcard sets' };
  }
};

const getFlashcardsForDocument = async (documentId) => {
  try {
    const response = await axiosInstance.get(API_PATH.FLASHCARDS.GET_FLASHCARDS_FOR_DOC(documentId));
        return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch flashcards' };
  }
};

const reviewFlashcard = async (cardId, cardIndex) => {
  try {
    const response = await axiosInstance.post(API_PATH.FLASHCARDS.REVIEW_FLASHCARD(cardId), {cardIndex});
        return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to review flashcard' };
  }
};

const toggleStar = async (cardId) => {
  try {
    const response = await axiosInstance.put(API_PATH.FLASHCARDS.TOGGLE_STAR(cardId));
        return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to star flashcards' };
  }
};

const deleteFlashcardSet = async (id) => {
  try {
    const response = await axiosInstance.delete(API_PATH.FLASHCARDS.DELETE_FLASHCARD_SET(id));
        return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete flashcards' };
  }
};

const flashcardService = {
    getAllFlashcardSets,
    getFlashcardsForDocument,
    reviewFlashcard,
    toggleStar,
    deleteFlashcardSet
};

export default flashcardService; 