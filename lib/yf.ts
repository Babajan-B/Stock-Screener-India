// Singleton yahoo-finance2 instance for all API routes
import YahooFinance from 'yahoo-finance2';

export const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
