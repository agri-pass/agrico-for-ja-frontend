#!/usr/bin/env node
/**
 * ピンGeoJSONから不要なプロパティを削除して容量を軽くするスクリプト
 *
 * 使い方:
 *   node scripts/minimize-pin-geojson.js <入力ファイル> [出力ファイル]
 *
 * 例:
 *   node scripts/minimize-pin-geojson.js data/hinashiro_pin.geojson
 *   node scripts/minimize-pin-geojson.js data/hinashiro_pin.geojson data/hinashiro_pin_min.geojson
 */

const fs = require("fs");
const path = require("path");

// 必要なプロパティのみを残す
const REQUIRED_PROPERTIES = [
  "Address", // 住所
  "Tiban", // 地番
  "AreaOnRegistry", // 面積
  "ClassificationOfLandCodeName", // 農地区分
  "DaichoId", // 台帳ID（マッチングに必須）
  "FarmerIndicationNumberHash", // ハッシュ（マッチングに使用）
];

function minimizeGeoJSON(inputPath, outputPath) {
  console.log(`読み込み中: ${inputPath}`);

  // バイナリで読み込み、エンコーディングを自動検出
  const rawBuffer = fs.readFileSync(inputPath);

  // UTF-8 BOM, UTF-16 LE BOM, UTF-16 BE BOMを検出して除去
  let inputData;
  if (rawBuffer[0] === 0xEF && rawBuffer[1] === 0xBB && rawBuffer[2] === 0xBF) {
    // UTF-8 BOM
    console.log("UTF-8 BOMを検出しました");
    inputData = rawBuffer.slice(3).toString("utf-8");
  } else if (rawBuffer[0] === 0xFF && rawBuffer[1] === 0xFE) {
    // UTF-16 LE BOM
    console.log("UTF-16 LE BOMを検出しました");
    inputData = rawBuffer.slice(2).toString("utf16le");
  } else if (rawBuffer[0] === 0xFE && rawBuffer[1] === 0xFF) {
    // UTF-16 BE BOM
    console.log("UTF-16 BE BOMを検出しました");
    inputData = rawBuffer.swap16().slice(2).toString("utf16le");
  } else {
    inputData = rawBuffer.toString("utf-8");
  }

  // 追加の不可視文字を除去（制御文字など）
  inputData = inputData.replace(/^\uFEFF/, ""); // 残りのBOM
  inputData = inputData.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""); // 制御文字

  // JSONの開始位置を見つける（不要な先頭文字をスキップ）
  const jsonStart = inputData.indexOf("{");
  if (jsonStart > 0) {
    console.log(`先頭${jsonStart}バイトをスキップしました`);
    inputData = inputData.slice(jsonStart);
  }

  const geojson = JSON.parse(inputData);

  const inputSize = Buffer.byteLength(inputData, "utf-8");
  console.log(`入力ファイルサイズ: ${(inputSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Feature数: ${geojson.features.length}`);

  // 各featureのpropertiesを最小化
  const minimizedFeatures = geojson.features.map((feature) => {
    const minimizedProperties = {};

    REQUIRED_PROPERTIES.forEach((prop) => {
      if (feature.properties[prop] !== undefined) {
        minimizedProperties[prop] = feature.properties[prop];
      }
    });

    return {
      type: "Feature",
      geometry: feature.geometry,
      properties: minimizedProperties,
    };
  });

  const minimizedGeoJSON = {
    type: "FeatureCollection",
    features: minimizedFeatures,
  };

  // 出力
  const outputData = JSON.stringify(minimizedGeoJSON);
  fs.writeFileSync(outputPath, outputData, "utf-8");

  const outputSize = Buffer.byteLength(outputData, "utf-8");
  console.log(`出力ファイルサイズ: ${(outputSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(
    `削減率: ${(((inputSize - outputSize) / inputSize) * 100).toFixed(1)}%`
  );
  console.log(`保存先: ${outputPath}`);
}

// メイン処理
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("使い方: node scripts/minimize-pin-geojson.js <入力ファイル> [出力ファイル]");
  console.log("");
  console.log("例:");
  console.log("  node scripts/minimize-pin-geojson.js data/hinashiro_pin.geojson");
  console.log("  node scripts/minimize-pin-geojson.js data/hinashiro_pin.geojson data/hinashiro_pin_min.geojson");
  console.log("");
  console.log("残すプロパティ:");
  REQUIRED_PROPERTIES.forEach((prop) => console.log(`  - ${prop}`));
  process.exit(1);
}

const inputPath = args[0];
const outputPath = args[1] || inputPath.replace(/\.geojson$/, "_min.geojson").replace(/\.json$/, "_min.json");

if (!fs.existsSync(inputPath)) {
  console.error(`エラー: ファイルが見つかりません: ${inputPath}`);
  process.exit(1);
}

minimizeGeoJSON(inputPath, outputPath);
