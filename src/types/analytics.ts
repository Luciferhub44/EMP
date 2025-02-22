export interface MonthlyRevenue {
  month: string;
  total: string;
}

export interface ChartData {
  name: string;
  total: number;
}

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
} 