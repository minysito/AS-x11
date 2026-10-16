// SPDX-License-Identifier: GPL-3.0-or-later
// Generates src/lib/keys.ts from the reverse-engineered HID keypad table.
import { writeFileSync, mkdirSync } from "node:fs";

const url = "https://raw.githubusercontent.com/HarukaYamamoto0/attack-shark-x11-driver/main/src/core/keyboard-keypad-page.ts";
const text = await (await fetch(url)).text();

const re = /0x([0-9a-fA-F]+):\s*\{\s*keyCode:\s*0x[0-9a-fA-F]+,\s*hidName:\s*'([^']*)',\s*name:\s*'([^']*)'/g;
const items = [];
let m;
while ((m = re.exec(text)) !== null) {
  const code = parseInt(m[1], 16);
  const hid = m[2];
  const name = m[3] || hid;
  items.push({ code, name, hid });
}

// Filter out error/reserved placeholders that are pointless in a macro editor.
const skip = /error|rollover|postfail|undefined|reserved|0x00/i;
const usable = items.filter((it) => !skip.test(it.name) && !skip.test(it.hid) && it.code !== 0);

const lines = [];
lines.push("// AUTO-GENERATED from the reverse-engineered HID keypad page.");
lines.push("// Maps USB HID Keyboard/Keypad usage ids to human readable names.");
lines.push("");
lines.push("export interface KeyEntry { code: number; name: string; hid: string; }");
lines.push("");
lines.push("export const KEYPAD: KeyEntry[] = [");
for (const it of usable) {
  lines.push(`  { code: 0x${it.code.toString(16).padStart(2, "0")}, name: ${JSON.stringify(it.name)}, hid: ${JSON.stringify(it.hid)} },`);
}
lines.push("];");
lines.push("");
lines.push("export const KEYPAD_BY_CODE = new Map<number, KeyEntry>(KEYPAD.map((k): [number, KeyEntry] => [k.code, k]));");
lines.push("");
lines.push("export function keyName(code: number): string {");
lines.push("  if (code === 0) return \"\";");
lines.push("  return KEYPAD_BY_CODE.get(code)?.name ?? `0x${code.toString(16).padStart(2, \"0\")}`;");
lines.push("}");
lines.push("");

mkdirSync("src/lib", { recursive: true });
writeFileSync("src/lib/keys.ts", lines.join("\n"));
console.log(`keys.ts generated with ${usable.length} keys (from ${items.length} entries)`);
