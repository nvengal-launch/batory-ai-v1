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

  // sort top products
  predictions.sort((a, b) => b.prediction - a.prediction);

  // take top 5
//   const topProducts = predictions.slice(0, 10);
  const topProducts = predictions;
//   console.log('Top Predicted Products >>>', topProducts);
  // AI explanation
  const insight = await chatWithAI(`
Top predicted products:
${JSON.stringify(topProducts)}

Explain trends and business insights.
`);

  return {
    topProducts,
    insight
  };
}