import { SimpleLinearRegression } from "ml-regression";

export function predictProductDemand(data) {

  const X = data.map(d => Number(d.year));
  const Y = data.map(d => Number(d.total));

  const model = new SimpleLinearRegression(X, Y);

  return {
    prediction2026: model.predict(2026),
    slope: model.slope,
    intercept: model.intercept
  };
}