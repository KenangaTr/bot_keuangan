import { bot } from './bot';

// Menjalankan bot dengan Long Polling (untuk pengembangan lokal)
bot.start({
  onStart: (botInfo) => {
    console.log(`========================================`);
    console.log(`Bot @${botInfo.username} aktif dan siap mencatat (LOKAL Long Polling)...`);
    console.log(`========================================`);
  },
});
