import {
  FarmlandFeature,
  FarmerColorMap,
} from "@/features/farmland-map/types/farmland.types";

export function generateFarmerColors(
  features: FarmlandFeature[]
): FarmerColorMap {
  const farmerHashes = Array.from(
    new Set(features.map((f) => f.properties.FarmerIndicationNumberHash))
  );

  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F06292",
    "#AED581",
    "#FFD54F",
    "#4DD0E1",
    "#BA68C8",
    "#FF8A65",
    "#81C784",
    "#DCE775",
    "#4FC3F7",
    "#9575CD",
    "#FF9800",
    "#66BB6A",
    "#FFEB3B",
    "#42A5F5",
    "#7E57C2",
  ];

  const colorMap: FarmerColorMap = {};

  farmerHashes.forEach((hash, index) => {
    const farmlandsCount = features.filter(
      (f) => f.properties.FarmerIndicationNumberHash === hash
    ).length;

    colorMap[hash] = {
      color: colors[index % colors.length],
      count: farmlandsCount,
    };
  });

  return colorMap;
}

export function formatArea(areaString: string): string {
  const area = parseInt(areaString);
  if (isNaN(area)) return "不明";

  const sqm = area;
  const tsubo = (area / 3.306).toFixed(1);
  const tan = (area / 991.74).toFixed(2);
  const ha = (area / 10000).toFixed(3);

  if (area < 1000) {
    return `${sqm}㎡ (${tsubo}坪)`;
  } else if (area < 10000) {
    return `${sqm}㎡ (${tan}反)`;
  } else {
    return `${ha}ha`;
  }
}

export function formatAreaInTan(area: number): string {
  if (isNaN(area) || area === 0) return "";
  const sqm = Math.round(area).toLocaleString();
  const tan = (area / 991.74).toFixed(2);
  return `${sqm}㎡ (${tan}反)`;
}

export function getLandTypeColor(landType: string): string {
  switch (landType) {
    case "1":
    case "田":
      return "#4A90E2";
    case "2":
    case "畑":
      return "#7CB342";
    case "3":
    case "樹園地":
      return "#FF9800";
    default:
      return "#9E9E9E";
  }
}

export function truncateAddress(address: string): string {
  const parts = address.split("字");
  if (parts.length > 1) {
    return parts[0] + "字" + parts[1].split(/\d/)[0];
  }
  return address.substring(0, 20) + "...";
}
