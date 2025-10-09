export interface FarmlandProperties {
  FarmCommitteeCd: string;
  FarmCommitteeName: string;
  TodofukenCode: string;
  ShikuchosonCode: string;
  OazaCode: string;
  ClassificationOfLandCodeName: string;
  ClassificationOfLand: string;
  AreaOnRegistry: string;
  SectionOfNoushinhouCodeName: string;
  SectionOfNoushinhou: string;
  SectionOfToshikeikakuhouCodeName: string;
  SectionOfToshikeikakuhou: string;
  OwnerFarmIntentionCodeName: string;
  OwnerFarmIntention: string;
  FarmerIndicationNumberHash: string;
  KindOfRightCodeName: string;
  KindOfRight: string;
  CommencementDate: string;
  EndStagesDate: string;
  RightSettingContentsCodeName: string;
  RightSettingContents: string;
  UsageSituationInvestigationDate: string;
  UsageSituationInvestigationResultCodeName: string;
  UsageSituationInvestigationResult: string;
  UseIntentionInvestigationDate: string;
  OwnerStatementIntentSurveyResultsCodeName: string;
  OwnerStatementIntentSurveyResults: string;
  UseIntentionAscertainmentResultCodeName: string;
  UseIntentionAscertainmentResult: string;
  PublicNoticeDate: string;
  RightOfMiddleManagement: string;
  RecommendationContenDate: string;
  ActionOrderDate: string;
  MayorPublicAnnouncementDate: string;
  Address: string;
  Tiban: string;
  SectionOfPolygon: string;
  SectionOfPolygonCodeName: string;
  DaichoId: string;
  daicho_shubetsu_cd: string;
}

export interface FarmlandGeometry {
  type: 'Point';
  coordinates: [number, number];
}

export interface FarmlandFeature {
  type: 'Feature';
  geometry: FarmlandGeometry;
  properties: FarmlandProperties;
}

export interface FarmlandCollection {
  type: 'FeatureCollection';
  features: FarmlandFeature[];
}

export interface FarmerColorMap {
  [farmerHash: string]: {
    color: string;
    count: number;
  };
}

export interface MapViewState {
  center: [number, number];
  zoom: number;
}