import axiosInstance from "../utils/axiosInstance";
import { API_PATH } from "../utils/apiPaths";

const getDashboardData = async () => {
  try {
    const response = await axiosInstance.get(API_PATH.PROGRESS.GET_DASHBOARD);
        return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch Dashboard' };
  }
};

const progressService = {
    getDashboardData
};

export default progressService;