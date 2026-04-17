import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { chatWithAI } from "./services/openai.service.js";
import { globalSearch } from "./services/search.service.js";
import { processAISQL } from "./services/ai-sql.service.js";
import { getAllProductsYearly } from "./services/data.service.js";
import { predictAllProducts } from "./services/predict.service.js";

const app = express();
app.use(cors());
app.use(express.json());

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

app.post("/predict-products-range", async (req, res) => {
  try {
    const { fromYear, toYear } = req.body;

    if (!fromYear || !toYear) {
      return res.status(400).json({ error: "fromYear and toYear are required" });
    }

    if (fromYear > toYear) {
      return res.status(400).json({ error: "fromYear must be less than or equal to toYear" });
    }

    const data = await getAllProductsYearly(fromYear, toYear);
    const result = await predictAllProducts(data);
    
    res.json(result);
  } catch (error) {
    console.error("Prediction error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log("AI Server Running"));