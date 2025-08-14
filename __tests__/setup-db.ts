import { PrismaClient } from '../generated/prisma';
const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
    // Wipe all data before each test
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE products RESTART IDENTITY CASCADE`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE stocks RESTART IDENTITY CASCADE`);
});

// beforeEach(async () => {

//   // Add more tables as needed
// });

afterAll(async () => {
  await prisma.$disconnect();
});