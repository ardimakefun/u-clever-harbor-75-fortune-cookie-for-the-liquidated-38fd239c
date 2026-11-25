// Entry for make.fun "Fortune Cookie for the Liquidated Trader".
// Writes one original fortune cookie line (16 words, 97 characters,
// under the 20-word cap and the 160-character gate) to /output/entry.txt.
// Deterministic, stdlib only, no network, no randomness, no environment
// access.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const FORTUNE =
  "Fortune favors the bold, trader; tonight it favors whoever lost everything but the bus fare home.";

// The gate (RULES.txt): /output/entry.txt must be UTF-8 text of 1 to 160
// characters, not only whitespace; an invalid entry takes no prize. The
// task caps the fortune at 20 words and one line. Enforce all three here
// so a future edit that breaks a limit fails loudly at build time instead
// of silently shipping an invalid entry.
const WORDS = FORTUNE.trim().split(/\s+/).length;
if (FORTUNE.length < 1 || FORTUNE.length > 160 || FORTUNE.trim().length === 0) {
  throw new Error(
    `Fortune must be 1-160 non-whitespace characters, got ${FORTUNE.length}`,
  );
}
if (WORDS > 20) {
  throw new Error(`Fortune must be at most 20 words, got ${WORDS}`);
}

// No leading or trailing whitespace: padding would silently eat the
// 160-character budget and could make the entry look malformed on the
// feed. The fortune must be exactly the text it claims to be.
if (FORTUNE !== FORTUNE.trim()) {
  throw new Error("Fortune must not have leading or trailing whitespace");
}

// The bounty requires exactly one line: a newline or carriage return
// smuggled into the fortune would break the single-line entry, so fail
// loudly.
if (FORTUNE.includes("\n") || FORTUNE.includes("\r")) {
  throw new Error("Fortune must be a single line (no newline characters)");
}

// Reject invisible control characters (tab, NUL, DEL, other C0 controls):
// they are not visible in a single read, can break the fortune's rendering,
// and could trip the gate's UTF-8/single-line expectations. A fortune is
// printable text only.
for (const ch of FORTUNE) {
  const code = ch.codePointAt(0)!;
  if (code < 0x20 || code === 0x7f) {
    throw new Error(
      `Fortune contains a control character U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
    );
  }
}

mkdirSync("/output", { recursive: true });
writeFileSync("/output/entry.txt", FORTUNE, "utf8");

// Fail-fast read-back: confirm what landed on disk is byte-for-byte the
// fortune we gated above. Catches a truncated/partial write or a path
// collision (e.g. /output/entry.txt replaced by another entry's file)
// instead of shipping a silently corrupted entry.
const written = readFileSync("/output/entry.txt", "utf8");
if (written !== FORTUNE) {
  throw new Error(
    `Read-back mismatch: wrote ${FORTUNE.length} chars, read back ${written.length} chars`,
  );
}
