/** Go API satır modeli — ileride alan eklemek için tek kaynak. */
export type CryptoRow = {
  symbol: string;
  last: number;
  percentage: number;
  volume: number;
  high: number;
  low: number;
  exchange: string;
};
