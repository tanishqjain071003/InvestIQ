export interface MFSearchResult {
  schemeCode: number;
  schemeName: string;
}

export interface MFNavDataPoint {
  date: string;
  nav: string;
}

export interface MFSchemeData {
  meta: {
    fund_house: string;
    scheme_type: string;
    scheme_category: string;
    scheme_code: number;
    scheme_name: string;
  };
  data: MFNavDataPoint[];
  status: string;
}
