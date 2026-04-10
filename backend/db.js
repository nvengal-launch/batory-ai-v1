import pkg from "pg";

const { Pool } = pkg;

// export const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "batoryfoods",
//   password: "postgres",
//   port: 5432
// });

export const pool = new Pool({
  user: "BatoryFoodsAdminprod",
  host: "batoryportalpostgresprod.postgres.database.azure.com",
  database: "batoryfoods",
  password: "striveConsulting!",
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function runQuery(sql) {

  const res = await pool.query(sql);

  return res.rows;
}