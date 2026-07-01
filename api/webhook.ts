import { webhookCallback } from 'grammy';
import { bot } from '../src/bot';

// Export default webhook callback handler untuk Vercel Serverless Function
export default webhookCallback(bot, 'https');
