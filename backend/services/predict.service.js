import { predictProductDemand } from "./regression.service.js";
import { chatWithAI } from "./openai.service.js";

export async function predictAllProducts(data) {

  const grouped = {};

  console.log('Data for prediction >>> predictAllProducts', data);

  // group by product
  data.forEach(d => {
    if (!grouped[d.product_name]) {
      grouped[d.product_name] = [];
    }
    grouped[d.product_name].push(d);
  });

  let predictions = [];
  console.log('Grouped Data for prediction >>>', grouped);
  for (let product in grouped) {
    // console.log(`Predicting for product >>> ${product}`);
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
  const topProducts = predictions.slice(0, 10);
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