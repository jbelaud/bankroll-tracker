import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  userDeleteMany: vi.fn(),
  storageRemove: vi.fn(),
  authDeleteUser: vi.fn(),
  stripeCustomerDelete: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
      deleteMany: mocks.userDeleteMany,
    },
  },
}));
vi.mock("@/lib/scan/quality", () => ({ QUALITY_BUCKET: "scan-quality" }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    storage: { from: () => ({ remove: mocks.storageRemove }) },
    auth: { admin: { deleteUser: mocks.authDeleteUser } },
  }),
}));
vi.mock("@/lib/stripe", () => ({ stripe: { customers: { del: mocks.stripeCustomerDelete } } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const { deleteAdminUser, updateAdminUserPlan } = await import("@/lib/actions/admin-users");

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

describe("admin user actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    mocks.requireAdmin.mockResolvedValue({ id: ADMIN_ID, email: "admin@example.com" });
    mocks.userUpdate.mockResolvedValue({});
    mocks.userDeleteMany.mockResolvedValue({ count: 1 });
    mocks.storageRemove.mockResolvedValue({ error: null });
    mocks.authDeleteUser.mockResolvedValue({ error: null });
    mocks.stripeCustomerDelete.mockResolvedValue({ deleted: true });
  });

  it("updates a manually managed plan and revalidates the admin", async () => {
    mocks.userFindUnique.mockResolvedValue({
      email: "user@example.com",
      plan: "FREE",
      stripeSubscriptionId: null,
    });

    await expect(updateAdminUserPlan(USER_ID, "BETA_TESTER")).resolves.toEqual({ plan: "BETA_TESTER" });
    expect(mocks.userUpdate).toHaveBeenCalledWith({ where: { id: USER_ID }, data: { plan: "BETA_TESTER" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[locale]/admin", "page");
  });

  it("does not override a Stripe-managed plan", async () => {
    mocks.userFindUnique.mockResolvedValue({
      email: "paid@example.com",
      plan: "PREMIUM",
      stripeSubscriptionId: "sub_123",
    });

    await expect(updateAdminUserPlan(USER_ID, "FREE")).rejects.toThrow("pilotée par Stripe");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("prevents an administrator from deleting their own account", async () => {
    await expect(deleteAdminUser(ADMIN_ID)).rejects.toThrow("propre compte administrateur");
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("blocks deletion while a Stripe subscription is still linked", async () => {
    mocks.userFindUnique.mockResolvedValue({
      email: "paid@example.com",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      scanQualityReports: [],
    });

    await expect(deleteAdminUser(USER_ID)).rejects.toThrow("Résilie d’abord");
    expect(mocks.stripeCustomerDelete).not.toHaveBeenCalled();
    expect(mocks.authDeleteUser).not.toHaveBeenCalled();
  });

  it("removes external data, the Auth account, and the app profile", async () => {
    mocks.userFindUnique.mockResolvedValue({
      email: "user@example.com",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: null,
      scanQualityReports: [{ storagePath: `${USER_ID}/report.png` }],
    });

    await expect(deleteAdminUser(USER_ID)).resolves.toEqual({ deleted: true });
    expect(mocks.storageRemove).toHaveBeenCalledWith([`${USER_ID}/report.png`]);
    expect(mocks.stripeCustomerDelete).toHaveBeenCalledWith("cus_123");
    expect(mocks.authDeleteUser).toHaveBeenCalledWith(USER_ID, false);
    expect(mocks.userDeleteMany).toHaveBeenCalledWith({ where: { id: USER_ID } });
    expect(mocks.storageRemove.mock.invocationCallOrder[0]).toBeLessThan(mocks.authDeleteUser.mock.invocationCallOrder[0]);
    expect(mocks.authDeleteUser.mock.invocationCallOrder[0]).toBeLessThan(mocks.userDeleteMany.mock.invocationCallOrder[0]);
  });
});
