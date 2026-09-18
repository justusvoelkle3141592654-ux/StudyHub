#!/usr/bin/env node
/**
 * Adds release signing to the generated Android project
 * (src-tauri/gen/android/app/build.gradle.kts) using keystore.properties.
 *
 * Run once after `npm run tauri android init` and after creating
 * src-tauri/gen/android/keystore.properties (see README, "Android").
 * The keystore and the properties file are git-ignored; never commit them.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const androidDir = path.resolve("src-tauri/gen/android");
const gradleFile = path.join(androidDir, "app/build.gradle.kts");
const propsFile = path.join(androidDir, "keystore.properties");

if (!existsSync(gradleFile)) {
  console.error("Android project not found. Run `npm run tauri android init` first.");
  process.exit(1);
}
if (!existsSync(propsFile)) {
  console.error("keystore.properties not found in src-tauri/gen/android. See README → Android.");
  process.exit(1);
}

let gradle = readFileSync(gradleFile, "utf8");
if (gradle.includes("keystore.properties")) {
  console.log("Signing config already present.");
  process.exit(0);
}

// 1. Imports at the top of the file.
gradle = `import java.util.Properties\nimport java.io.FileInputStream\n\n${gradle}`;

// 2. Signing config inside `android { ... }` (inserted right after the opening line).
gradle = gradle.replace(
  /android\s*\{\n/,
  `android {
    val keystorePropertiesFile = rootProject.file("keystore.properties")
    val keystoreProperties = Properties()
    if (keystorePropertiesFile.exists()) {
        keystoreProperties.load(FileInputStream(keystorePropertiesFile))
    }
    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }
`,
);

// 3. Use it for the release build type.
gradle = gradle.replace(/getByName\("release"\)\s*\{\n/, `getByName("release") {\n            signingConfig = signingConfigs.getByName("release")\n`);

writeFileSync(gradleFile, gradle);
console.log("Release signing config added to app/build.gradle.kts");
