import axios from "axios";

// CRA uses process.env.REACT_APP_*
const API_BASE =
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE,

  // Required for session-based storage
  withCredentials: true,
});

// ---------------- UPLOAD ----------------

export const uploadDocument = (
  file,
  onProgress
) => {
  const form = new FormData();

  form.append("file", file);

  return api.post("/upload", form, {
    headers: {
      "Content-Type":
        "multipart/form-data",
    },

    onUploadProgress: (e) => {
      if (onProgress) {
        onProgress(
          Math.round(
            (e.loaded * 100) / e.total
          )
        );
      }
    },
  });
};

// ---------------- DOCUMENTS ----------------

export const getDocuments = () =>
  api.get("/documents");

export const deleteDocument = (
  docId
) =>
  api.delete(
    `/documents/${docId}`
  );

// ---------------- QUERY ----------------

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

// ---------------- SUMMARIZE ----------------

export const summarizeDocument = (
  docId
) =>
  api.post("/summarize", {
    docId,
  });

// ---------------- COMPARE ----------------

export const compareDocuments = (
  topic,
  docIds
) =>
  api.post("/compare", {
    topic,
    docIds,
  });

// ---------------- EVAL ----------------

export const getEvalLog = () =>
  api.get("/eval");

export default api;