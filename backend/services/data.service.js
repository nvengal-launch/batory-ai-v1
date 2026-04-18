import { runQuery } from "../db.js";

export async function getAllProductsYearly(fromYear = null, toYear = null) {

  console.log('getAllProductsYearly called with:', { fromYear, toYear });

  let sql = `
    SELECT 
      p.id::text AS product_id,
      p.description AS product_name,
      p.manufacturer,
      EXTRACT(YEAR FROM o.created) AS year,
      COUNT(DISTINCT o.id) AS total_orders,
      SUM(d.quantity) AS total
    FROM orders o
    JOIN details d ON d.order_id = o.id
    JOIN products p ON p.id = d.product_id`;

  // Add year range filter if provided
  // Fetches from 01-01-fromYear to before 01-01-(toYear+1)
  if (fromYear !== null && toYear !== null) {
    const nextYear = toYear + 1;
    sql += ` WHERE o.created >= DATE '${fromYear}-01-01' AND o.created < DATE '${nextYear}-01-01'`;
  }

  sql += `
    GROUP BY p.id, p.description, p.manufacturer, year
    ORDER BY p.id, year ASC
  `;

  console.log('SQL Query:', sql);

  const result = await runQuery(sql);
  console.log('Query returned', result.length, 'rows with year range', fromYear, '-', toYear);
  console.log('Raw data:', JSON.stringify(result, null, 2));
  
  return result;
}