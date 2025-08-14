# 🛒 Retail Billing System Backend

A Node.js + TypeScript backend with PostgreSQL and Prisma for managing products, stock, and billing operations.  
Includes automated testing setup with Jest and a dedicated test database.

---

## 📦 Tech Stack
- **Node.js** (TypeScript)
- **Express.js**
- **PostgreSQL** (via Prisma ORM)
- **Jest** (testing)
- **dotenv-cli** (environment handling)
- **Nodemon** + **TSX** (dev hot-reload)

---

## 🚀 Getting Started

1️. Clone & Install

git clone <repo-url>

cd levich_retailAssist

npm install

2️. Environment Variables

Create an env file based on the sample env file provided.


3. Prisma Setup
   
npx prisma generate

npx prisma migrate deploy

npx prisma studio (optional, to view the changes made by prisma migrations)
   

4.Running the Project

To seed data
npm run db:seed

Run in TypeScript (Dev Mode)

npm run dev 

Run in JavaScript (Production Mode)

npm run build

npm start


5. Running Tests

Create a test database

npm run test


6. Further code to add

Loggers and linters for debugging

More test cases to cover all defined scenarios and edge cases

Rate Limiting

Docker
