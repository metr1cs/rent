import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CATEGORIES = [
  "Лофт",
  "Банкетный зал",
  "Ресторан для мероприятий",
  "Конференц-зал",
  "Переговорная",
  "Фотостудия",
  "Видеостудия / подкаст",
  "Коворкинг / event-space",
  "Выставочный зал",
  "Арт-пространство",
  "Концертная площадка",
  "Театр / сцена",
  "Спортзал / танцевальный",
  "Детское пространство",
  "Коттедж / загородный дом",
  "База отдыха",
  "Терраса / rooftop",
  "Теплоход / яхта",
  "Шоурум / pop-up",
  "Универсальный зал",
];

const WIDTH = 1280;
const HEIGHT = 720;
const outDir = path.resolve("apps/web/public/catalog-art");
const tmpDir = path.resolve("/tmp/vmestoru-category-art");

function makeImage(index) {
  const data = Buffer.alloc(WIDTH * HEIGHT * 3);
  const seedA = 31 + ((index * 53) % 180);
  const seedB = 51 + ((index * 41) % 160);
  const seedC = 91 + ((index * 37) % 140);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const pos = (y * WIDTH + x) * 3;
      const gx = x / WIDTH;
      const gy = y / HEIGHT;
      const wave = Math.sin((gx * 8 + gy * 5 + index) * Math.PI);
      const wave2 = Math.cos((gx * 5 - gy * 6 + index * 0.7) * Math.PI);
      const vignette = 1 - Math.min(1, Math.hypot(gx - 0.5, gy - 0.5) * 1.25);

      const r = Math.max(0, Math.min(255, seedA + gx * 120 + wave * 34 + vignette * 55));
      const g = Math.max(0, Math.min(255, seedB + gy * 120 + wave2 * 28 + vignette * 40));
      const b = Math.max(0, Math.min(255, seedC + (1 - gx) * 90 + wave * 18 + wave2 * 16));

      data[pos] = r | 0;
      data[pos + 1] = g | 0;
      data[pos + 2] = b | 0;
    }
  }

  return data;
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

CATEGORIES.forEach((name, index) => {
  const fileId = `c${String(index + 1).padStart(2, "0")}`;
  const ppmPath = path.join(tmpDir, `${fileId}.ppm`);
  const webpPath = path.join(outDir, `${fileId}.webp`);
  const header = Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`);
  const pixels = makeImage(index);
  fs.writeFileSync(ppmPath, Buffer.concat([header, pixels]));
  execFileSync("cwebp", ["-quiet", "-q", "88", ppmPath, "-o", webpPath]);
});

console.log(`Generated ${CATEGORIES.length} webp images in ${outDir}`);
