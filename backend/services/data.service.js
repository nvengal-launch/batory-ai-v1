import { runQuery } from "../db.js";

export async function getAllProductsYearly(fromYear = null, toYear = null) {

  let sql = `
    SELECT 
      p.manufacturer AS product_name,
      p.description,
      p.id AS product_id,
      EXTRACT(YEAR FROM o.created) AS year,
      SUM(d.quantity) AS total
    FROM orders o
    JOIN details d ON d.order_id = o.id
    JOIN products p ON p.id = d.product_id`;

  // Add year range filter if provided
  if (fromYear !== null && toYear !== null) {
    sql += ` WHERE EXTRACT(YEAR FROM o.created) >= ${fromYear} AND EXTRACT(YEAR FROM o.created) <= ${toYear}`;
  }

  sql += `
    GROUP BY p.id, p.description, year
    ORDER BY year, total DESC
    LIMIT 2
  `;

  console.log('sql >>>', sql);

  return await runQuery(sql);
}