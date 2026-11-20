const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const prisma = require("./data/prisma");
const { createSignup, SignupValidationError, DuplicateEmailError } = require("./auth/signup");
const { getSession, signIn, signOut, SigninError } = require("./auth/signin");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT) || 3000;
const maxRequestBytes = 16 * 1024;
const publicFiles = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/Signin.html": ["Signin.html", "text/html; charset=utf-8"],
  "/signin.css": ["signin.css", "text/css; charset=utf-8"],
  "/signin.js": ["signin.js", "text/javascript; charset=utf-8"],
  "/signup.js": ["signup.js", "text/javascript; charset=utf-8"]
};

function sendJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    ...headers
  });
  response.end(JSON.stringify(body));
}

function getCookie(request, name) {
  const cookies = request.headers.cookie || "";
  for (const part of cookies.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) {
      continue;
    }
    return part.slice(separator + 1).trim();
  }
  return null;
}

function sessionCookie(token, maxAge) {
  const cookie = `sherpa_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
  return process.env.NODE_ENV === "production" ? `${cookie}; Secure` : cookie;
}

function sessionPayload(session) {
  if (!session) {
    return { error: "You are not signed in." };
  }
  const { user } = session;
  const result = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
  };
  if (user.role === "student") {
    result.profile = user.profile;
    result.roadmap = user.roadmap;
  }
  return { user: result };
}

async function readJson(request) {
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    const error = new Error("Send account details as JSON.");
    error.statusCode = 415;
    throw error;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxRequestBytes) {
      const error = new Error("Sign-up request is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Send valid JSON sign-up details.");
    error.statusCode = 400;
    throw error;
  }
}

async function handleSignup(request, response) {
  try {
    const user = await createSignup(prisma, await readJson(request));
    sendJson(response, 201, { user });
  } catch (error) {
    if (error instanceof SignupValidationError || error instanceof DuplicateEmailError) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }
    if (error.statusCode) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }

    console.error("Sign-up failed:", error);
    sendJson(response, 500, { error: "We could not create your account. Please try again later." });
  }
}

async function handleSignin(request, response) {
  try {
    const { token } = await signIn(prisma, await readJson(request));
    const session = await getSession(prisma, token);
    sendJson(response, 200, sessionPayload(session), {
      "Set-Cookie": sessionCookie(token, 7 * 24 * 60 * 60)
    });
  } catch (error) {
    if (error instanceof SigninError) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }
    if (error.statusCode) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }

    console.error("Sign-in failed:", error);
    sendJson(response, 500, { error: "We could not sign you in. Please try again later." });
  }
}

async function handleSession(request, response) {
  const session = await getSession(prisma, getCookie(request, "sherpa_session"));
  if (!session) {
    sendJson(response, 401, { error: "You are not signed in." }, {
      "Set-Cookie": sessionCookie("", 0)
    });
    return;
  }
  sendJson(response, 200, sessionPayload(session));
}

async function handleSignout(request, response) {
  await signOut(prisma, getCookie(request, "sherpa_session"));
  sendJson(response, 200, { ok: true }, {
    "Set-Cookie": sessionCookie("", 0)
  });
}

async function handleRequest(request, response) {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/api/auth/signup") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendJson(response, 405, { error: "Use POST to create an account." });
      return;
    }
    await handleSignup(request, response);
    return;
  }
  if (pathname === "/api/auth/signin") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendJson(response, 405, { error: "Use POST to sign in." });
      return;
    }
    await handleSignin(request, response);
    return;
  }
  if (pathname === "/api/auth/session") {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      sendJson(response, 405, { error: "Use GET to check your sign-in session." });
      return;
    }
    await handleSession(request, response);
    return;
  }
  if (pathname === "/api/auth/signout") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendJson(response, 405, { error: "Use POST to sign out." });
      return;
    }
    await handleSignout(request, response);
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const file = publicFiles[pathname];
  if (!file) {
    sendJson(response, 404, { error: "Page not found." });
    return;
  }

  const contents = await readFile(path.join(root, file[0]));
  response.writeHead(200, {
    "Content-Type": file[1],
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-cache"
  });
  response.end(contents);
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error("Request failed:", error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "The server could not complete this request." });
    } else {
      response.destroy(error);
    }
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Sherpa is available at http://localhost:${port}`);
});

async function shutdown() {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
  await prisma.$disconnect();
}

function handleShutdown() {
  shutdown().catch((error) => {
    console.error("Failed to shut down cleanly:", error);
    process.exitCode = 1;
  });
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
