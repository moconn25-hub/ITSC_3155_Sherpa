import { promisify } from "node:util";
import { scrypt as scryptCallback } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import signin from "./signin.js";

const { getSession, signIn, signOut, SigninError } = signin;
const scrypt = promisify(scryptCallback);

async function passwordHash(password) {
  const salt = "aabbccdd00112233";
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

describe("signIn", () => {
  it("authenticates matching credentials and stores only a session token hash", async () => {
    const user = {
      id: "student-id",
      email: "student@example.edu",
      firstName: "Sam",
      lastName: "Student",
      role: "student",
      passwordHash: await passwordHash("A-long-demo-password")
    };
    const authSession = { create: vi.fn().mockResolvedValue({ id: "session-id" }) };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      authSession
    };

    const result = await signIn(prisma, {
      email: " STUDENT@example.edu ",
      password: "A-long-demo-password",
      role: "student"
    }, new Date("2026-01-01T00:00:00Z"));

    expect(result.user).toMatchObject({ id: "student-id", role: "student" });
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    const sessionData = authSession.create.mock.calls[0][0].data;
    expect(sessionData.userId).toBe("student-id");
    expect(sessionData.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(sessionData.tokenHash).not.toBe(result.token);
    expect(sessionData.expiresAt.toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });

  it("rejects incorrect password or role without creating a session", async () => {
    const user = {
      id: "student-id",
      email: "student@example.edu",
      firstName: "Sam",
      lastName: "Student",
      role: "student",
      passwordHash: await passwordHash("A-long-demo-password")
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      authSession: { create: vi.fn() }
    };

    await expect(signIn(prisma, {
      email: user.email,
      password: "the-wrong-password",
      role: "student"
    })).rejects.toBeInstanceOf(SigninError);

    await expect(signIn(prisma, {
      email: user.email,
      password: "A-long-demo-password",
      role: "teacher"
    })).rejects.toBeInstanceOf(SigninError);

    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });
});

describe("session lifecycle", () => {
  it("loads the saved roadmap for a returning student without creating a new one", async () => {
    const token = "ab".repeat(32);
    const session = {
      id: "session-id",
      expiresAt: new Date("2026-01-09T00:00:00Z"),
      user: {
        id: "student-id",
        email: "student@example.edu",
        firstName: "Sam",
        lastName: "Student",
        role: "student",
        profile: { majorProgram: { name: "Computer Science, B.S." } },
        roadmap: {
          id: "roadmap-id",
          courses: [{ position: 1, course: { code: "SAMPLE-101" } }]
        }
      }
    };
    const prisma = {
      authSession: { findUnique: vi.fn().mockResolvedValue(session) }
    };

    await expect(getSession(prisma, token, new Date("2026-01-08T00:00:00Z")))
      .resolves.toMatchObject({
        user: { roadmap: { courses: [{ position: 1, course: { code: "SAMPLE-101" } }] } }
      });
    expect(prisma.authSession.findUnique.mock.calls[0][0].where.tokenHash).not.toBe(token);
  });

  it("expires and deletes stale sessions", async () => {
    const token = "cd".repeat(32);
    const prisma = {
      authSession: {
        findUnique: vi.fn().mockResolvedValue({
          id: "expired-session",
          expiresAt: new Date("2026-01-01T00:00:00Z"),
          user: {}
        }),
        delete: vi.fn().mockResolvedValue({})
      }
    };

    await expect(getSession(prisma, token, new Date("2026-01-02T00:00:00Z"))).resolves.toBeNull();
    expect(prisma.authSession.delete).toHaveBeenCalledWith({ where: { id: "expired-session" } });
  });

  it("invalidates the stored session at sign-out", async () => {
    const token = "ef".repeat(32);
    const prisma = {
      authSession: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) }
    };

    await signOut(prisma, token);
    expect(prisma.authSession.deleteMany.mock.calls[0][0].where.tokenHash).not.toBe(token);
  });
});
