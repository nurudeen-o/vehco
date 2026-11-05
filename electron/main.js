const { app, BrowserWindow, dialog, shell, nativeImage } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const net = require("net");

app.setName("Faco Fleet");

let mainWindow = null;
let httpServer = null;
let appLoadedUrl = null;

const appRoot = app.getAppPath();
const iconPath = path.join(appRoot, "public", "logo.png");

// 1. File & Console Logging
function initLogging() {
  try {
    const userDataPath = app.getPath("userData");
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const logFile = path.join(userDataPath, "faco-fleet.log");
    const logStream = fs.createWriteStream(logFile, { flags: "a" });

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    function formatMessage(level, ...args) {
      const ts = new Date().toISOString();
      const content = args
        .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
        .join(" ");
      return `[${ts}] [${level}] ${content}\n`;
    }

    console.log = (...args) => {
      originalLog(...args);
      try {
        logStream.write(formatMessage("INFO", ...args));
      } catch (_) {}
    };
    console.warn = (...args) => {
      originalWarn(...args);
      try {
        logStream.write(formatMessage("WARN", ...args));
      } catch (_) {}
    };
    console.error = (...args) => {
      originalError(...args);
      try {
        logStream.write(formatMessage("ERROR", ...args));
      } catch (_) {}
    };

    console.log("==========================================");
    console.log(`[Startup] Faco Fleet starting...`);
    console.log(`[Startup] Version: ${app.getVersion()}`);
    console.log(`[Startup] Packaged: ${app.isPackaged}`);
    console.log(`[Startup] Node: ${process.version}, Electron: ${process.versions.electron}`);
    console.log(`[Startup] Platform: ${process.platform} (${process.arch})`);
    console.log(`[Startup] App Path: ${appRoot}`);
    console.log(`[Startup] User Data: ${userDataPath}`);
    console.log("==========================================");

    process.on("uncaughtException", (err) => {
      console.error("[Fatal] Uncaught exception:", err?.stack || err);
      dialog.showErrorBox(
        "Faco Fleet Critical Error",
        `An unexpected error occurred:\n\n${err?.message || err}\n\nLog saved to:\n${logFile}`
      );
    });

    process.on("unhandledRejection", (reason) => {
      console.error("[Fatal] Unhandled rejection:", reason);
    });
  } catch (err) {
    console.error("Failed to initialize logging:", err);
  }
}

// 2. User Data & Environment Setup
function setupEnvironment() {
  const envPath = path.join(appRoot, ".env.local");
  if (fs.existsSync(envPath)) {
    try {
      require("dotenv").config({ path: envPath });
    } catch (_) {}
  }
  if (!process.env.TURSO_DATABASE_URL) {
    process.env.TURSO_DATABASE_URL = "***REMOVED_TURSO_URL***";
  }
  if (!process.env.TURSO_AUTH_TOKEN) {
    process.env.TURSO_AUTH_TOKEN = "***REMOVED_TURSO_TOKEN***";
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    process.env.CLOUDINARY_CLOUD_NAME = "***REMOVED_CLOUDINARY_CLOUD***";
  }
  if (!process.env.CLOUDINARY_API_KEY) {
    process.env.CLOUDINARY_API_KEY = "***REMOVED_CLOUDINARY_KEY***";
  }
  if (!process.env.CLOUDINARY_API_SECRET) {
    process.env.CLOUDINARY_API_SECRET = "***REMOVED_CLOUDINARY_SECRET***";
  }
}

function setupUserData() {
  const userDataPath = app.getPath("userData");
  process.env.FACO_USER_DATA_DIR = userDataPath;

  const dataDir = path.join(userDataPath, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const uploadsDir = path.join(userDataPath, "uploads", "documents");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const targetDb = path.join(dataDir, "dev.db");
  const bundledDb = path.join(appRoot, "prisma", "dev.db");

  // In packaged app, database must live in writable userData
  if (!fs.existsSync(targetDb)) {
    if (fs.existsSync(bundledDb)) {
      console.log(`[Database] Seeding initial database from ${bundledDb} to ${targetDb}`);
      fs.copyFileSync(bundledDb, targetDb);
    } else {
      console.warn(`[Database] Bundled database not found at ${bundledDb}`);
    }
  }

  if (fs.existsSync(targetDb)) {
    process.env.DATABASE_URL = `file:${targetDb}`;
    console.log(`[Database] DATABASE_URL set to: ${process.env.DATABASE_URL}`);
  } else {
    console.warn(`[Database] Target database not found at ${targetDb}`);
  }
}

// 3. Find Free Port
function getFreePort(preferredPort = 3142) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => {
      const ephemeral = net.createServer();
      ephemeral.once("error", () => resolve(preferredPort));
      ephemeral.listen(0, "127.0.0.1", () => {
        const port = ephemeral.address().port;
        ephemeral.close(() => resolve(port));
      });
    });
    tester.listen(preferredPort, "127.0.0.1", () => {
      tester.close(() => resolve(preferredPort));
    });
  });
}

// 4. Start Next.js Embedded Server
async function startProductionServer(port) {
  console.log(`[Server] Bootstrapping embedded Next.js server on port ${port}...`);
  process.env.NODE_ENV = "production";
  process.env.PORT = String(port);
  process.env.NEXT_TELEMETRY_DISABLED = "1";

  const next = require("next");
  const nextApp = next({
    dev: false,
    dir: appRoot,
    hostname: "127.0.0.1",
    port: port,
  });

  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  await new Promise((resolve, reject) => {
    server.listen(port, "127.0.0.1", (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  console.log(`[Server] Next.js production server listening at http://127.0.0.1:${port}`);
  return server;
}

// 5. Create Main Application Window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "FACO — Fleet Operations Admin",
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Prevent blank popups when downloading reports or clicking external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes("/api/reports") ||
      url.includes("/api/audit-logs") ||
      url.includes("/uploads/")
    ) {
      mainWindow.webContents.downloadURL(url);
      return { action: "deny" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

// Loading HTML template while server starts
const loadingHtml = `data:text/html;charset=utf-8,${encodeURIComponent(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>FACO Fleet Operations</title>
  <style>
    body {
      margin: 0;
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      user-select: none;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.02em; }
    p { font-size: 13px; color: #a1a1aa; margin: 0; }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h1>FACO Fleet Operations</h1>
  <p>Starting local application server...</p>
</body>
</html>
`)}`;

app.whenReady().then(async () => {
  initLogging();
  setupEnvironment();

  // Set macOS dock icon
  if (process.platform === "darwin" && app.dock) {
    try {
      if (fs.existsSync(iconPath)) {
        const iconImage = nativeImage.createFromPath(iconPath);
        if (!iconImage.isEmpty()) {
          app.dock.setIcon(iconImage);
        }
      }
    } catch (err) {
      console.warn("Could not set dock icon:", err);
    }
  }

  createMainWindow();

  // If in dev mode with external start URL
  if (process.env.ELECTRON_START_URL) {
    appLoadedUrl = process.env.ELECTRON_START_URL;
    console.log(`[Electron] Development mode: Loading UI from ${appLoadedUrl}`);
    mainWindow.loadURL(appLoadedUrl).catch((err) => {
      console.error(`[Electron] Failed to load start URL:`, err);
    });
    return;
  }

  // Packaged / Production mode:
  mainWindow.loadURL(loadingHtml).catch(() => {});

  try {
    setupUserData();
    const port = await getFreePort(3142);
    httpServer = await startProductionServer(port);
    appLoadedUrl = `http://127.0.0.1:${port}`;

    console.log(`[Electron] Loading UI from: ${appLoadedUrl}`);
    mainWindow.loadURL(appLoadedUrl).catch((err) => {
      console.error(`[Electron] Initial loadURL failed, retrying in 1s:`, err);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(appLoadedUrl).catch((rErr) => {
            console.error(`[Electron] Retry failed:`, rErr);
          });
        }
      }, 1000);
    });
  } catch (err) {
    console.error("[Electron] Failed to initialize application server:", err);
    dialog.showErrorBox(
      "FACO Fleet Startup Error",
      `Failed to launch embedded application server:\n\n${err?.message || err}\n\nCheck logs at:\n${path.join(app.getPath("userData"), "faco-fleet.log")}`
    );
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      if (appLoadedUrl) {
        mainWindow.loadURL(appLoadedUrl).catch(() => {});
      }
    }
  });
});

app.on("before-quit", () => {
  if (httpServer) {
    console.log("[Server] Shutting down embedded server...");
    try {
      httpServer.close();
    } catch (err) {
      console.error("[Server] Error closing HTTP server:", err);
    }
    httpServer = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
