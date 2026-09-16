import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { get } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
export const MODEL_SHA256 = "b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f";
const WASM_FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_module_internal.js",
  "vision_wasm_module_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wasmSource = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmTarget = path.join(root, "public", "vendor", "mediapipe", "wasm");
const modelTarget = path.join(root, "public", "vendor", "mediapipe", "models", "blaze_face_short_range.tflite");

export const sha256 = (data) => createHash("sha256").update(data).digest("hex");

function download(url, target) {
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`model_download_http_${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", async () => {
        try {
          const data = Buffer.concat(chunks);
          if (sha256(data) !== MODEL_SHA256) throw new Error("model_sha256_mismatch");
          const temporary = `${target}.tmp`;
          await writeFile(temporary, data);
          await rename(temporary, target);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", reject);
  });
}

async function prepare() {
  await mkdir(wasmTarget, { recursive: true });
  await mkdir(path.dirname(modelTarget), { recursive: true });
  await Promise.all(WASM_FILES.map((name) => copyFile(path.join(wasmSource, name), path.join(wasmTarget, name))));
  let validModel = false;
  try {
    validModel = sha256(await readFile(modelTarget)) === MODEL_SHA256;
  } catch {}
  if (!validModel) {
    await rm(modelTarget, { force: true });
    await download(MODEL_URL, modelTarget);
  }
  console.log(`MediaPipe assets ready; model SHA-256 ${MODEL_SHA256}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepare().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
