import fs from "fs";
import util from "util";

const { PACKAGE_TOKEN, PRERELEASE, VERSION, RELEASE_NOTES, MANIFEST_URL } =
  process.env;

const manifest = JSON.parse(await fs.promises.readFile("module.json", "utf-8"));

const body = {
  id: manifest.id,
  "dry-run": [true, "true"].includes(PRERELEASE),
  release: {
    version: VERSION,
    manifest: MANIFEST_URL,
    notes: RELEASE_NOTES,
    compatibility: manifest.compatibility,
  },
};

const response = await fetch(
  "https://foundryvtt.com/_api/packages/release_version/",
  {
    headers: {
      "Content-Type": "application/json",
      Authorization: PACKAGE_TOKEN,
    },
    method: "POST",
    body: JSON.stringify(body),
  },
);

const responseData = await response.json();
if (responseData.status === "error") {
  console.log(util.inspect(responseData, false, null, true));
  process.exit(1);
} else {
  console.log("Release published.");
}
