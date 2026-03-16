import axiosInstance from "../utils/axiosInstance";
import { API_PATH } from "../utils/apiPaths";

const login = async (email, password) => {
    try {
        const response = await axiosInstance.post(API_PATH.AUTH.LOGIN, {
            email,
            password
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'An unknown error occured' };
    }
};

const register = async (username, email, password) => {
    try {
        const response = await axiosInstance.post(API_PATH.AUTH.REGISTER, {
            username,
            email,
            password
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'An unknown error occured' };
    }
};

const getProfile = async () =>{
    try {
        const response = await axiosInstance.get(API_PATH.AUTH.GET_PROFILE);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'An unknown error occured' };
    }
};

const updateProfile = async (userData) => {
    try {
        const response = await axiosInstance.put(API_PATH.AUTH.UPDATE_PROFILE, userData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'An unknown error occured' };
    }
};

const changePassword = async (password) => {
    try {
        const response = await axiosInstance.post(API_PATH.AUTH.CHANGE_PASSWORD, password);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'An unknown error occured' };
    }
};

const authService = {
    login,
    register,
    getProfile,
    updateProfile,
    changePassword
};

export default authService;
