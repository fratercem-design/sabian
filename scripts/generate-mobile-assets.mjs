import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const iconSvg = await readFile(resolve(root, "assets/mobile/icon.svg"), "utf8");
const foregroundSvg = await readFile(resolve(root, "assets/mobile/icon-foreground.svg"), "utf8");
const splashSvg = await readFile(resolve(root, "assets/mobile/splash.svg"), "utf8");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

async function renderSvg(svg, output, width, height, transparent = false) {
  const target = resolve(root, output);
  await mkdir(dirname(target), { recursive: true });
  await page.setViewportSize({ width, height });
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${transparent ? "transparent" : "#0B1020"}}svg{display:block;width:100%;height:100%}</style>${svg}`);
  await page.screenshot({ path: target, omitBackground: transparent });
}

async function renderFeatureGraphic(output) {
  const target = resolve(root, output);
  await mkdir(dirname(target), { recursive: true });
  await page.setViewportSize({ width: 1024, height: 500 });
  await page.setContent(`<!doctype html><style>@import url('data:text/css,');*{box-sizing:border-box}body{margin:0;width:1024px;height:500px;overflow:hidden;background:radial-gradient(circle at 73% 45%,#2a1740 0,#130b1f 38%,#07060a 100%);color:#f4ead7;font-family:Georgia,serif}.copy{position:absolute;left:76px;top:116px;width:540px}.kicker{font:700 18px Arial,sans-serif;letter-spacing:5px;color:#c9a227}.title{margin:16px 0 12px;font-size:64px;line-height:.95}.sub{font:24px Arial,sans-serif;color:#a9b4c4;line-height:1.35}.mark{position:absolute;right:62px;top:62px;width:376px;height:376px}</style><div class="copy"><div class="kicker">360 ORIGINAL MIRRORS</div><div class="title">The Psyche<br>Symbols</div><div class="sub">Signal. Shadow. Sovereignty.</div></div><div class="mark">${iconSvg}</div>`);
  await page.screenshot({ path: target });
}

const squareOutputs = [
  ["public/app-icons/icon-192.png", 192],
  ["public/app-icons/icon-512.png", 512],
  ["public/app-icons/icon-512-maskable.png", 512],
  ["public/apple-touch-icon.png", 180],
  ["store-assets/apple/app-icon-1024.png", 1024],
  ["store-assets/google-play/app-icon-512.png", 512],
];
for (const [file, size] of squareOutputs) await renderSvg(iconSvg, file, size, size);
await renderFeatureGraphic("store-assets/google-play/feature-graphic-1024x500.png");

const iosIcon = "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png";
if (existsSync(resolve(root, dirname(iosIcon)))) await renderSvg(iconSvg, iosIcon, 1024, 1024);
const iosSplash = "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png";
if (existsSync(resolve(root, dirname(iosSplash)))) {
  await renderSvg(splashSvg, iosSplash, 2732, 2732);
  await renderSvg(splashSvg, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png", 2732, 2732);
  await renderSvg(splashSvg, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png", 2732, 2732);
}

const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(densities)) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  if (!existsSync(resolve(root, dir))) continue;
  await renderSvg(iconSvg, `${dir}/ic_launcher.png`, size, size);
  await renderSvg(iconSvg, `${dir}/ic_launcher_round.png`, size, size);
  await renderSvg(foregroundSvg, `${dir}/ic_launcher_foreground.png`, Math.round(size * 2.25), Math.round(size * 2.25), true);
}

const splashSizes = {
  mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920],
};
for (const [density, [width, height]] of Object.entries(splashSizes)) {
  const portraitDir = `android/app/src/main/res/drawable-port-${density}`;
  const landscapeDir = `android/app/src/main/res/drawable-land-${density}`;
  if (existsSync(resolve(root, portraitDir))) await renderSvg(splashSvg, `${portraitDir}/splash.png`, width, height);
  if (existsSync(resolve(root, landscapeDir))) await renderSvg(splashSvg, `${landscapeDir}/splash.png`, height, width);
}
if (existsSync(resolve(root, "android/app/src/main/res/drawable"))) {
  await renderSvg(splashSvg, "android/app/src/main/res/drawable/splash.png", 960, 1600);
}

const androidValues = resolve(root, "android/app/src/main/res/values/ic_launcher_background.xml");
if (existsSync(dirname(androidValues))) {
  await writeFile(androidValues, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#130B1F</color>\n</resources>\n`, "utf8");
}

await browser.close();
console.log("Generated Psyche Symbols mobile and store artwork.");
