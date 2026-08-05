import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  select: {
    email: true,
    plan: true,
    stripeCustomerId: true,
    stripeSubscriptionId: true,
    subscriptionStatus: true,
    subscriptionCurrentPeriodEnd: true,
  },
});

console.log(JSON.stringify(users, null, 2));
await prisma.$disconnect();
