import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { chatWithAI } from "./services/openai.service.js";
import { globalSearch } from "./services/search.service.js";
import { processAISQL } from "./services/ai-sql.service.js";
import { getAllProductsYearly } from "./services/data.service.js";
import { predictAllProducts } from "./services/predict.service.js";
import { predictProductDemand } from "./services/regression.service.js";
import { pool } from "./db.js";

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

// Test endpoint for debugging a specific product
app.post("/test-product-prediction", async (req, res) => {
  try {
    const { productId, fromYear, toYear } = req.body;

    if (!productId || !fromYear || !toYear) {
      return res.status(400).json({ error: "productId, fromYear, and toYear are required" });
    }

    // Step 1: Get raw details count using exact query structure
    const countQuery = `
      SELECT
        EXTRACT(YEAR FROM o.created) AS year,
        COUNT(DISTINCT o.id) AS total_orders,
        SUM(d.quantity) AS total_quantity
      FROM orders o
      JOIN details d ON d.order_id = o.id
      WHERE d.product_id = ${productId}
        AND o.created >= DATE '${fromYear}-01-01'
        AND o.created < DATE '${toYear + 1}-01-01'
      GROUP BY year
      ORDER BY year
    `;
    
    console.log('Count Query:', countQuery);
    const countResult = await pool.query(countQuery);
    console.log('Raw data by year:', countResult.rows);

    // Step 2: Get grouped data with product info
    const query = `
      SELECT 
        p.id::text AS product_id,
        p.description AS product_name,
        p.manufacturer,
        EXTRACT(YEAR FROM o.created) AS year,
        COUNT(DISTINCT o.id) AS total_orders,
        SUM(d.quantity) AS total
      FROM orders o
      JOIN details d ON d.order_id = o.id
      JOIN products p ON p.id = d.product_id
      WHERE d.product_id = ${productId}
        AND o.created >= DATE '${fromYear}-01-01'
        AND o.created < DATE '${toYear + 1}-01-01'
      GROUP BY p.id, p.description, p.manufacturer, year
      ORDER BY year ASC
    `;

    console.log('Grouped Query:', query);
    const result = await pool.query(query);
    const rawData = result.rows;

    console.log('Raw data returned:', JSON.stringify(rawData, null, 2));

    // Calculate prediction using regression
    const prediction = predictProductDemand(rawData);

    res.json({
      productId,
      yearRange: { fromYear, toYear },
      manual_query_results: countResult.rows,
      grouped_data: rawData,
      regression_analysis: {
        data_points: rawData.length,
        x_values: rawData.map(d => d.year),
        y_values: rawData.map(d => Number(d.total)),
        slope: prediction.slope,
        intercept: prediction.intercept,
        prediction_2026: prediction.prediction2026
      }
    });
  } catch (error) {
    console.error("Test prediction error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log("AI Server Running"));