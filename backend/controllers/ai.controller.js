import { generateSQL } from "../services/openai.service.js"; 
import { runQuery } from "../db.js";

app.post("/ai-sql", async (req, res) => {

  const { question } = req.body;

  const dbSchema = `
- orders (id, distributor, dc, order_date, amount)
- products (id, name, category)
`;

  const sql = await generateSQL(question, dbSchema);

  if (sql === "--SCHEMA_MISMATCH") {
    return res.json({ error: "Schema mismatch" });
  }

  const data = await runQuery(sql);

  res.json({
    sql,
    data
  });

});