import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { chatWithAI } from "./services/openai.service.js";
import { globalSearch } from "./services/search.service.js";
import { processAISQL } from "./services/ai-sql.service.js";
import { getAllProductsYearly } from "./services/data.service.js";
import { predictAllProducts, getPaginatedProducts } from "./services/predict.service.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.post("/chat", async (req, res) => {
  const reply = await chatWithAI(req.body.message);
  res.json({ reply });
});

app.post("/ai-search", async (req, res) => {
  const results = await globalSearch(req.body.query);
  const context = JSON.stringify(results.slice(0, 3));
  const answer = await chatWithAI(req.body.query, context);

  res.json({
    answer,
    results
  });
});



app.post("/ai-sql", async (req, res) => {
  const result = await processAISQL(req.body.message);
  res.json(result);

});

app.get("/predict-products", async (req, res) => {

  const data = await getAllProductsYearly();
  const result = await predictAllProducts(data);
  res.json(result);

});

// Paginated predictions endpoint
app.get("/predict-products-paginated", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const recordsPerPage = parseInt(req.query.limit) || 10;

    const data = await getAllProductsYearly();
    const result = await getPaginatedProducts(data, page, recordsPerPage);
    
    res.json(result);
  } catch (error) {
    console.error("Paginated prediction error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log("AI Server Running"));