
import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://blockchain-socialmediaapp.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { username: string; email: string; password: string; walletAddress: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

export const postAPI = {
  create: (formData: FormData) =>
    api.post("/posts", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  getFeed: (page = 1, limit = 20) =>
    api.get(`/posts/feed?page=${page}&limit=${limit}`),
  getById: (id: string) => api.get(`/posts/${id}`),
  like: (id: string) => api.post(`/posts/${id}/like`),
  react: (id: string, type: string) => api.post(`/posts/${id}/react`, { type }),
  comment: (id: string, text: string) => api.post(`/posts/${id}/comment`, { text }),
  votePoll: (id: string, optionIndex: number) =>
    api.post(`/posts/${id}/poll-vote`, { optionIndex }),
  verify: (id: string) => api.get(`/posts/${id}/verify`),
  getUserPosts: (userId: string, page = 1) =>
    api.get(`/posts/user/${userId}?page=${page}`),
  delete: (id: string) => api.delete(`/posts/${id}`),
};

export const userAPI = {
  getProfile: (id: string) => api.get(`/users/${id}`),
  updateProfile: (formData: FormData) =>
    api.put("/users/profile", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  follow: (id: string) => api.post(`/users/${id}/follow`),
  search: (query: string) => api.get(`/users/search?q=${query}`),
  getSuggested: () => api.get("/users/suggested"),
};

export const messageAPI = {
  send: (receiverId: string, text: string) => api.post("/messages", { receiverId, text }),
  getConversation: (partnerId: string, page = 1) =>
    api.get(`/messages/${partnerId}?page=${page}`),
  getConversationList: () => api.get("/messages/conversations"),
};

export const moderationAPI = {
  report: (postId: string, reason: string) => api.post("/moderation/report", { postId, reason }),
  vote: (reportId: string, vote: "fake" | "legitimate") =>
    api.post(`/moderation/${reportId}/vote`, { vote }),
  getReports: (page = 1, status?: string) =>
    api.get(`/moderation/reports?page=${page}${status ? `&status=${status}` : ""}`),
};

export const notificationAPI = {
  getAll: (page = 1) => api.get(`/notifications?page=${page}`),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
};

export const storyAPI = {
  create: (formData: FormData) =>
    api.post("/stories", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  getAll: () => api.get("/stories"),
  view: (id: string) => api.post(`/stories/${id}/view`),
  react: (id: string, emoji: string) => api.post(`/stories/${id}/react`, { emoji }),
  delete: (id: string) => api.delete(`/stories/${id}`),
};

export const settingsAPI = {
  get: () => api.get("/settings"),
  update: (data: any) => api.put("/settings", data),
  block: (userId: string) => api.post(`/settings/block/${userId}`),
};

export default api;
