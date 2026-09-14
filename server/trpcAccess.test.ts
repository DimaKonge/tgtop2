import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";

const guardedRouter = router({
  protectedRead: protectedProcedure.query(({ ctx }) => ctx.user.openId),
  adminRead: adminProcedure.query(({ ctx }) => ctx.user.openId),
});

const user = (role: User["role"]): User => ({
  id: 1,
  openId: "telegram:100",
  name: "Test user",
  email: null,
  avatarUrl: null,
  telegramUsername: "test_user",
  loginMethod: "telegram-mini-app",
  role,
  publicProfile: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
});

function context(input: { user?: User | null; authUnavailable?: boolean } = {}): TrpcContext {
  return { req: {} as TrpcContext["req"], res: {} as TrpcContext["res"], user: input.user ?? null, authUnavailable: input.authUnavailable };
}

describe("tRPC access middleware", () => {
  it("rejects an unavailable identity before a privileged procedure runs", async () => {
    const caller = guardedRouter.createCaller(context({ authUnavailable: true }));
    await expect(caller.adminRead()).rejects.toMatchObject<Partial<TRPCError>>({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("rejects anonymous and non-admin callers while allowing the current admin role", async () => {
    await expect(guardedRouter.createCaller(context()).protectedRead()).rejects.toMatchObject<Partial<TRPCError>>({ code: "UNAUTHORIZED" });
    await expect(guardedRouter.createCaller(context({ user: user("moderator") })).adminRead()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
    await expect(guardedRouter.createCaller(context({ user: user("admin") })).adminRead()).resolves.toBe("telegram:100");
  });
});
