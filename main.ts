// The World in One Day — Thursday 26 November 2026.
// A newspaper front page drawn entirely in code: 35 real stories from
// Thursday 26 November 2026. Own minimal PNG encoder, own bitmap font,
// flat shapes only. No network, no randomness, no clock, no file reads.
// Deterministic: two runs produce byte-identical output.
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;
const buf = Buffer.alloc(W * H * 3);

// Palette
const CREAM: number[] = [244, 239, 228];
const INK: number[] = [22, 22, 22];
const NAVY: number[] = [31, 42, 68];
const NAVY_DARK: number[] = [22, 30, 54];
const RED: number[] = [179, 35, 42];
const WHITE: number[] = [255, 255, 255];
const GREY: number[] = [110, 110, 108];
const GREY_DK: number[] = [70, 70, 70];
const GREY_LT: number[] = [200, 195, 185];
const BLUE: number[] = [70, 110, 160];
const BLUE_LT: number[] = [175, 205, 225];
const SEA: number[] = [186, 212, 224];
const TAN: number[] = [213, 195, 158];
const GOLD: number[] = [198, 158, 58];
const GREEN: number[] = [92, 142, 92];
const GREEN_DK: number[] = [60, 110, 60];
const ORANGE: number[] = [224, 122, 40];
const YELLOW: number[] = [232, 196, 60];
const SKY: number[] = [205, 214, 222];
const SAFFRON: number[] = [255, 153, 51];
const BROWN: number[] = [140, 100, 60];

// ---------- pixel primitives ----------
function px(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: number[]): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c);
}
function rectBorder(x: number, y: number, w: number, h: number, c: number[]): void {
  rect(x, y, w, 1, c); rect(x, y + h - 1, w, 1, c);
  rect(x, y, 1, h, c); rect(x + w - 1, y, 1, h, c);
}
function disc(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = cy - r; y <= cy + r; y++) {
    const dy = y - cy;
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    for (let x = cx - dx; x <= cx + dx; x++) px(x, y, c);
  }
}
function ring(cx: number, cy: number, r: number, t: number, c: number[], bg: number[]): void {
  disc(cx, cy, r, c);
  disc(cx, cy, r - t, bg);
}
function line(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}
function fillPoly(pts: Array<[number, number]>, c: number[]): void {
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(a[0] + t * (b[0] - a[0]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) px(x, y, c);
    }
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]): void {
  fillPoly([[x0, y0], [x1, y1], [x2, y2]], c);
}

// ---------- bitmap font: 5x7, uppercase + digits + punctuation ----------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "·": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};
const BLANK = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

function drawChar(x: number, y: number, ch: string, scale: number, c: number[]): void {
  const g = FONT[ch] || BLANK;
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "1") rect(x + col * scale, y + r * scale, scale, scale, c);
    }
  }
}
// advance: 6*scale normally; condensed lists use 5*scale.
function textWidth(text: string, scale: number, adv?: number): number {
  if (text.length === 0) return 0;
  const a = adv === undefined ? 6 * scale : adv;
  return text.length * a - (a - 5 * scale);
}
function drawText(x: number, y: number, text: string, scale: number, c: number[], adv?: number): void {
  const a = adv === undefined ? 6 * scale : adv;
  let cx = x;
  for (const ch of text) { drawChar(cx, y, ch, scale, c); cx += a; }
}
function drawTextCentered(cx: number, y: number, text: string, scale: number, c: number[], adv?: number): void {
  drawText(cx - Math.floor(textWidth(text, scale, adv) / 2), y, text, scale, c, adv);
}
function drawTextRight(xRight: number, y: number, text: string, scale: number, c: number[], adv?: number): void {
  drawText(xRight - textWidth(text, scale, adv), y, text, scale, c, adv);
}
function wrapText(text: string, scale: number, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (textWidth(t, scale) <= maxW) cur = t;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawLines(x: number, y: number, lines: string[], scale: number, c: number[], lineH: number): void {
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * lineH, lines[i], scale, c);
}

// ---------- stories ----------
interface Lead { kicker: string; headline: string; deck: string; }
const LEADS: Lead[] = [
  { kicker: "SPACE · CHINA", headline: "PAKISTAN'S FIRST ASTRONAUT BOARDS TIANGONG", deck: "SHENZHOU-24 DOCKS; ALI FIRST FOREIGN VISITOR TO STATION" },
  { kicker: "COLOMBIA · CARTAGENA", headline: "POLICE FREE 20 HOSTAGES IN SUPERMARKET SIEGE", deck: "17-HOUR STANDOFF ENDS AS POLICE STORM STORE" },
  { kicker: "MIDDLE EAST · RIYADH", headline: "INDIA CONDEMNS RIYADH TOWER DRONE ATTACK", deck: "2 INDIANS HURT; HOUTHI DRONE HIT TALLEST TOWER" },
];
interface Featured { n: number; kicker: string; headline: string; deck: string; }
const FEATURED: Featured[] = [
  { n: 4, kicker: "ASIA · PYONGYANG", headline: "NORTH KOREA ORDERS SWISS OFFICE SHUT", deck: "DIPLOMATS EXPELLED IN ROW TIED TO UKRAINE WAR" },
  { n: 5, kicker: "US · MISSISSIPPI", headline: "SIX DEAD AS PLANE CRASHES OFF COAST", deck: "TWO CHILDREN AMONG DEAD, OFFICIALS SAY" },
  { n: 6, kicker: "US · TRADE", headline: "US READIES NEW GLOBAL TARIFF PLAN", deck: "PLAN FOR TARIFFS ON TRADING PARTNERS" },
  { n: 7, kicker: "EUROPE · BRUSSELS", headline: "EU LEADERS MEET AT SPECIAL SUMMIT", deck: "EURO SUMMIT OPENS IN BRUSSELS" },
  { n: 8, kicker: "RUSSIA · UKRAINE", headline: "RUSSIA'S OWN FIGURES SHOW NEAR 500,000 DEAD", deck: "WAR TOLL REVEALED IN OFFICIAL DATA" },
  { n: 9, kicker: "TECH · US", headline: "ATTORNEY GENERAL DODGES NVIDIA PROBE QUESTIONS", deck: "NO ANSWERS ON CHIPMAKER INVESTIGATION" },
  { n: 10, kicker: "PACIFIC · SOLOMONS", headline: "SOLOMONS SIGNS SECURITY TREATY WITH AUSTRALIA", deck: "DEAL SEEN AS BLOW TO CHINA" },
  { n: 11, kicker: "SCIENCE · MERCURY", headline: "PROBE REACHES MERCURY AFTER EIGHT YEARS", deck: "JOINT JAPAN-EUROPE MISSION ARRIVES" },
  { n: 12, kicker: "MARKETS · US", headline: "CONSUMER CONFIDENCE NEARS TWO-YEAR HIGH", deck: "AMERICANS BRIGHTER DESPITE INFLATION" },
  { n: 13, kicker: "SPORT · FOOTBALL", headline: "REAL MADRID HIT PSV FOR FIVE", deck: "BELLINGHAM STUNNER, MBAPPE BRACE IN 5-1 WIN" },
  { n: 14, kicker: "SPORT · CHESS", headline: "GUKESH MEETS SINDAROV FOR WORLD TITLE", deck: "WORLD CHAMPIONSHIP OPENS IN GENEVA" },
  { n: 15, kicker: "INDIA · NEW DELHI", headline: "INDIA MARKS CONSTITUTION DAY", deck: "IITS TO ADD 6,000 TECH SEATS" },
];
const ALSO: string[] = [
  "PETROBRAS UNVEILS 122BN ENERGY PLAN",
  "VENEZUELA REVEALS 237.5BN PUBLIC DEBT",
  "COLOMBIA MARKS 10 YEARS SINCE PEACE ACCORD",
  "INDIA ANNOUNCES 15,000 CRORE PACKAGE FOR NEPAL",
  "HASINA SEEKS RETURN TO BANGLADESH ON 16 DEC",
  "BANGLADESH RAISES GARMENT WAGE 36 PERCENT",
  "FLIPKART CHIEF TO STEP DOWN IN DECEMBER",
  "IPL AUCTION DRAWS 1,220 PLAYERS",
  "POLAND RAISES ALARM OVER AIRSPACE VIOLATIONS",
  "CANADA REAFFIRMS INFLATION STRATEGY",
  "EGYPT SEES SUEZ CANAL REVENUES RECOVERING",
  "IRAN FACES DEEPENING FINANCIAL HARDSHIP",
  "FRANCE SEEKS INDEPENDENCE IN CRITICAL MINERALS",
  "BRITAIN PROBES NUCLEAR TEST LEGACY",
  "GUINEA GOLD CRACKDOWN PUSHES THOUSANDS TO MALI",
  "ISRAELI STRIKE IN GAZA KILLS OFFICIAL, FAMILY",
  "SPAIN'S SANCHEZ WARNS AGAINST RIGHTWING RULE",
  "RAMAPHOSA WINS COURT FIGHT OVER REPORT",
  "LONDON AND BRUSSELS AGREE CLOSER ECONOMIES",
  "BRAZIL MOSQUITO RELEASE CUTS INFECTIONS 68PC",
];
// Map dots: [lon, lat] for stories 1-15.
const DOTS: Array<[number, number]> = [
  [98.5, 39.7], [-75.5, 10.4], [46.7, 24.7], [125.8, 39.0], [-89.0, 29.0],
  [-77.0, 38.9], [4.35, 50.85], [37.6, 55.75], [-74.5, 38.0], [160.0, -9.0],
  [139.7, 35.7], [-74.0, 40.7], [-3.7, 40.4], [6.14, 46.2], [77.2, 28.6],
];
// Rough continent outlines [lon, lat], equirectangular.
const CONTINENTS: Array<Array<[number, number]>> = [
  // North America
  [[-168, 66], [-140, 70], [-120, 72], [-95, 80], [-80, 73], [-60, 60], [-55, 47], [-70, 42], [-75, 35], [-80, 26], [-90, 21], [-97, 16], [-105, 20], [-115, 28], [-125, 40], [-125, 49], [-140, 60], [-165, 60]],
  // South America
  [[-80, 10], [-60, 5], [-50, 0], [-35, -8], [-40, -20], [-48, -28], [-58, -35], [-65, -41], [-70, -50], [-73, -40], [-70, -20], [-80, -5]],
  // Europe
  [[-10, 36], [-9, 43], [-2, 44], [3, 43], [8, 44], [12, 45], [18, 40], [23, 36], [26, 38], [30, 41], [28, 45], [20, 48], [10, 54], [5, 58], [5, 62], [10, 64], [18, 70], [25, 71], [30, 70], [40, 68], [45, 66], [40, 60], [35, 55], [30, 50], [25, 45], [20, 42], [15, 38], [8, 37], [0, 36], [-5, 36]],
  // Africa
  [[-17, 15], [-10, 30], [0, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 11], [48, 0], [40, -10], [35, -20], [30, -30], [20, -35], [15, -30], [12, -18], [9, -1], [9, 4], [-8, 5], [-13, 8]],
  // Asia
  [[40, 68], [50, 70], [60, 70], [70, 72], [80, 73], [100, 76], [120, 73], [140, 72], [160, 70], [178, 66], [170, 60], [162, 56], [158, 52], [142, 50], [140, 40], [130, 35], [127, 35], [122, 30], [120, 25], [110, 20], [108, 12], [105, 9], [100, 8], [97, 15], [92, 21], [89, 22], [86, 20], [80, 15], [76, 10], [72, 20], [66, 25], [60, 25], [57, 26], [52, 28], [48, 30], [44, 29], [40, 36], [38, 40], [40, 45], [42, 50], [45, 55], [40, 60]],
  // Australia
  [[113, -22], [114, -30], [115, -35], [120, -34], [129, -32], [137, -35], [140, -38], [145, -38], [150, -37], [153, -32], [153, -27], [146, -19], [142, -11], [137, -12], [135, -15], [132, -12], [130, -13], [126, -14], [122, -17], [118, -20]],
  // New Zealand
  [[167, -45], [174, -41], [178, -38], [174, -35], [167, -40]],
];

// ---------- scenes ----------
function sceneRocket(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, NAVY_DARK);
  const stars: Array<[number, number]> = [[14, 10], [52, 22], [96, 8], [150, 16], [210, 10], [268, 24], [300, 8], [40, 48], [120, 60], [180, 44], [250, 58], [296, 44]];
  for (const s of stars) { rect(x + s[0], y + s[1], 2, 2, WHITE); }
  // Earth, bottom left, fully inside the scene box
  disc(x + 52, y + 74, 26, BLUE);
  disc(x + 42, y + 68, 9, GREEN);
  disc(x + 62, y + 80, 7, GREEN_DK);
  rect(x + 34, y + 62, 36, 2, WHITE);
  // Space station, centre
  rect(x + 138, y + 34, 96, 14, WHITE);
  rect(x + 138, y + 34, 96, 2, GREY_LT);
  rect(x + 118, y + 37, 20, 8, BLUE_LT);
  rect(x + 234, y + 37, 20, 8, BLUE_LT);
  rect(x + 176, y + 48, 20, 12, GREY_LT);
  rect(x + 176, y + 48, 20, 2, WHITE);
  // Rocket docking above the station, right side
  rect(x + 268, y + 10, 18, 36, WHITE);
  tri(x + 268, y + 10, x + 286, y + 10, x + 277, y + 0, RED);
  tri(x + 268, y + 46, x + 262, y + 56, x + 268, y + 46, RED);
  tri(x + 286, y + 46, x + 292, y + 56, x + 286, y + 46, RED);
  tri(x + 272, y + 46, x + 282, y + 46, x + 277, y + 60, ORANGE);
  rect(x + 273, y + 20, 8, 8, BLUE_LT);
  rectBorder(x, y, w, h, INK);
}
function sceneSupermarket(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  // Building
  rect(x + 12, y + 26, 216, 62, WHITE);
  rectBorder(x + 12, y + 26, 216, 62, INK);
  // Awning stripes
  for (let i = 0; i < 12; i++) rect(x + 12 + i * 18, y + 26, 9, 12, i % 2 === 0 ? RED : WHITE);
  rect(x + 12, y + 38, 216, 2, INK);
  // Sign (kept clear of the number badge at the top-left corner)
  rect(x + 84, y + 12, 64, 12, NAVY);
  drawText(x + 88, y + 14, "MARKET", 1, WHITE);
  // Windows and door
  rect(x + 24, y + 50, 34, 26, BLUE_LT);
  rect(x + 66, y + 50, 34, 26, BLUE_LT);
  rect(x + 168, y + 50, 34, 26, BLUE_LT);
  rect(x + 112, y + 50, 30, 38, NAVY_DARK);
  rect(x + 116, y + 54, 22, 30, GREY_DK);
  // Police figures, right side
  for (const fx of [246, 274]) {
    disc(x + fx + 6, y + 52, 6, [222, 182, 140]);
    rect(x + fx + 2, y + 46, 9, 4, NAVY);
    rect(x + fx, y + 59, 13, 28, NAVY);
    rect(x + fx, y + 59, 13, 4, BLUE);
  }
  // Cordon tape
  rect(x, y + h - 10, w, 8, YELLOW);
  for (let i = 0; i < w; i += 16) line(x + i, y + h - 2, x + i + 8, y + h - 10, INK);
  rectBorder(x, y, w, h, INK);
}
function sceneTower(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  // Skyline
  const blds: Array<[number, number, number]> = [[8, 62, 34], [48, 48, 30], [84, 70, 26], [252, 58, 30], [286, 70, 26]];
  for (const b of blds) rect(x + b[0], y + h - b[1], b[2], b[1], GREY);
  // Tall tower, centre
  rect(x + 138, y + 14, 30, h - 14, NAVY_DARK);
  line(x + 153, y + 2, x + 153, y + 14, INK);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) rect(x + 144 + c * 10, y + 22 + r * 11, 5, 5, YELLOW);
  // Drone, upper right
  rect(x + 236, y + 22, 14, 6, INK);
  line(x + 230, y + 20, x + 256, y + 20, INK);
  line(x + 230, y + 30, x + 256, y + 30, INK);
  rect(x + 240, y + 28, 6, 8, GREY_DK);
  // Smoke near the tower top
  disc(x + 176, y + 18, 9, [150, 150, 150]);
  disc(x + 188, y + 12, 7, [165, 165, 165]);
  disc(x + 198, y + 20, 5, [150, 150, 150]);
  rectBorder(x, y, w, h, INK);
}

// Featured icons, drawn in a (w x 40) band at (x, y).
function iconOffice(x: number, y: number): void {
  rect(x + 78, y + 4, 62, 34, GREY);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) rect(x + 86 + c * 13, y + 10 + r * 9, 7, 5, NAVY_DARK);
  line(x + 152, y + 2, x + 152, y + 38, INK);
  rect(x + 152, y + 14, 16, 10, RED);
  rect(x + 155, y + 17, 10, 4, WHITE);
  rect(x + 158, y + 14, 4, 10, WHITE);
}
function iconPlane(x: number, y: number): void {
  rect(x, y + 28, 223, 12, BLUE);
  rect(x + 70, y + 10, 60, 8, NAVY_DARK);
  tri(x + 130, y + 10, x + 150, y + 14, x + 130, y + 18, NAVY_DARK);
  tri(x + 92, y + 18, x + 104, y + 18, x + 98, y + 28, NAVY_DARK);
  rect(x + 96, y + 6, 8, 4, NAVY_DARK);
  rect(x + 78, y + 12, 20, 3, WHITE);
  tri(x + 20, y + 30, x + 34, y + 30, x + 27, y + 38, INK);
  rect(x + 24, y + 26, 6, 5, INK);
  tri(x + 170, y + 32, x + 184, y + 32, x + 177, y + 38, INK);
}
function iconContainers(x: number, y: number): void {
  rect(x + 56, y + 22, 54, 13, RED);
  rect(x + 66, y + 9, 54, 13, BLUE);
  rect(x + 76, y + 22, 54, 13, GREEN_DK);
  rect(x + 56, y + 9, 54, 2, WHITE);
  ring(x + 172, y + 18, 14, 3, RED, CREAM);
  line(x + 163, y + 27, x + 181, y + 9, RED);
}
function iconFlags(x: number, y: number): void {
  rect(x + 40, y + 14, 140, 24, GREY);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) rect(x + 52 + c * 26, y + 20 + r * 8, 4, 4, NAVY_DARK);
  for (let i = 0; i < 4; i++) {
    rect(x + 70 + i * 32, y + 2, 22, 12, BLUE);
    disc(x + 81 + i * 32, y + 8, 2, YELLOW);
  }
}
function iconBars(x: number, y: number): void {
  const hs = [10, 16, 24, 32];
  for (let i = 0; i < 4; i++) rect(x + 66 + i * 26, y + 38 - hs[i], 18, hs[i], NAVY);
  line(x + 60, y + 38, x + 172, y + 38, INK);
  tri(x + 160, y + 6, x + 176, y + 6, x + 160, y + 14, RED);
  line(x + 160, y + 6, x + 160, y + 14, RED);
}
function iconChip(x: number, y: number): void {
  rect(x + 78, y + 8, 26, 26, NAVY_DARK);
  for (let i = 0; i < 3; i++) { line(x + 84 + i * 7, y + 4, x + 84 + i * 7, y + 8, INK); line(x + 84 + i * 7, y + 34, x + 84 + i * 7, y + 38, INK); }
  drawText(x + 87, y + 15, "?", 1, WHITE);
  rect(x + 140, y + 14, 26, 10, BROWN);
  line(x + 166, y + 19, x + 186, y + 19, BROWN);
  rect(x + 140, y + 28, 34, 4, BROWN);
}
function iconIsland(x: number, y: number): void {
  disc(x + 111, y + 26, 22, GREEN);
  disc(x + 96, y + 30, 12, GREEN_DK);
  disc(x + 128, y + 32, 10, GREEN_DK);
  line(x + 88, y + 8, x + 88, y + 30, INK);
  rect(x + 88, y + 8, 16, 10, BLUE);
  line(x + 134, y + 8, x + 134, y + 30, INK);
  rect(x + 134, y + 8, 16, 10, RED);
}
function iconMercury(x: number, y: number): void {
  disc(x + 88, y + 20, 14, GREY);
  disc(x + 83, y + 15, 3, GREY_DK);
  disc(x + 93, y + 25, 3, GREY_DK);
  disc(x + 91, y + 13, 2, GREY_DK);
  rect(x + 140, y + 16, 16, 8, NAVY_DARK);
  rect(x + 124, y + 18, 16, 4, BLUE);
  rect(x + 156, y + 18, 16, 4, BLUE);
  line(x + 148, y + 12, x + 148, y + 16, GREY_DK);
}
function iconBasket(x: number, y: number): void {
  line(x + 60, y + 34, x + 90, y + 18, INK);
  line(x + 90, y + 18, x + 120, y + 8, INK);
  line(x + 120, y + 8, x + 150, y + 14, INK);
  tri(x + 140, y + 22, x + 176, y + 22, x + 168, y + 38, BROWN);
  tri(x + 140, y + 22, x + 168, y + 38, x + 148, y + 38, BROWN);
  line(x + 148, y + 18, x + 160, y + 12, BROWN);
}
function iconFootball(x: number, y: number): void {
  rect(x + 48, y + 6, 56, 28, GREEN);
  for (let i = 1; i < 7; i++) line(x + 48 + i * 8, y + 6, x + 48 + i * 8, y + 34, WHITE);
  for (let i = 1; i < 4; i++) line(x + 48, y + 6 + i * 7, x + 104, y + 6 + i * 7, WHITE);
  disc(x + 136, y + 20, 12, WHITE);
  disc(x + 136, y + 20, 4, INK);
  rect(x + 162, y + 10, 34, 16, INK);
  drawText(x + 166, y + 14, "5-1", 1, WHITE);
}
function iconChess(x: number, y: number): void {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if ((r + c) % 2 === 0) rect(x + 82 + c * 9, y + 4 + r * 9, 9, 9, INK);
    else rect(x + 82 + c * 9, y + 4 + r * 9, 9, 9, WHITE);
  }
  rectBorder(x + 82, y + 4, 36, 36, INK);
  rect(x + 130, y + 12, 12, 24, WHITE);
  rect(x + 134, y + 6, 4, 6, WHITE);
  rect(x + 158, y + 16, 12, 20, INK);
  tri(x + 158, y + 16, x + 170, y + 16, x + 164, y + 6, INK);
}
function iconFlagBook(x: number, y: number): void {
  rect(x + 62, y + 8, 56, 8, SAFFRON);
  rect(x + 62, y + 16, 56, 8, WHITE);
  rect(x + 62, y + 24, 56, 8, GREEN_DK);
  disc(x + 90, y + 20, 4, NAVY);
  rect(x + 136, y + 10, 34, 24, NAVY_DARK);
  rect(x + 140, y + 14, 26, 16, WHITE);
  line(x + 144, y + 19, x + 162, y + 19, INK);
  line(x + 144, y + 24, x + 162, y + 24, INK);
}
const ICONS: Array<(x: number, y: number) => void> = [
  iconOffice, iconPlane, iconContainers, iconFlags, iconBars, iconChip,
  iconIsland, iconMercury, iconBasket, iconFootball, iconChess, iconFlagBook,
];
const LEAD_SCENES: Array<(x: number, y: number, w: number, h: number) => void> = [
  sceneRocket, sceneSupermarket, sceneTower,
];

// ---------- PNG encoder ----------
let CRC_TABLE: number[] | null = null;
function crc32(data: Buffer): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Array<number>(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = (CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- compose ----------
function main(): void {
  rect(0, 0, W, H, CREAM);

  // Masthead
  rect(0, 0, W, 112, NAVY);
  drawText(16, 16, "THE WORLD IN ONE DAY", 1, WHITE);
  drawTextRight(1008, 16, "35 STORIES · 6 CONTINENTS · ONE DAY", 1, WHITE);
  rect(16, 32, W - 32, 1, GOLD);
  drawTextCentered(512, 50, "THURSDAY 26 NOVEMBER 2026", 6, WHITE);
  rect(0, 108, W, 4, RED);

  // Three big leads
  const leadW = 321, leadGap = 14;
  for (let i = 0; i < 3; i++) {
    const x = 16 + i * (leadW + leadGap);
    const n = String(i + 1);
    LEAD_SCENES[i](x, 120, leadW, 100);
    // red number badge on the scene corner
    disc(x + 16, 136, 10, RED);
    drawTextCentered(x + 16, 133, n, 1, WHITE);
    drawText(x, 230, LEADS[i].kicker, 1, RED);
    const hl = wrapText(LEADS[i].headline, 2, leadW - 16);
    drawLines(x, 244, hl, 2, INK, 16);
    const deck = wrapText(LEADS[i].deck, 1, leadW - 16);
    drawLines(x, 244 + hl.length * 16 + 6, deck, 1, GREY_DK, 9);
  }
  rect(0, 330, W, 2, INK);

  // Twelve featured, 4 x 3
  const cellW = 239, cellGap = 12, rowH = 146;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const idx = r * 4 + c;
      const f = FEATURED[idx];
      const x = 16 + c * (cellW + cellGap);
      const y = 332 + r * rowH;
      // number badge + icon
      disc(x + 12, y + 12, 9, RED);
      drawTextCentered(x + 12, y + 9, String(f.n), 1, WHITE);
      ICONS[idx](x + 8, y + 4);
      drawText(x, y + 52, f.kicker, 1, RED);
      const hl = wrapText(f.headline, 2, cellW - 16);
      drawLines(x, y + 64, hl, 2, INK, 16);
      const deck = wrapText(f.deck, 1, cellW - 16);
      drawLines(x, y + 64 + hl.length * 16 + 6, deck, 1, GREY_DK, 9);
    }
  }
  // grid dividers
  for (let c = 1; c < 4; c++) {
    const x = 16 + c * cellW + (c - 1) * cellGap + Math.floor(cellGap / 2);
    rect(x, 336, 1, 3 * rowH - 8, GREY_LT);
  }
  for (let r = 1; r < 3; r++) rect(16, 332 + r * rowH - 2, 992, 1, GREY_LT);
  rect(0, 768, W, 2, INK);

  // Bottom band: map (left) + ALSO list (right)
  drawText(16, 778, "WHERE IT HAPPENED", 2, INK);
  drawText(476, 778, "ALSO ON THURSDAY 26 NOVEMBER", 2, INK);
  rect(16, 796, 1, 164, GREY_LT);
  // Map
  const mapX = 16, mapY = 798, mapW = 436, mapH = 160;
  rect(mapX, mapY, mapW, mapH, SEA);
  rectBorder(mapX, mapY, mapW, mapH, INK);
  const proj = (lon: number, lat: number): [number, number] => [
    Math.round(mapX + ((lon + 180) / 360) * mapW),
    Math.round(mapY + ((78 - lat) / 136) * mapH),
  ];
  for (const cont of CONTINENTS) {
    fillPoly(cont.map(([lo, la]) => proj(lo, la)), TAN);
  }
  // numbered dots
  for (let i = 0; i < 15; i++) {
    const [dx, dy] = proj(DOTS[i][0], DOTS[i][1]);
    disc(dx, dy, 8, RED);
    ring(dx, dy, 8, 1, WHITE, RED);
    drawTextCentered(dx, dy - 3, String(i + 1), 1, WHITE);
  }
  drawText(16, 966, "NUMBERED DOTS MARK STORIES 1-15.", 1, GREY_DK);

  // ALSO list: two columns, condensed advance so long lines fit
  const colX = [476, 750];
  for (let i = 0; i < 20; i++) {
    const col = i < 10 ? 0 : 1;
    const row = i % 10;
    const y = 800 + row * 16;
    const label = String(16 + i) + ". " + ALSO[i];
    drawText(colX[col], y, label, 1, INK, 5);
  }

  // Footer
  rect(0, 988, W, 1, INK);
  drawTextCentered(512, 996, "EVERY STORY HAPPENED OR WAS FIRST REPORTED ON THURSDAY 26 NOVEMBER 2026.", 1, GREY_DK);
  drawTextCentered(512, 1008, "DISPUTED CLAIMS ARE ATTRIBUTED. SOURCES: AP, REUTERS, AFP, BBC, AL JAZEERA, UN NEWS. ORIGINAL DRAWINGS.", 1, GREY_DK);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outDir + "/entry.png", encodePNG());
}

main();
