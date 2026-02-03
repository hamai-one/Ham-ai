
import CryptoJS from 'crypto-js';

const BASE_URL = 'https://api.binance.com';

export class BinanceService {
  private apiKey: string;
  private secretKey: string;

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  private sign(queryString: string): string {
    return CryptoJS.HmacSHA256(queryString, this.secretKey).toString(CryptoJS.enc.Hex);
  }

  private async signedRequest(endpoint: string, method: string = 'GET', params: Record<string, any> = {}) {
    if (!this.apiKey || !this.secretKey) return null;

    const timestamp = Date.now();
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => queryParams.append(key, params[key]));
    queryParams.append('timestamp', timestamp.toString());
    
    const queryString = queryParams.toString();
    const signature = this.sign(queryString);
    const url = `${BASE_URL}${endpoint}?${queryString}&signature=${signature}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return await response.json();
    } catch (e) {
      console.error("Binance Private API Error:", e);
      return null;
    }
  }

  // SINKRONISASI SALDO ASLI
  public async getAccountBalance() {
    const data = await this.signedRequest('/api/v3/account');
    if (!data || !data.balances) return null;
    
    const usdt = data.balances.find((b: any) => b.asset === 'USDT');
    return usdt ? parseFloat(usdt.free) : 0;
  }

  // EKSEKUSI ORDER NYATA
  public async createOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number) {
    const params = {
      symbol: `${symbol}USDT`,
      side,
      type: 'MARKET',
      quoteOrderQty: quantity // Menggunakan USDT sebagai nominal
    };
    return await this.signedRequest('/api/v3/order', 'POST', params);
  }

  // FETCH DATA PUBLIK (Tanpa Key)
  public async getKlines(symbol: string, interval: string = '1h', limit: number = 50) {
    try {
      const response = await fetch(`${BASE_URL}/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`);
      const data = await response.json();
      return data.map((d: any) => ({
        time: d[0],
        price: parseFloat(d[4]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3])
      }));
    } catch (e) {
      return null;
    }
  }

  public async getTickerPrice(symbol: string) {
    try {
      const response = await fetch(`${BASE_URL}/api/v3/ticker/price?symbol=${symbol}USDT`);
      const data = await response.json();
      return parseFloat(data.price);
    } catch (e) {
      return null;
    }
  }
}
