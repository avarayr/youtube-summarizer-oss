import { build } from "bun";
import { copyFile, mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";

const isDev = process.argv.includes("--watch");

// Create a simple SVG icon
const createSVG = (size: number) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#FF0000"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="${
    size / 2
  }">S</text>
</svg>`;

async function createIcons() {
  // Create icons directory
  const iconsDir = join("public", "icons");
  await mkdir(iconsDir, { recursive: true });

  // Create icons of different sizes
  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const svg = createSVG(size);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(join(iconsDir, `icon${size}.png`));
  }
}

export async function copyStaticFiles() {
  // Ensure directories exist
  await mkdir("public/content", { recursive: true });
  await mkdir("public/popup", { recursive: true });

  // Copy static files
  await copyFile("src/static/styles/styles.css", "public/content/styles.css");
  await copyFile("src/static/manifest/manifest.json", "public/manifest.json");
}

async function buildExtension() {
  try {
    // Create extension icons
    await createIcons();

    // Build content script
    await build({
      entrypoints: ["./src/content/index.ts"],
      outdir: "./public/content",
      minify: !isDev,
      define: {
        "import.meta.env.DEV": JSON.stringify(isDev),
      },
    });

    // Build background script
    await build({
      entrypoints: ["./src/background/index.ts"],
      outdir: "./public/background",
      minify: !isDev,
      define: {
        "import.meta.env.DEV": JSON.stringify(isDev),
      },
    });

    // Build popup
    await build({
      entrypoints: ["./src/popup/index.tsx"],
      outdir: "./public/popup",
      minify: !isDev,
      define: {
        "import.meta.env.DEV": JSON.stringify(isDev),
      },
    });

    // Copy static files
    await copyStaticFiles();

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

buildExtension();
