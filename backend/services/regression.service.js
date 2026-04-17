import { SimpleLinearRegression } from "ml-regression";

export function predictProductDemand(data) {
    console.log('Data for regression >>>', data);

  // Extract and convert X and Y values
  const validData = data
    .filter(d => {
      const year = Number(d.year);
      const total = Number(d.total);
      return !isNaN(year) && !isNaN(total) && total > 0;
    });

    // console.log('Valid Data for regression >>>', validData);
  // Need at least 2 data points for regression
  if (validData.length < 2) {
    return {
      prediction2026: 0,
      slope: 0,
      intercept: 0
    };
  }

  const X = validData.map(d => Number(d.year));
  const Y = validData.map(d => Number(d.total));
//   console.log('X for regression >>>', X);
//   console.log('Y for regression >>>', Y);
  const model = new SimpleLinearRegression(X, Y);

//   console.log('model >>>>', model);
  
  return {
    prediction2026: model.predict(2026),
    slope: model.slope,
    intercept: model.intercept
  };
}