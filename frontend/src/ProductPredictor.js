import React, { useState, useRef } from "react";
import "./ProductPredictor.css";

function ProductPredictor() {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [metadata, setMetadata] = useState(null);
  const pageCache = useRef({}); // Cache for storing fetched pages
  const recordsPerPage = 10;

  const handlePredictProducts = async () => {
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    pageCache.current = {}; // Clear cache on new prediction

    try {
      const response = await fetch("http://localhost:5000/predict-products-paginated?page=1&limit=10", {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Paginated Response:', data);
      
      // Cache the first page
      pageCache.current[1] = data.products;
      
      setPredictions(data.products);
      setTotalPages(data.total_pages);
      setMetadata(data.analysis_metadata);
    } catch (err) {
      setError("Failed to fetch predictions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch page data with caching
  const fetchPage = async (page) => {
    // Check if page is already cached
    if (pageCache.current[page]) {
      console.log(`Loading page ${page} from cache`);
      setPredictions(pageCache.current[page]);
      return;
    }

    // If not cached, fetch from server
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching page ${page} from server`);
      const response = await fetch(`http://localhost:5000/predict-products-paginated?page=${page}&limit=10`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the fetched page
      pageCache.current[page] = data.products;
      
      setPredictions(data.products);
      setMetadata(data.analysis_metadata);
    } catch (err) {
      setError("Failed to fetch page: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      fetchPage(newPage);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      fetchPage(newPage);
    }
  };

  return (
    <div className="product-predictor">
      <div className="predictor-header">
        <h2>🚀 2026 Product Predictions</h2>
        <p>Analyze sales trends to predict future products</p>
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
            <p><strong>Products Analyzed:</strong> {metadata?.total_products_analyzed || 0}</p>
            <p><strong>Positive Trends:</strong> {metadata?.products_with_positive_trend || 0}</p>
            <p><strong>Total Pages:</strong> {totalPages}</p>
          </div>

          <div className="predictions-content">
            <h3>Top Predicted Products for 2026</h3>
            {loading ? (
              <div className="loader-container">
                <div className="spinner"></div>
                <p>Loading predictions...</p>
              </div>
            ) : predictions && predictions.length > 0 ? (
              <div className="table-wrapper">
                <table className="predictions-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Product ID</th>
                      <th>Product Name</th>
                      <th>Manufacturer</th>
                      <th>Predicted Demand</th>
                      <th>Slope</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((product, idx) => {
                      const globalIdx = (currentPage - 1) * recordsPerPage + idx;
                      return (
                        <tr key={globalIdx}>
                          <td>{globalIdx + 1}</td>
                          <td>{product.product_id}</td>
                          <td>{product.product_name}</td>
                          <td>{product.manufacturer}</td>
                          <td>{product.prediction?.toFixed(2) || "N/A"} units</td>
                          <td>{product.slope?.toFixed(4) || "N/A"}</td>
                          <td>
                            <span className={`trend-badge ${product.slope > 0 ? "positive" : "negative"}`}>
                              {product.slope > 0 ? "📈 Increasing" : "📉 Decreasing"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="pagination">
                  <button 
                    onClick={handlePrevious}
                    disabled={currentPage === 1 || loading}
                    className="pagination-btn"
                  >
                    ← Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    onClick={handleNext}
                    disabled={currentPage === totalPages || loading}
                    className="pagination-btn"
                  >
                    Next →
                  </button>
                </div>
              </div>
            ) : (
              <p className="no-data">No prediction data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductPredictor;
