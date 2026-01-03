import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const stores = [
  { name: "Aldi", icon: "store", order: 1 },
  { name: "Target", icon: "target", order: 2 },
  { name: "Walmart", icon: "store", order: 3 },
  { name: "BJ's", icon: "warehouse", order: 4 },
  { name: "Costco", icon: "warehouse", order: 5 },
  { name: "CVS", icon: "pill", order: 6 },
  { name: "Walgreens", icon: "pill", order: 7 },
  { name: "Amazon", icon: "package", order: 8 },
  { name: "Other", icon: "shopping-bag", order: 99 },
];

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
  { name: "Baby", icon: "baby", order: 10 },
  { name: "Pet", icon: "dog", order: 11 },
  { name: "Other", icon: "box", order: 99 },
];

async function main() {
  console.log("Seeding stores...");
  for (const store of stores) {
    await prisma.store.upsert({
      where: { name: store.name },
      update: { icon: store.icon, order: store.order },
      create: store,
    });
  }

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
