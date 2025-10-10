import * as XLSX from "xlsx";
import { FarmlandWithPolygon } from "../types/farmland.types";
import { dataService } from "./dataService";

export class ExportService {
  /**
   * DaichoIdから組織名を取得
   */
  private static getOrganizationName(daichoId: string): string {
    const details = dataService.getFarmlandDetails(daichoId);
    if (details?.ownershipInfo) {
      return details.ownershipInfo.organizationName;
    }
    return "";
  }
  /**
   * 農地データをExcelファイルとしてエクスポート
   */
  static exportToExcel(
    farmlands: Array<FarmlandWithPolygon & { isCollectiveOwned: boolean }>,
    filename: string = "farmland_data.xlsx"
  ): void {
    // データを配列形式に変換
    const rows: (string | number)[][] = [];

    // ヘッダー行（test.xlsxと同じ形式）
    rows.push(["__xl$gis__", "c", "c", "c", "c", "c"]);

    rows.push([".", "属性値", "地番（推定）", "品種", "生産者", "地権者"]);

    // データ行を追加
    farmlands.forEach((farmland) => {
      let geometryWkt = "";

      // ポリゴンがある場合はWKT形式に変換
      if (farmland.polygon) {
        const coords = farmland.polygon.geometry.coordinates[0]
          .map((coord) => `${coord[0]} ${coord[1]}`)
          .join(",");
        geometryWkt = `Polygon((${coords}))`;
      }

      // 生産者（集落営農法人名）を取得
      const producer = farmland.isCollectiveOwned
        ? this.getOrganizationName(farmland.properties.DaichoId)
        : "";

      rows.push([
        geometryWkt,
        "", // 属性値
        farmland.properties.Address, // 地番（推定）
        "", // 品種
        producer, // 生産者（法人名）
        "", // 地権者
      ]);
    });

    // ワークブックとワークシートを作成
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "sheet1");

    // 列幅を設定
    worksheet["!cols"] = [
      { wch: 80 }, // ジオメトリ列
      { wch: 10 }, // 属性値
      { wch: 40 }, // 地番
      { wch: 15 }, // 品種
      { wch: 15 }, // 生産者
      { wch: 15 }, // 地権者
    ];

    // ファイルをダウンロード
    XLSX.writeFile(workbook, filename);
  }

  /**
   * 集落営農法人の農地のみをエクスポート
   */
  static exportCollectiveOnlyToExcel(
    farmlands: Array<FarmlandWithPolygon & { isCollectiveOwned: boolean }>,
    filename: string = "collective_farmland_data.xlsx"
  ): void {
    const collectiveFarmlands = farmlands.filter((f) => f.isCollectiveOwned);
    this.exportToExcel(collectiveFarmlands, filename);
  }

  /**
   * ポリゴン付き農地のみをエクスポート
   */
  static exportWithPolygonOnlyToExcel(
    farmlands: Array<FarmlandWithPolygon & { isCollectiveOwned: boolean }>,
    filename: string = "farmland_with_polygon.xlsx"
  ): void {
    const farmlandsWithPolygon = farmlands.filter((f) => f.polygon);
    this.exportToExcel(farmlandsWithPolygon, filename);
  }
}
