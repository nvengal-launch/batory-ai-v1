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
import XLSX from "xlsx";

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

app.post("/predict-products-range", async (req, res) => {
  try {
    const { fromYear, toYear } = req.body;

    // if (!fromYear || !toYear) {
    //   return res.status(400).json({ error: "fromYear and toYear are required" });
    // }

    // if (fromYear > toYear) {
    //   return res.status(400).json({ error: "fromYear must be less than or equal to toYear" });
    // }

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

// Export predictions to Excel
app.post("/export-predictions-excel", async (req, res) => {
  try {
    const { fromYear, toYear, predictions, allProducts, analysis_metadata } = req.body;

    if (!predictions || !Array.isArray(predictions)) {
      return res.status(400).json({ error: "predictions array is required" });
    }

    // Create workbook and sheets
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ["Product Analysis Report - 2026 Predictions"],
      [""],
      ["Analysis Period", `${fromYear} - ${toYear}`],
      ["Total Products Analyzed", analysis_metadata?.total_products_analyzed || 0],
      ["Products with Positive Trend", analysis_metadata?.products_with_positive_trend || 0],
      ["Report Generated", new Date().toLocaleString()],
      [""],
      ["Summary"],
      ["Total analyzed products: Shows all products from the database"],
      ["Positive Trend products: Products with increasing demand (slope > 0)"],
      [""]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Sheet 2: All Analyzed Products
    const allProductsData = (allProducts || []).map((p, idx) => ({
      "Rank": idx + 1,
      "Product ID": p.product_id,
      "Product Name": p.product_name,
      "Manufacturer": p.manufacturer,
      "2026 Prediction": p.prediction?.toFixed(2) || 0,
      "Trend Slope": p.slope?.toFixed(4) || 0,
      "Trend Direction": p.slope > 0 ? "Increasing" : "Decreasing",
      "Status": p.slope > 0 ? "✓ Positive Trend" : "✗ Negative Trend"
    }));
    const allProductsSheet = XLSX.utils.json_to_sheet(allProductsData);
    allProductsSheet["!cols"] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 30 },
      { wch: 20 },
      { wch: 18 },
      { wch: 15 },
      { wch: 18 },
      { wch: 20 }
    ];
    // Add header styling
    const headerStyle = { fill: { fgColor: { rgb: "FFE699" } }, font: { bold: true } };
    for (let i = 0; i < 8; i++) {
      const cell = allProductsSheet[XLSX.utils.encode_col(i) + "1"];
      if (cell) cell.s = headerStyle;
    }
    XLSX.utils.book_append_sheet(wb, allProductsSheet, "All Products");

    // Sheet 3: Top Products (Positive Trend Only)
    const topProductsData = predictions.map((p, idx) => ({
      "Rank": idx + 1,
      "Product ID": p.product_id,
      "Product Name": p.product_name,
      "Manufacturer": p.manufacturer,
      "2026 Prediction": p.prediction?.toFixed(2) || 0,
      "Trend Slope": p.slope?.toFixed(4) || 0,
      "Trend": "📈 Increasing"
    }));
    const topProductsSheet = XLSX.utils.json_to_sheet(topProductsData);
    topProductsSheet["!cols"] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 30 },
      { wch: 20 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 }
    ];
    // Add header styling
    for (let i = 0; i < 7; i++) {
      const cell = topProductsSheet[XLSX.utils.encode_col(i) + "1"];
      if (cell) cell.s = headerStyle;
    }
    XLSX.utils.book_append_sheet(wb, topProductsSheet, "Top Products");

    // Generate Excel file
    const fileName = `Product_Predictions_2026_${fromYear}-${toYear}_${Date.now()}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(excelBuffer);
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Export analyzed data without predictions (raw database data only)
app.post("/export-analyzed-data-excel", (req, res) => {
  try {
    const { rawData, fromYear, toYear } = req.body;

    if (!rawData || !Array.isArray(rawData)) {
      return res.status(400).json({ error: "rawData array is required" });
    }

    // Prepare data for Excel
    const excelData = rawData.map((item, index) => ({
      Rank: index + 1,
      "Product ID": item.product_id,
      "Product Name": item.product_name,
      "Manufacturer": item.manufacturer,
      "Year": item.year,
      "Total Orders": item.total_orders,
      "Total Quantity": item.total
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analyzed Data");

    // Format header row with yellow background
    const headerStyle = {
      fill: { fgColor: { rgb: "FFFF00" } },
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellRef]) continue;
      ws[cellRef].fill = headerStyle.fill;
      ws[cellRef].font = headerStyle.font;
      ws[cellRef].alignment = headerStyle.alignment;
    }

    // Set column widths
    ws["!cols"] = [
      { wch: 8 },   // Rank
      { wch: 15 },  // Product ID
      { wch: 30 },  // Product Name
      { wch: 20 },  // Manufacturer
      { wch: 10 },  // Year
      { wch: 15 },  // Total Orders
      { wch: 15 }   // Total Quantity
    ];

    // Write to buffer
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    // Send response with file
    const fileName = `analyzed-data-${fromYear}-${toYear}-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(excelBuffer);
  } catch (error) {
    console.error("Analyzed data export error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log("AI Server Running"));