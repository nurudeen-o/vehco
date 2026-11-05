const path = require("path");
const fs = require("fs");

exports.default = async function (context) {
  try {
    const projectDir = context.packager?.projectDir || process.cwd();
    const isMac = context.electronPlatformName === "darwin";
    const appDir = isMac
      ? path.join(
          context.appOutDir,
          `${context.packager.appInfo.productFilename}.app`,
          "Contents",
          "Resources",
          "app"
        )
      : path.join(context.appOutDir, "resources", "app");

    const sourcePrisma = path.join(projectDir, "node_modules", ".prisma");
    const targetPrisma = path.join(appDir, "node_modules", ".prisma");

    if (fs.existsSync(sourcePrisma)) {
      console.log(`[afterPack] Syncing .prisma runtime to: ${targetPrisma}`);
      fs.cpSync(sourcePrisma, targetPrisma, { recursive: true });
      console.log(`[afterPack] Successfully synced .prisma runtime dependencies.`);
    } else {
      console.warn(`[afterPack] Source .prisma not found at: ${sourcePrisma}`);
    }
  } catch (err) {
    console.error("[afterPack] Error syncing required runtime dependencies:", err);
  }
};
