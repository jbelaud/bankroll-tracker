const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const signups = await prisma.growthEvent.findMany({
    where: {
      name: "signup_completed",
      userId: { not: null },
      anonymousId: { not: null },
    },
    select: { userId: true, anonymousId: true },
  });

  const usersByAnonymousId = new Map();
  for (const signup of signups) {
    const users = usersByAnonymousId.get(signup.anonymousId) ?? new Set();
    users.add(signup.userId);
    usersByAnonymousId.set(signup.anonymousId, users);
  }

  let eligibleAnonymousIds = 0;
  let ambiguousAnonymousIds = 0;
  let linkedEvents = 0;

  for (const [anonymousId, users] of usersByAnonymousId) {
    if (users.size !== 1) {
      ambiguousAnonymousIds += 1;
      continue;
    }
    eligibleAnonymousIds += 1;
    const userId = [...users][0];
    const result = apply
      ? await prisma.growthEvent.updateMany({
          where: { anonymousId, userId: null },
          data: { userId },
        })
      : await prisma.growthEvent.count({ where: { anonymousId, userId: null } });
    linkedEvents += typeof result === "number" ? result : result.count;
  }

  console.log(JSON.stringify({ apply, eligibleAnonymousIds, ambiguousAnonymousIds, linkedEvents }, null, 2));
}

main()
  .catch((error) => {
    console.error("Impossible de relier les événements anonymes :", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
