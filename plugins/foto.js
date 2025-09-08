// plugins/foto.js
import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default [
  {
    command: '.foto',
    startsWith: true,
    async execute({ sock, m }) {
      const jid = m.key.remoteJid;
      const msg = m.message;

      // La lógica se activa si hay una imagen Y el caption empieza con .foto
      // El messageHandler ya hizo el check del caption, aquí solo validamos la imagen.
      if (!msg.imageMessage) {
        // Podríamos enviar un mensaje de "por favor, envía una imagen con el comando"
        // pero por ahora lo ignoramos para no ser "spammy".
        return;
      }

      await sock.sendMessage(jid, { text: '🔍 Analizando tu foto con inteligencia artificial ultra falsa... 🧠' }, { quoted: m });

      try {
        // El download no es necesario para el análisis falso, pero lo dejamos
        // por si en el futuro se usa un análisis real.
        // await downloadMediaMessage(m, 'buffer', {}, { logger: undefined, reuploadRequest: sock.updateMediaMessage });

        const edad = Math.floor(Math.random() * 96) + 5;
        const generos = ['Hombre', 'Mujer'];
        const emociones = ['feliz 😄', 'triste 😢', 'enojado 😠', 'sorprendido 😲', 'neutral 😐', 'asustado 😱', 'emocionado 🤩'];

        const genero = generos[Math.floor(Math.random() * generos.length)];
        const emocion = emociones[Math.floor(Math.random() * emociones.length)];

        const respuesta = `👤 *Análisis facial completado* (modo juego 🕹️):

🔹 Edad aproximada: *${edad} años*
🔹 Género: *${genero}*
🔹 Emoción: *${emocion}*

🤖 ¡Gracias por usar el detector ultra falso de Jahseh!`;

        await sock.sendMessage(jid, { text: respuesta }, { quoted: m });
      } catch (e) {
        console.error('[FOTO - FALSO] Error:', e);
        await sock.sendMessage(jid, { text: '❌ No se pudo procesar la imagen.' }, { quoted: m });
      }
    }
  },
  {
    command: ['.tierra', '.mundial', '.waworld', '.randomworld'],
    async execute({ sock, m }) {
      const jid = m.key.remoteJid;
      const paises = [
        { nombre: "Perú", codigo: "+51", longMin: 8, longMax: 9 },
        { nombre: "México", codigo: "+52", longMin: 10, longMax: 10 },
        { nombre: "Colombia", codigo: "+57", longMin: 10, longMax: 10 },
        { nombre: "Argentina", codigo: "+54", longMin: 10, longMax: 11 },
        { nombre: "España", codigo: "+34", longMin: 9, longMax: 9 },
        { nombre: "Chile", codigo: "+56", longMin: 9, longMax: 9 },
        { nombre: "Ecuador", codigo: "+593", longMin: 9, longMax: 9 },
        { nombre: "Venezuela", codigo: "+58", longMin: 10, longMax: 10 },
        { nombre: "Brasil", codigo: "+55", longMin: 10, longMax: 11 },
        { nombre: "Paraguay", codigo: "+595", longMin: 9, longMax: 9 }
      ];

      const pais = paises[Math.floor(Math.random() * paises.length)];
      const longitud = Math.floor(Math.random() * (pais.longMax - pais.longMin + 1)) + pais.longMin;
      let numeroRandom = '';
      for (let i = 0; i < longitud; i++) {
        numeroRandom += Math.floor(Math.random() * 10);
      }

      const numeroCompleto = `${pais.codigo}${numeroRandom}`;
      const mensaje = `🌍 *Número Random del Mundo* 🌍\n\n` +
                      `📍 *País:* ${pais.nombre}\n` +
                      `📱 *Número:* wa.me/${numeroCompleto}\n\n` +
                      `_Úsalo bajo tu responsabilidad._`;

      await sock.sendMessage(jid, { text: mensaje }, { quoted: m });
    }
  }
];
