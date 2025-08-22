import dotenv from "dotenv";

dotenv.config();

if (process.env.NODE_ENV === "test") {
  console.log(`test env detected`);

  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
