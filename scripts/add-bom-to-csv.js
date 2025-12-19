// #!/usr/bin/env node

// /**
//  * CSVファイルにBOM（Byte Order Mark）を追加するスクリプト
//  * Windows ExcelでUTF-8 CSVを正しく開けるようにする
//  *
//  * 使い方:
//  *   node scripts/add-bom-to-csv.js <input.csv> [output.csv]
//  *
//  * 例:
//  *   node scripts/add-bom-to-csv.js data.csv
//  *   → data_bom.csv が出力される
//  *
//  *   node scripts/add-bom-to-csv.js data.csv output.csv
//  *   → output.csv が出力される
//  */

// const fs = require("fs");
// const path = require("path");

// // UTF-8 BOM
// const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

// function addBomToCsv(inputPath, outputPath) {
//   console.log(`読み込み中: ${inputPath}`);

//   // ファイルを読み込み
//   const rawBuffer = fs.readFileSync(inputPath);

//   // すでにBOMがあるかチェック
//   const hasBom =
//     rawBuffer[0] === 0xef && rawBuffer[1] === 0xbb && rawBuffer[2] === 0xbf;

//   if (hasBom) {
//     console.log("このファイルはすでにBOM付きUTF-8です");
//     // そのままコピー
//     fs.writeFileSync(outputPath, rawBuffer);
//     console.log(`保存先: ${outputPath}`);
//     return;
//   }

//   // BOMを先頭に追加
//   const outputBuffer = Buffer.concat([BOM, rawBuffer]);

//   // 出力
//   fs.writeFileSync(outputPath, outputBuffer);

//   const inputSize = (rawBuffer.length / 1024).toFixed(2);
//   const outputSize = (outputBuffer.length / 1024).toFixed(2);

//   console.log(`入力ファイルサイズ: ${inputSize} KB`);
//   console.log(`出力ファイルサイズ: ${outputSize} KB`);
//   console.log(`BOMを追加しました`);
//   console.log(`保存先: ${outputPath}`);
// }

// // メイン処理
// const args = process.argv.slice(2);

// if (args.length === 0) {
//   console.log(
//     "使い方: node scripts/add-bom-to-csv.js <input.csv> [output.csv]"
//   );
//   console.log("");
//   console.log("例:");
//   console.log("  node scripts/add-bom-to-csv.js data.csv");
//   console.log("  node scripts/add-bom-to-csv.js data.csv output.csv");
//   process.exit(1);
// }

// const inputPath = args[0];

// if (!fs.existsSync(inputPath)) {
//   console.error(`エラー: ファイルが見つかりません: ${inputPath}`);
//   process.exit(1);
// }

// // 出力パスを決定
// let outputPath;
// if (args[1]) {
//   outputPath = args[1];
// } else {
//   const dir = path.dirname(inputPath);
//   const ext = path.extname(inputPath);
//   const base = path.basename(inputPath, ext);
//   outputPath = path.join(dir, `${base}_bom${ext}`);
// }

// addBomToCsv(inputPath, outputPath);
