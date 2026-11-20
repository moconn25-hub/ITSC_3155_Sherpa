const { promisify } = require("node:util");
const {
  createHash,
  randomBytes,
  scrypt: scryptCallback,
  timingSafeEqual
} = require("node:crypto");

const scrypt = promisify(scryptCallback);
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

class SigninError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "SigninError";
    this.statusCode = statusCode;
  }
}

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function passwordMatches(password, storedHash) {
  if (typeof storedHash !== "string") {
    return false;
  }
  const [algorithm, salt, hash, extra] = storedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !salt ||
    !/^[0-9a-f]+$/i.test(salt) ||
    !hash ||
    !/^[0-9a-f]+$/i.test(hash) ||
    extra !== undefined ||
    hash.length % 2 !== 0
  ) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function signIn(prisma, input, now = new Date()) {
  if (
    !input ||
    typeof input.email !== "string" ||
    typeof input.password !== "string" ||
    typeof input.role !== "string"
  ) {
    throw new SigninError("Enter your role, email, and password.", 400);
  }

  const email = input.email.trim().toLowerCase();
  if (!email || email.length > 254 || input.password.length > 128) {
    throw new SigninError("The role, email, or password is incorrect.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      passwordHash: true
    }
  });

  const validPassword = await passwordMatches(input.password, user && user.passwordHash);
  if (!user || user.role !== input.role || !validPassword) {
    throw new SigninError("The role, email, or password is incorrect.", 401);
  }

  const token = randomBytes(32).toString("hex");
  await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(now.getTime() + sessionLifetimeMs)
    }
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    }
  };
}

async function getSession(prisma, token, now = new Date()) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/i.test(token)) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          profile: {
            select: {
              majorProgram: { select: { name: true } },
              desiredCareer: { select: { name: true } }
            }
          },
          roadmap: {
            select: {
              id: true,
              generatedAt: true,
              courses: {
                orderBy: { position: "asc" },
                select: {
                  position: true,
                  completedAt: true,
                  course: {
                    select: { id: true, code: true, title: true, description: true, isSample: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!session) {
    return null;
  }
  if (session.expiresAt <= now) {
    await prisma.authSession.delete({ where: { id: session.id } });
    return null;
  }

  return { user: session.user };
}

async function signOut(prisma, token) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/i.test(token)) {
    return;
  }
  await prisma.authSession.deleteMany({
    where: { tokenHash: hashSessionToken(token) }
  });
}

module.exports = {
  SigninError,
  getSession,
  passwordMatches,
  signIn,
  signOut
};
