import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const appDir = path.join(rootDir, "src", "app");
const tempDir = path.join(rootDir, ".mobile-temp");
const lockFile = path.join(rootDir, ".mobile-build.lock");

const apiPath = path.join(appDir, "api");
const tempApi = path.join(tempDir, "api");
const uploadsPath = path.join(appDir, "uploads");
const tempUploads = path.join(tempDir, "uploads");

const serverPages = [
  "dashboard/page.tsx",
  "vehicles/page.tsx",
  "drivers/page.tsx",
  "expenses/page.tsx",
  "maintenance/page.tsx",
  "analytics/page.tsx",
  "qr/[vehicleCode]/page.tsx",
];

const dynamicMarker = 'export const dynamic = "force-dynamic";';
const dynamicReplacement = 'export const dynamic = "auto";';

let isRestoring = false;

function restore() {
  if (isRestoring) return;
  isRestoring = true;

  try {
    if (fs.existsSync(tempApi)) {
      if (!fs.existsSync(apiPath)) {
        fs.renameSync(tempApi, apiPath);
      } else {
        try {
          const apiEntries = fs.readdirSync(apiPath);
          if (apiEntries.length === 0) {
            fs.rmSync(apiPath, { recursive: true, force: true });
            fs.renameSync(tempApi, apiPath);
          } else {
            fs.cpSync(tempApi, apiPath, { recursive: true, force: true });
            fs.rmSync(tempApi, { recursive: true, force: true });
          }
        } catch {}
      }
    }

    if (fs.existsSync(tempUploads)) {
      if (!fs.existsSync(uploadsPath)) {
        fs.renameSync(tempUploads, uploadsPath);
      } else {
        try {
          const uploadsEntries = fs.readdirSync(uploadsPath);
          if (uploadsEntries.length === 0) {
            fs.rmSync(uploadsPath, { recursive: true, force: true });
            fs.renameSync(tempUploads, uploadsPath);
          } else {
            fs.cpSync(tempUploads, uploadsPath, { recursive: true, force: true });
            fs.rmSync(tempUploads, { recursive: true, force: true });
          }
        } catch {}
      }
    }

    for (const relPath of serverPages) {
      const fullPath = path.join(appDir, relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf8");
        if (content.includes(dynamicReplacement)) {
          fs.writeFileSync(fullPath, content.replace(dynamicReplacement, dynamicMarker), "utf8");
        }
      }
    }

    if (fs.existsSync(tempDir)) {
      const remaining = fs.readdirSync(tempDir);
      if (remaining.length === 0) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    isRestoring = false;
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
      } catch {}
    }
  }
}

function handleSignal(code) {
  restore();
  process.exit(code);
}

process.on("SIGINT", () => handleSignal(130));
process.on("SIGTERM", () => handleSignal(143));
process.on("SIGHUP", () => handleSignal(129));
process.on("SIGBREAK", () => handleSignal(149));
process.on("uncaughtException", (err) => {
  console.error(err);
  restore();
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error(reason);
  restore();
  process.exit(1);
});
process.on("exit", () => {
  restore();
});

if (fs.existsSync(lockFile)) {
  try {
    const pidStr = fs.readFileSync(lockFile, "utf8").trim();
    const pid = parseInt(pidStr, 10);
    if (!Number.isNaN(pid)) {
      try {
        process.kill(pid, 0);
        console.error("Error: Another mobile build process is running");
        process.exit(1);
      } catch {}
    }
  } catch {}
}

fs.writeFileSync(lockFile, String(process.pid), "utf8");

restore();

if (process.argv.includes("--restore") || process.argv.includes("--recover")) {
  process.exit(0);
}

fs.mkdirSync(tempDir, { recursive: true });

try {
  if (fs.existsSync(apiPath)) {
    fs.renameSync(apiPath, tempApi);
  }

  if (fs.existsSync(uploadsPath)) {
    fs.renameSync(uploadsPath, tempUploads);
  }

  for (const relPath of serverPages) {
    const fullPath = path.join(appDir, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      if (content.includes(dynamicMarker)) {
        fs.writeFileSync(fullPath, content.replace(dynamicMarker, dynamicReplacement), "utf8");
      }
    }
  }

  const DEFAULT_SYNC_URL = "https://faco-system.netlify.app";
  const syncUrl = ((process.env.NEXT_PUBLIC_API_URL || "").trim() || DEFAULT_SYNC_URL).replace(/\/+$/, "");
  console.log(`[build-mobile] Sync server: ${syncUrl}`);

  const mobileEnv = {
    ...process.env,
    CAPACITOR_BUILD: "true",
    NEXT_PUBLIC_API_URL: syncUrl,
  };

  execSync("npx prisma generate", {
    cwd: rootDir,
    stdio: "inherit",
    env: mobileEnv,
  });

  execSync("npx next build --webpack", {
    cwd: rootDir,
    stdio: "inherit",
    env: mobileEnv,
  });
} finally {
  restore();
}

if (!fs.existsSync(apiPath)) {
  throw new Error("Integrity check failed: src/app/api was not restored.");
}
