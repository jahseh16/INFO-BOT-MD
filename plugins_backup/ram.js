import process from 'node:process';
import { performance } from 'node:perf_hooks';

export default function setup(sock) {
  console.log('[RAM Optimizer] Plugin cargado ✅');

  // 1. MONITOREO DE RAM
  const monitorRAM = setInterval(() => {
    const mem = process.memoryUsage();
    console.log(`
      📊 [RAM Monitor] 
      ► RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB
      ► Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}/${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB
    `);
  }, 5 * 60 * 1000); // Cada 5 minutos

  // 2. LIMPIEZA AUTOMÁTICA
  const limpiarCache = () => {
    const startTime = performance.now();
    
    // Limpiar caché de módulos no críticos
    Object.keys(require.cache).forEach(module => {
      if (!module.includes('node_modules') && !module.includes('core/')) {
        delete require.cache[module];
      }
    });

    // Limpiar listeners de eventos antiguos
    sock.ev.removeAllListeners('messages.upsert');
    
    console.log(`♻️ [RAM Cleaner] Cache limpiado en ${(performance.now() - startTime).toFixed(2)}ms`);
  };

  setInterval(limpiarCache, 60 * 60 * 1000); // Cada 1 hora

  // 3. DETENER AL CERRAR
  sock.ev.on('connection.update', ({ connection }) => {
    if (connection === 'close') {
      clearInterval(monitorRAM);
    }
  });
}