const fs = require("node:fs");

const base = (process.env.VITE_API_BASE_URL || "").trim();
const mock = process.env.VITE_USE_MOCK_DATA === "true";
if (mock || !base) process.exit(0);

const id = process.env.VITE_API_CLIENT_ID || "";
const secret = process.env.VITE_API_CLIENT_SECRET || "";
if (!id || !secret) {
  console.error("Live Synapse build is missing VITE_API_CLIENT_ID or VITE_API_CLIENT_SECRET");
  process.exit(1);
}

const assets = "dist/assets";
const js = fs
  .readdirSync(assets)
  .filter((name) => name.endsWith(".js"))
  .map((name) => fs.readFileSync(`${assets}/${name}`, "utf8"))
  .join("\n");
const encoded = (value) => JSON.stringify(value).slice(1, -1);
if (!js.includes(encoded(id)) || !js.includes(encoded(secret))) {
  console.error("Synapse client credentials were not inlined into the Vite bundle");
  process.exit(1);
}
