const statusList = [
  '🤖 Bot activo 24/7',
  '🌐 Cambiando info cada minuto',
  '🛠 Proyecto por Jahseh',
  '🚀 Powered by Baileys',
  '💬 Conéctate ahora',
  '💗 Te amo 7w7',
];

export default function (sock) {
  let i = 0;
  setInterval(async () => {
    try {
      const nuevoEstado = statusList[i];
      await sock.updateProfileStatus(nuevoEstado);
      console.log('📝 Estado actualizado:', nuevoEstado);
      i = (i + 1) % statusList.length;
    } catch (err) {
      console.error('⚠️ Error actualizando estado:', err.message);
    }
  }, 60000); // cada minuto
}

