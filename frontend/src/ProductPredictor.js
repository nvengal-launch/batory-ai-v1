import React, { useState } from "react";
import "./ProductPredictor.css";

function ProductPredictor() {
  const [fromYear, setFromYear] = useState(2023);
  const [toYear, setToYear] = useState(2025);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePredictProducts = async () => {
    setLoading(true);
    setError(null);

    // Validate year range
    // if (!fromYear || !toYear) {
    //   setError("Please select both from year and to year");
    //   setLoading(false);
    //   return;
    // }

    // if (fromYear > toYear) {
    //   setError("'From Year' must be less than or equal to 'To Year'");
    //   setLoading(false);
    //   return;
    // }

    try {
      console.log('Sending request with years:', { fromYear: parseInt(fromYear), toYear: parseInt(toYear) });
      
      const response = await fetch("http://localhost:5000/predict-products-range", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        // body: JSON.stringify({
        //   fromYear: parseInt(fromYear),
        //   toYear: parseInt(toYear)
        // })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Prediction Response >>>', data);
      console.log('Number of predictions:', data.topProducts?.length || 0);
      setPredictions(data);
    } catch (err) {
      setError("Failed to fetch predictions: " + err.message);
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-predictor">
      <div className="predictor-header">
        <h2>🚀 2026 Product Predictions</h2>
        <p>Analyze sales trends from a specific year range to predict future products</p>
      </div>

      <div className="year-selection">
        <div className="year-input-group">
          <label htmlFor="fromYear">From Year:</label>
          <input
            id="fromYear"
            type="number"
            value={fromYear}
            onChange={(e) => setFromYear(e.target.value)}
            min="2000"
            max="2026"
            disabled={loading}
          />
        </div>

        <div className="year-input-group">
          <label htmlFor="toYear">To Year:</label>
          <input
            id="toYear"
            type="number"
            value={toYear}
            onChange={(e) => setToYear(e.target.value)}
            min="2000"
            max="2026"
            disabled={loading}
          />
        </div>
      </div>

      <button
        onClick={handlePredictProducts}
        disabled={loading}
        className="predict-button"
      >
        {loading ? "Analyzing Market Trends..." : "Predict 2026 Products"}
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {predictions && (
        <div className="predictions-container">
          <div className="predictions-meta">
            <p><strong>Analysis Period:</strong> {fromYear} - {toYear}</p>
            <p><strong>Prediction Year:</strong> 2026</p>
            <p><strong>Top Products:</strong> {predictions.topProducts?.length || 0}</p>
          </div>

          <div className="predictions-content">
            <h3>Top {predictions.topProducts.length} Predicted Products for 2026</h3>
            {predictions.topProducts && predictions.topProducts.length > 0 ? (
              <div className="products-list">
                {predictions.topProducts.map((product, idx) => (
                  <div key={idx} className="product-card">
                    <div className="product-rank">#{idx + 1}</div>
                    <div className="product-info">
                      <h4>{product.product_name}</h4>
                      <p><strong>Product ID:</strong> {product.product_id}</p>
                      <p><strong>Manufacturer:</strong> {product.manufacturer}</p>
                      <p><strong>Predicted Demand:</strong> {product.prediction?.toFixed(2) || "N/A"} units</p>
                      <p><strong>Trend:</strong> <span className={`trend ${product.slope > 0 ? "positive" : "negative"}`}>
                        {product.slope > 0 ? "📈 Increasing" : "📉 Decreasing"}
                      </span></p>
                      <p><strong>Slope:</strong> {product.slope?.toFixed(4) || "N/A"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No prediction data available</p>
            )}
          </div>

          {predictions.insight && (
            <div className="insight-section">
              <h3>📊 Market Insights</h3>
              <div className="insight-text">
                {predictions.insight}
              </div>
            </div>
          )}

          <div className="download-buttons-group">
            <button
              onClick={async () => {
                try {
                  const response = await fetch("http://localhost:5000/export-predictions-excel", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      fromYear,
                      toYear,
                      predictions: predictions.topProducts,
                      allProducts: predictions.allProducts,
                      analysis_metadata: predictions.analysis_metadata
                    })
                  });

                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }

                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Product_Predictions_2026_${fromYear}-${toYear}_${Date.now()}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (err) {
                  console.error("Excel download error:", err);
                  alert("Failed to download Excel file: " + err.message);
                }
              }}
              className="download-button excel-button"
            >
              📊 Download as Excel
            </button>

            <button
              onClick={() => {
                const element = document.createElement("a");
                const file = new Blob([JSON.stringify(predictions, null, 2)], { type: "application/json" });
                element.href = URL.createObjectURL(file);
                element.download = `product-predictions-2026-${Date.now()}.json`;
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              className="download-button json-button"
            >
              📥 Download as JSON
            </button>

            <button
              onClick={async () => {
                try {
                  const response = await fetch("http://localhost:5000/export-analyzed-data-excel", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      fromYear,
                      toYear,
                      rawData: predictions.rawAnalyzedData
                    })
                  });

                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }

                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Analyzed_Data_${fromYear}-${toYear}_${Date.now()}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (err) {
                  console.error("Raw data download error:", err);
                  alert("Failed to download raw data: " + err.message);
                }
              }}
              className="download-button raw-data-button"
            >
              📋 Download Raw Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductPredictor;
