const sharp = require("sharp");
const fs = require("fs/promises");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "public");

const SERVICE_IMAGES = [
  "service_ac.png", "service_carpenter.png", "service_chimney.png",
  "service_cooler.png", "service_electrical.png", "service_fridge.png",
  "service_geyser.png", "service_microwave.png", "service_mixer.png",
  "service_press.png", "service_ro.png", "kettle_service.png",
];

const ICON_IMAGES = {
  "newwlogo.png": { width: 200, height: 200 },
  "logo.png": { width: 200, height: 200 },
  "new logo.png": { width: 200, height: 200 },
  "icon.png": { width: 192, height: 192 },
  "apple-icon.png": { width: 180, height: 180 },
};

async function compress(filename, opts) {
  const filepath = path.join(PUBLIC_DIR, filename);
  const tempPath = filepath + ".tmp";
  try {
    const before = (await fs.stat(filepath)).size;
    let pipeline = sharp(filepath);
    if (opts.width || opts.height) {
      pipeline = pipeline.resize(opts.width || null, opts.height || null, { fit: "inside", withoutEnlargement: true });
    }
    await pipeline.png({ quality: 80, compressionLevel: 9, palette: true }).toFile(tempPath);
    await fs.unlink(filepath);
    await fs.rename(tempPath, filepath);
    const after = (await fs.stat(filepath)).size;
    console.log(`OK ${filename}: ${(before/1024).toFixed(0)}KB -> ${(after/1024).toFixed(0)}KB (${((1-after/before)*100).toFixed(0)}% smaller)`);
  } catch (err) {
    console.error(`FAIL ${filename}: ${err.message}`);
  }
}

async function compressFavicon() {
  const filepath = path.join(PUBLIC_DIR, "favicon.ico");
  const tempPath = filepath + ".tmp.png";
  try {
    const before = (await fs.stat(filepath)).size;
    await sharp(filepath).resize(48, 48, { fit: "cover" }).png({ compressionLevel: 9 }).toFile(tempPath);
    await fs.unlink(filepath);
    await fs.rename(tempPath, filepath);
    const after = (await fs.stat(filepath)).size;
    console.log(`OK favicon.ico: ${(before/1024).toFixed(0)}KB -> ${(after/1024).toFixed(0)}KB (${((1-after/before)*100).toFixed(0)}% smaller)`);
  } catch (err) {
    console.error(`FAIL favicon.ico: ${err.message}`);
  }
}

async function compressSubservices() {
  const subDir = path.join(PUBLIC_DIR, "subservices");
  try {
    const files = await fs.readdir(subDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
        const filepath = path.join(subDir, file);
        const tempPath = filepath + ".tmp";
        const before = (await fs.stat(filepath)).size;
        if (before < 50000) continue;
        try {
          await sharp(filepath).resize(400, 400, { fit: "inside", withoutEnlargement: true }).png({ quality: 80, compressionLevel: 9, palette: true }).toFile(tempPath);
          await fs.unlink(filepath);
          await fs.rename(tempPath, filepath);
          const after = (await fs.stat(filepath)).size;
          console.log(`OK subservices/${file}: ${(before/1024).toFixed(0)}KB -> ${(after/1024).toFixed(0)}KB (${((1-after/before)*100).toFixed(0)}% smaller)`);
        } catch (err) {
          console.error(`FAIL subservices/${file}: ${err.message}`);
        }
      }
    }
  } catch { console.log("No subservices dir."); }
}

(async () => {
  console.log("=== Compressing Service Images ===");
  for (const img of SERVICE_IMAGES) {
    await compress(img, { width: 400, height: 400 });
  }
  console.log("\n=== Compressing Icons/Logos ===");
  for (const [img, dims] of Object.entries(ICON_IMAGES)) {
    await compress(img, dims);
  }
  console.log("\n=== Compressing Hero ===");
  await compress("hero-bg.png", { width: 1200 });
  await compress("phone-mockup.png", { width: 600 });

  console.log("\n=== Compressing Favicon ===");
  await compressFavicon();

  console.log("\n=== Compressing Subservices ===");
  await compressSubservices();

  console.log("\nDone!");
})();
