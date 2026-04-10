import { products } from "../data/products.js";
import { createEmbedding } from "./openai.service.js";

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function globalSearch(query) {
  const queryVector = await createEmbedding(query);

  const scored = await Promise.all(
    products.map(async (p) => {
      const vec = await createEmbedding(
        p.name + " " + p.description
      );

      return {
        ...p,
        score: cosineSimilarity(queryVector, vec)
      };
    })
  );

  return scored.sort((a, b) => b.score - a.score);
}