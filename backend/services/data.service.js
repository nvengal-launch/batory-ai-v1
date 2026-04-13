import { runQuery } from "../db.js";

export async function getAllProductsYearly() {

  const sql = `
    SELECT 
  p.description AS product_name,
  EXTRACT(YEAR FROM o.created) AS year,
  SUM(d.quantity) AS total
FROM orders o
JOIN details d ON d.order_id = o.id
JOIN products p ON p.id = d.product_id
GROUP BY p.description, year;
  `;

  return await runQuery(sql);
}