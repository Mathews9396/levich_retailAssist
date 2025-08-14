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

cd <project-folder>

npm install

2️. Environment Variables

.env – for development

.env.test – for testing

A sample env file is provided.

3. Prisma Setup
npx prisma generate

npx prisma migrate deploy

npx prisma studio
   

4.Running the Project

To seed data
npm 

Run in TypeScript (Dev Mode)

npm run dev 

Run in JavaScript (Production Mode)

npm run build

npm start


5. Running Tests

npm run test
