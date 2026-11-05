import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Agents copy these examples literally: a fixed /tmp description file on a
// shared host lets one agent's text go out in another's issue.
const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CAPABILITIES = join(ROOT, "oats-package", "capabilities");
const markdown = (dir) => readdirSync(dir, { recursive: true }).filter((f) => f.endsWith(".md")).map((f) => join(dir, f));
const shipped = () => [
  join(ROOT, "README.md"),
  ...readdirSync(CAPABILITIES).flatMap((cap) => ["skills", "injects"].flatMap((sub) => {
    try { return markdown(join(CAPABILITIES, cap, sub)); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
  })),
];
const TMP_FILE_FLAG = /--[a-z]+-file(?:\s+|=)["']?\/tmp\//;

test("the /tmp file-flag guard sees both flag forms", () => {
  for (const example of ["--description-file /tmp/d", "--description-file=/tmp/d", "--body-file '/tmp/b'", '--body-file="/tmp/x.md"']) assert.match(example, TMP_FILE_FLAG, example);
  assert.doesNotMatch('--description-file "$f"', TMP_FILE_FLAG);
});

test("no shipped skill, inject or README example uses a fixed /tmp file", () => {
  const files = shipped();
  assert.ok(files.length >= 3, "the scan found the shipped markdown");
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, TMP_FILE_FLAG, `${file} passes a /tmp path to a file flag`);
    assert.doesNotMatch(text, /\/tmp\/[\w.-]+\.(?:md|txt)\b/, `${file} names a fixed /tmp file`);
  }
});
