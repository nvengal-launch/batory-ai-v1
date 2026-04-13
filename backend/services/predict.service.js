import { predictProductDemand } from "./regression.service.js";
import { chatWithAI } from "./openai.service.js";

export async function predictAllProducts(data) {

  const grouped = {};

  // group by product
  data.forEach(d => {
    if (!grouped[d.product_name]) {
      grouped[d.product_name] = [];
    }
    grouped[d.product_name].push(d);
  });

  let predictions = [];

  for (let product in grouped) {

    const stats = predictProductDemand(grouped[product]);

    predictions.push({
      product,
      prediction: stats.prediction2026,
      slope: stats.slope
    });
  }

  // sort top products
  predictions.sort((a, b) => b.prediction - a.prediction);

  // take top 5
  const topProducts = predictions.slice(0, 5);

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