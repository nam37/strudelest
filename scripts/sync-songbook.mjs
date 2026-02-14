import { mkdir, readdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

const sourceDir = path.resolve("references/strudel-songs-collection");
const outputRoot = path.resolve("public/songbook");
const outputSongsDir = path.join(outputRoot, "songs");
const manifestPath = path.join(outputRoot, "manifest.json");

const blockedPatterns = [/\bawait\b/, /initHydra\(/, /\bsamples\(/];

function toTitle(fileName) {
  const base = fileName.replace(/\.js$/i, "");
  return base
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function main() {
  await rm(outputSongsDir, { recursive: true, force: true });
  await mkdir(outputSongsDir, { recursive: true });

  const dirEntries = await readdir(sourceDir, { withFileTypes: true });
  const files = dirEntries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".js"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const songs = [];
  for (const fileName of files) {
    const fromPath = path.join(sourceDir, fileName);
    const raw = await readFile(fromPath, "utf8");
    const blocked = blockedPatterns.some((pattern) => pattern.test(raw));
    if (blocked) {
      continue;
    }

    const outPath = path.join(outputSongsDir, fileName);
    await copyFile(fromPath, outPath);

    songs.push({
      id: fileName.replace(/\.js$/i, ""),
      title: toTitle(fileName),
      path: `songs/${fileName}`
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "references/strudel-songs-collection",
    count: songs.length,
    songs
  };

  await mkdir(outputRoot, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`Synced ${songs.length} songs to public/songbook.\n`);
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
