// 統計情報の型定義
export interface Statistics {
  total: number;
  collective: {
    count: number;
    area: number;
    percentage: number;
  };
  individual: {
    count: number;
    area: number;
    percentage: number;
  };
  csvRecords: number;
  matchRate: number;
}

// 組織別統計の型定義
export interface OrganizationStatistics {
  organizationName: string;
  count: number;
  area: number;
  color: string;
}

// 農地詳細情報の型定義
export interface FarmlandDetails {
  feature: import('./farmland.types').FarmlandFeature;
  isCollectiveOwned: boolean;
  ownershipInfo?: import('../lib/dataMatching').OwnedFarmlandCSV;
  ownershipInfoList?: import('../lib/dataMatching').OwnedFarmlandCSV[]; // すべての作期のデータ
}
