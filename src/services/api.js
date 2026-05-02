import axios from "axios";

const defaultBaseURL = '/api';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || defaultBaseURL
});

export default API;