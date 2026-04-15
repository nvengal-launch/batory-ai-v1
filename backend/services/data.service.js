import { runQuery } from "../db.js";

export async function getAllProductsYearly() {

  const sql = `
    SELECT 
      p.manufacturer AS product_name,
      p.description,
      p.id AS product_id,
      EXTRACT(YEAR FROM o.created) AS year,
      SUM(d.quantity) AS total
    FROM orders o
    JOIN details d ON d.order_id = o.id
    JOIN products p ON p.id = d.product_id
    GROUP BY p.id, p.description, year
    ORDER BY year, total DESC
    LIMIT 50
  `;

  return await runQuery(sql);
}