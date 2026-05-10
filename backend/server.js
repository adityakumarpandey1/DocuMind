require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Groq = require("groq-sdk");
const {
  chunkText,
  retrieveTopChunks,
  evaluateFaithfulness,
  evaluateContextRelevance,
} = require("./rag");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const documentStore = {};
const evalLog = [];

const TMP_DIR = require("os").tmpdir() + "/documind";
fs.mkdirSync(TMP_DIR, { recursive: true });

const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".txt", ".docx", ".md"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only PDF, TXT, DOCX, and MD files are supported."));
  },
});

async function extractText(filePath, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  if (ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  if (ext === ".txt" || ext === ".md") return fs.readFileSync(filePath, "utf-8");
  throw new Error("Unsupported file type");
}

async function summarizeHistory(history) {
  if (history.length < 8) return history;
  const toSummarize = history.slice(0, -4);
  const recent = history.slice(-4);
  const transcript = toSummarize.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: `Summarize this conversation in 3-5 bullet points:\n\n${transcript}` }],
    temperature: 0.1,
    max_tokens: 300,
  });
  const summary = res.choices[0]?.message?.content || "";
  return [{ role: "system", content: `[Earlier conversation summary]:\n${summary}` }, ...recent];
}

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const text = await extractText(req.file.path, req.file.originalname);
    if (!text || text.trim().length < 50)
      return res.status(400).json({ error: "Document has too little text to process." });
    const docId = uuidv4();
    const chunks = chunkText(text, 600, 120);
    documentStore[docId] = {
      name: req.file.originalname, text, chunks,
      uploadedAt: new Date().toISOString(),
      wordCount: text.split(/\s+/).length,
      chunkCount: chunks.length,
    };
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.json({ docId, name: req.file.originalname, wordCount: documentStore[docId].wordCount, chunkCount: chunks.length, message: "Document indexed successfully." });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Failed to process document." });
  }
});

app.get("/documents", (req, res) => {
  const docs = Object.entries(documentStore).map(([id, doc]) => ({
    docId: id, name: doc.name, wordCount: doc.wordCount, chunkCount: doc.chunkCount, uploadedAt: doc.uploadedAt,
  }));
  res.json({ documents: docs });
});

app.delete("/documents/:docId", (req, res) => {
  const { docId } = req.params;
  if (!documentStore[docId]) return res.status(404).json({ error: "Document not found." });
  delete documentStore[docId];
  res.json({ message: "Document removed." });
});

app.post("/query", async (req, res) => {
  try {
    const { question, docIds, chatHistory = [] } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: "Question is required." });
    const targetDocs = docIds?.length > 0 ? docIds.filter((id) => documentStore[id]) : Object.keys(documentStore);
    if (!targetDocs.length) return res.status(400).json({ error: "No documents available." });

    let allRetrieved = [];
    for (const docId of targetDocs) {
      const doc = documentStore[docId];
      const topChunks = retrieveTopChunks(question, doc.chunks, 4);
      topChunks.forEach((r) => allRetrieved.push({ ...r, docName: doc.name, docId }));
    }
    allRetrieved.sort((a, b) => b.score - a.score);
    const topResults = allRetrieved.slice(0, 6);

    if (!topResults.length) {
      return res.json({ answer: "I couldn't find relevant information in the uploaded documents.", sources: [], evalMetrics: null });
    }

    const context = topResults.map((r, i) => `[Source ${i + 1} — ${r.docName}]\n${r.chunk}`).join("\n\n---\n\n");
    const processedHistory = await summarizeHistory(chatHistory);
    const historyMessages = processedHistory.slice(-8).map((m) => ({
      role: m.role === "system" ? "user" : m.role, content: m.content,
    }));

    const systemPrompt = `You are DocuMind, an expert document analyst. Answer questions strictly based on the provided document context.
Rules:
- Answer ONLY from the context provided. Do not use outside knowledge.
- If the answer is not in the context, say "I couldn't find this information in the uploaded documents."
- Always cite which source (Source 1, Source 2, etc.) you used.
- Be concise, structured, and professional.
- For lists, use bullet points. For comparisons, use clear structure.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: `Context from documents:\n\n${context}\n\n---\n\nQuestion: ${question}` },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const answer = completion.choices[0]?.message?.content || "No response generated.";
    const faithfulness = evaluateFaithfulness(answer, topResults);
    const contextRelevance = evaluateContextRelevance(question, topResults);
    const avgRetrievalScore = Math.round(topResults.reduce((s, r) => s + (r.displayScore || 0), 0) / topResults.length * 100) / 100;
    const evalMetrics = { faithfulness, contextRelevance, avgRetrievalScore };

    evalLog.unshift({
      id: uuidv4(), timestamp: new Date().toISOString(), question,
      answer: answer.slice(0, 300), chunksRetrieved: topResults.length,
      docsQueried: targetDocs.length, evalMetrics,
      sources: topResults.map((r) => ({ docName: r.docName, score: r.displayScore, excerpt: r.chunk.slice(0, 150) })),
    });
    if (evalLog.length > 50) evalLog.pop();

    const sources = topResults.map((r, i) => ({
      index: i + 1, docName: r.docName, docId: r.docId,
      excerpt: r.chunk.slice(0, 200) + (r.chunk.length > 200 ? "..." : ""),
      score: r.displayScore || 0,
    }));

    res.json({ answer, sources, evalMetrics });
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: err.message || "Failed to process query." });
  }
});

app.post("/summarize", async (req, res) => {
  try {
    const { docId } = req.body;
    if (!docId || !documentStore[docId]) return res.status(404).json({ error: "Document not found." });
    const doc = documentStore[docId];
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are DocuMind, an expert document analyst." },
        { role: "user", content: `Summarize with: 1) Overview, 2) Key Topics (bullets), 3) Important Details, 4) Conclusion.\n\nDocument: ${doc.name}\n\n${doc.text.slice(0, 4000)}` },
      ],
      temperature: 0.3, max_tokens: 800,
    });
    res.json({ summary: completion.choices[0]?.message?.content, docName: doc.name });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to summarize." });
  }
});

app.post("/compare", async (req, res) => {
  try {
    const { topic, docIds } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: "Topic is required." });
    const validDocs = (docIds || []).filter((id) => documentStore[id]);
    if (validDocs.length < 2) return res.status(400).json({ error: "Select at least 2 documents to compare." });

    const docContexts = validDocs.map((docId) => {
      const doc = documentStore[docId];
      const chunks = retrieveTopChunks(topic, doc.chunks, 3);
      return { docName: doc.name, context: chunks.map((c) => c.chunk).join("\n\n") };
    });

    const comparisonPrompt = docContexts
      .map((d, i) => `[Document ${i + 1}: ${d.docName}]\n${d.context || "No relevant content found."}`)
      .join("\n\n===\n\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are DocuMind, an expert in comparative document analysis." },
        { role: "user", content: `Compare these documents on: "${topic}"\n\nProvide:\n1. **Similarities**\n2. **Differences**\n3. **Unique to each document**\n4. **Summary verdict**\n\n${comparisonPrompt}` },
      ],
      temperature: 0.3, max_tokens: 1200,
    });

    res.json({ comparison: completion.choices[0]?.message?.content, docs: docContexts.map((d) => d.docName), topic });
  } catch (err) {
    res.status(500).json({ error: err.message || "Comparison failed." });
  }
});

app.get("/eval", (req, res) => {
  res.json({
    totalQueries: evalLog.length,
    log: evalLog,
    averages: evalLog.length > 0 ? {
      faithfulness: Math.round(evalLog.reduce((s, e) => s + e.evalMetrics.faithfulness, 0) / evalLog.length),
      contextRelevance: Math.round(evalLog.reduce((s, e) => s + e.evalMetrics.contextRelevance, 0) / evalLog.length),
    } : null,
  });
});

app.get("/health", (req, res) =>
  res.json({ status: "ok", documentsLoaded: Object.keys(documentStore).length })
);

app.listen(PORT, () => {
  console.log(`\n🚀 DocuMind Backend running on http://localhost:${PORT}`);
  console.log(`📄 Ready to index documents and answer questions\n`);
});
