import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Produce", icon: "apple", order: 1 },
  { name: "Dairy", icon: "milk", order: 2 },
  { name: "Meat & Seafood", icon: "beef", order: 3 },
  { name: "Frozen", icon: "snowflake", order: 4 },
  { name: "Pantry", icon: "package", order: 5 },
  { name: "Beverages", icon: "cup-soda", order: 6 },
  { name: "Snacks", icon: "cookie", order: 7 },
  { name: "Household", icon: "home", order: 8 },
  { name: "Personal Care", icon: "sparkles", order: 9 },
];

async function main() {
  console.log("Seeding categories...");

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { icon: category.icon, order: category.order },
      create: category,
    });
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
