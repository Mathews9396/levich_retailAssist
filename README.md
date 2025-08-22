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

1️. Clone the Repo

$ git clone <repo-url>

$ cd levich_retailAssist


2. If Docker is installed

$ docker compose up

This command builds/pulls the Postgres and Node app images, creates containers, runs Prisma client generation and seeding, and then starts the application server.

3. Install Dependencies and create Environment Variables

$ npm install

Create an env file based on the sample env file provided.


4. Prisma Setup
   
$ npx prisma generate

$ npx prisma migrate deploy
 
$ npx prisma studio (optional, to view the changes made by prisma migrations)
   

5. Running the Project

To seed data
$ npm run db:seed

Run in TypeScript (Dev Mode)

$ npm run dev 

Run in JavaScript (Production Mode)

$ npm run build

$ npm start


6. Running Tests

Create a test database

$ npm run test


7. Further enhancements:

Loggers and linters for debugging

More test cases to cover all defined scenarios and edge cases

Rate Limiting
