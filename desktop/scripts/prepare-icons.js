/*
  単一の .ico を元に Windows/Mac/PNG 用アイコンを生成して build 配下に出力します。
  - 入力: ルートの ../ChatGPT-Image-2025年8月19日-19_55_16.ico
  - 出力: desktop/build/icon.ico, icon.png, icon.icns
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import png2icons from 'png2icons';
import * as icojs from 'icojs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const desktopDir = path.resolve(__dirname, '..');
  const buildDir = path.join(desktopDir, 'build');
  const srcIco = path.resolve(projectRoot, 'ChatGPT-Image-2025年8月19日-19_55_16.ico');
  const srcPng = path.resolve(projectRoot, 'client', 'public', 'app-icon.png');

  const hasIco = fs.existsSync(srcIco);
  const hasPng = fs.existsSync(srcPng);
  if (!hasIco && !hasPng) {
    console.log('アイコンソースが見つかりません。以下のいずれかを配置してください:\n -', srcIco, '\n -', srcPng);
    return;
  }
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  // 1) .ico をそのままコピー（あれば）
  if (hasIco) {
    try { fs.copyFileSync(srcIco, path.join(buildDir, 'icon.ico')); } catch {}
  }

  // 2) .ico -> PNG 最大サイズを抽出
  try {
    let pngBuffer = null;
    if (hasIco) {
      const buf = fs.readFileSync(srcIco);
      const images = await icojs.parse(buf);
      if (Array.isArray(images) && images.length > 0) {
        const best = images.slice().sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
        pngBuffer = Buffer.from(best.buffer);
      }
    }
    if (!pngBuffer && hasPng) {
      pngBuffer = fs.readFileSync(srcPng);
    }
    if (pngBuffer) {
      fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffer);
      const icns = png2icons.createICNS(pngBuffer, png2icons.BILINEAR, 0, false);
      if (icns) fs.writeFileSync(path.join(buildDir, 'icon.icns'), icns);
    }
  } catch (e) {
    console.log('ICO->PNG/ICNS 変換をスキップ:', e?.message || e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(0);
});

