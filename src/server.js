const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const prisma = require("./data/prisma");
const { createSignup, SignupValidationError, DuplicateEmailError } = require("./auth/signup");

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

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    const error = new Error("Send sign-up details as JSON.");
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
