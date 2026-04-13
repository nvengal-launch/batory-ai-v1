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
  console.log('reply >>>', reply);
  res.json({ reply });
});

// console.log("KEY >>>", process.env.OPENAI_API_KEY);

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

  // console.log('question >>>', req.body.message);
  const result = await processAISQL(req.body.message);
  // console.log('result >>>', result);
  res.json(result);

});

app.get("/predict-products", async (req, res) => {

  const data = await getAllProductsYearly();

  const result = await predictAllProducts(data);

  res.json(result);

});

app.listen(5000, () => console.log("AI Server Running"));