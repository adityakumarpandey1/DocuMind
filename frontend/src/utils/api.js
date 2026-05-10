import axios from "axios";

// Use deployed backend in production, localhost in development
const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE,
});

export const uploadDocument = (file, onProgress) => {
  const form = new FormData();

  form.append("file", file);

  return api.post("/upload", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },

    onUploadProgress: (e) => {
      if (onProgress) {
        onProgress(
          Math.round((e.loaded * 100) / e.total)
        );
      }
    },
  });
};

export const getDocuments = () =>
  api.get("/documents");

export const deleteDocument = (docId) =>
  api.delete(`/documents/${docId}`);

export const queryDocuments = (
  question,
  docIds,
  chatHistory
) =>
  api.post("/query", {
    question,
    docIds,
    chatHistory,
  });

export const summarizeDocument = (docId) =>
  api.post("/summarize", { docId });

export const compareDocuments = (topic, docIds) =>
  api.post("/compare", {
    topic,
    docIds,
  });

export const getEvalLog = () =>
  api.get("/eval");

export default api;