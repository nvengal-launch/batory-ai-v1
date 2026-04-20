import { predictProductDemand } from "./regression.service.js";
import { chatWithAI } from "./openai.service.js";

export async function predictAllProducts(data) {

  const grouped = {};

//   console.log('Data for prediction >>> predictAllProducts', data);

  // group by unique product_id
  data.forEach(d => {
    if (!grouped[d.product_id]) {
      grouped[d.product_id] = [];
    }
    grouped[d.product_id].push(d);
  });

  let predictions = [];
//   console.log('Grouped Data for prediction >>>', grouped);
  for (let productId in grouped) {
    const productData = grouped[productId];
    const stats = predictProductDemand(productData);
    const productName = productData[0]?.product_name || 'Unknown Product';
    const manufacturer = productData[0]?.manufacturer || 'Unknown Manufacturer';

    predictions.push({
      product_id: productId,
      product_name: productName,
      manufacturer,
      prediction: stats.prediction2026,
      slope: stats.slope
    });
  }

  // sort and filter top products
  // Filter: Only products with positive slope (increasing trend) and positive 2026 prediction
  let upcomingProducts = predictions.filter(p => 
    p.slope > 0 && p.prediction > 0
  );

  // Sort by prediction value (highest to lowest)
  upcomingProducts.sort((a, b) => b.prediction - a.prediction);

  // Take top 10 future demanding products
//   const topProducts = upcomingProducts.slice(0, 10);
  const topProducts = upcomingProducts;
  
  console.log('Total products analyzed:', predictions.length);
  console.log('Products with positive trend (increasing demand):', upcomingProducts.length);
  console.log('Top products for 2026:', topProducts);
  
  // AI explanation
  const insight = await chatWithAI(`
Products with increasing demand for 2026:
${JSON.stringify(topProducts)}

Explain why these products will have growing demand in 2026 based on trends and business insights.
`);

  return {
    topProducts,
    insight
  };
}