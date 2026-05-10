// DocuMind RAG Engine v2
// Features: Semantic chunking + BM25 + TF-IDF Hybrid Search with RRF re-ranking

const STOPWORDS = new Set([
  "the","and","for","that","this","with","from","are","was","were",
  "has","have","had","its","not","but","can","will","all","been",
  "they","their","there","which","when","also","into","more","than",
  "one","your","our","you","his","her","she","him","who","what","about",
  "would","could","should","been","have","just","over","such","then",
]);

// ── Tokenizer ────────────────────────────────────────────────────────────────
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// ── Semantic Chunker ─────────────────────────────────────────────────────────
// Splits on topic boundaries (headings, paragraph breaks) before falling back
// to sentence-level splitting. Produces context-aware chunks.
function chunkText(text, maxChunkSize = 600, overlap = 120) {
  // Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split into semantic blocks: headings and paragraph breaks first
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const chunks = [];
  let current = "";

  for (const block of blocks) {
    // If block itself is larger than maxChunkSize, split by sentences
    if (block.length > maxChunkSize) {
      // Flush current buffer first
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }
      // Split block into sentences
      const sentences = block.split(/(?<=[.?!])\s+/);
      let sentBuffer = "";
      for (const sent of sentences) {
        if (sentBuffer.length + sent.length > maxChunkSize && sentBuffer) {
          chunks.push(sentBuffer.trim());
          // Overlap: keep last N chars
          sentBuffer = sentBuffer.slice(-overlap) + " " + sent;
        } else {
          sentBuffer += (sentBuffer ? " " : "") + sent;
        }
      }
      if (sentBuffer.trim()) current = sentBuffer.trim();
    } else if (current.length + block.length > maxChunkSize) {
      // Current buffer full — flush and start new with overlap
      if (current.trim()) chunks.push(current.trim());
      // Overlap from end of previous chunk
      const overlapText = current.slice(-overlap);
      current = overlapText + "\n\n" + block;
    } else {
      current += (current ? "\n\n" : "") + block;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── TF-IDF Cosine Similarity ─────────────────────────────────────────────────
function tfScore(tokens) {
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return freq;
}

function cosineSimilarity(queryTokens, chunkTokens) {
  const qFreq = tfScore(queryTokens);
  const cFreq = tfScore(chunkTokens);
  const allTerms = new Set([...Object.keys(qFreq), ...Object.keys(cFreq)]);
  let dot = 0, qMag = 0, cMag = 0;
  for (const term of allTerms) {
    const q = qFreq[term] || 0;
    const c = cFreq[term] || 0;
    dot += q * c;
    qMag += q * q;
    cMag += c * c;
  }
  if (qMag === 0 || cMag === 0) return 0;
  return dot / (Math.sqrt(qMag) * Math.sqrt(cMag));
}

// ── BM25 Scoring ─────────────────────────────────────────────────────────────
const BM25_K1 = 1.5;
const BM25_B = 0.75;

function buildBM25Index(chunks) {
  const tokenizedChunks = chunks.map(tokenize);
  const N = chunks.length;
  const avgDL = tokenizedChunks.reduce((s, t) => s + t.length, 0) / N || 1;

  // Document frequency per term
  const df = {};
  for (const tokens of tokenizedChunks) {
    for (const term of new Set(tokens)) {
      df[term] = (df[term] || 0) + 1;
    }
  }

  return { tokenizedChunks, N, avgDL, df };
}

function bm25Score(queryTokens, docTokens, N, avgDL, df) {
  const dl = docTokens.length;
  const tf = tfScore(docTokens);
  let score = 0;
  for (const term of queryTokens) {
    if (!tf[term]) continue;
    const idf = Math.log((N - (df[term] || 0) + 0.5) / ((df[term] || 0) + 0.5) + 1);
    const termTf = tf[term];
    const numerator = termTf * (BM25_K1 + 1);
    const denominator = termTf + BM25_K1 * (1 - BM25_B + BM25_B * (dl / avgDL));
    score += idf * (numerator / denominator);
  }
  return score;
}

// ── Reciprocal Rank Fusion (RRF) ─────────────────────────────────────────────
// Combines BM25 and cosine rankings into a single hybrid score
function rrfFuse(rankings, k = 60) {
  const scores = {};
  for (const ranking of rankings) {
    ranking.forEach((item, rank) => {
      scores[item.index] = (scores[item.index] || 0) + 1 / (k + rank + 1);
    });
  }
  return scores;
}

// ── Main Retrieval Function ───────────────────────────────────────────────────
function retrieveTopChunks(query, chunks, topK = 5) {
  if (!chunks.length) return [];
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  // Build BM25 index
  const { tokenizedChunks, N, avgDL, df } = buildBM25Index(chunks);

  // Score with both methods
  const scored = chunks.map((chunk, i) => {
    const cosine = cosineSimilarity(queryTokens, tokenizedChunks[i]);
    const bm25 = bm25Score(queryTokens, tokenizedChunks[i], N, avgDL, df);
    return { index: i, chunk, cosine, bm25 };
  });

  // Rank by each method separately
  const cosineRanking = [...scored].sort((a, b) => b.cosine - a.cosine);
  const bm25Ranking = [...scored].sort((a, b) => b.bm25 - a.bm25);

  // RRF fusion
  const rrfScores = rrfFuse([cosineRanking, bm25Ranking]);

  // Final sort by RRF score
  const finalRanked = scored
    .map((item) => ({
      ...item,
      score: rrfScores[item.index] || 0,
      // Normalize for display (0-1)
      displayScore: Math.min(1, (rrfScores[item.index] || 0) * 100),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((s) => s.score > 0);

  return finalRanked;
}

// ── Faithfulness Evaluator ───────────────────────────────────────────────────
// Checks how many answer tokens appear in retrieved context (lexical faithfulness)
function evaluateFaithfulness(answer, retrievedChunks) {
  const answerTokens = new Set(tokenize(answer));
  const contextTokens = new Set(
    retrievedChunks.flatMap((r) => tokenize(r.chunk))
  );
  if (answerTokens.size === 0) return 0;
  let overlap = 0;
  for (const t of answerTokens) {
    if (contextTokens.has(t)) overlap++;
  }
  return Math.round((overlap / answerTokens.size) * 100);
}

// ── Context Relevance Score ──────────────────────────────────────────────────
function evaluateContextRelevance(query, retrievedChunks) {
  if (!retrievedChunks.length) return 0;
  const queryTokens = tokenize(query);
  const scores = retrievedChunks.map((r) =>
    cosineSimilarity(queryTokens, tokenize(r.chunk))
  );
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 100);
}

module.exports = {
  chunkText,
  retrieveTopChunks,
  evaluateFaithfulness,
  evaluateContextRelevance,
};
