import OpenAI from "openai";
import { runQuery, pool } from "../db.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getDBSchema() {
  const query = `
    SELECT
      table_name,
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;

  const result = await pool.query(query);

  let schema = '';
  let currentTable = '';

  for (const row of result.rows) {
    if (row.table_name !== currentTable) {
      schema += `\n\nTable: ${row.table_name}\n`;
      currentTable = row.table_name;
    }
    schema += `  - ${row.column_name} (${row.data_type})\n`;
  }

  return schema;
}

export async function generateSQL(userMessage, dbSchema) {
  if (!userMessage) {
    throw new Error("User message (question) is required");
  }
  if (!dbSchema) {
    throw new Error("Database schema is empty or null");
  }

  const systemPrompt = `
You are a PostgreSQL SQL generator.

Convert user request into ONE SELECT query only.

Schema:
${dbSchema}
`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ]
  });

  let sql = res.choices[0].message.content.trim();

  // Remove markdown code blocks if present
  sql = sql.replace(/^```(?:sql)?\n?/, '').replace(/\n?```$/, '');

  return sql;
}

export async function processAISQL(question) {

  const dbSchema = await getDBSchema();
  const sql = await generateSQL(question, dbSchema);
  const data = await runQuery(sql);
  return { sql, data };

}