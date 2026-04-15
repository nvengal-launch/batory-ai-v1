import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateSQL(userMessage, dbSchema) {

  const systemPrompt = `
    You are a Microsoft SQL Server T-SQL generator.
    Convert user request into ONE SELECT query only.
    Schema: ${dbSchema}
  `;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ]
  });

  return res.choices[0].message.content.trim();
}

export async function chatWithAI(message, context = "") {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are business AI assistant"
      },
      {
        role: "user",
        content: message + context
      }
    ]
  });

  return res.choices[0].message.content;
}

export async function createEmbedding(text) {
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });

  return res.data[0].embedding;
}