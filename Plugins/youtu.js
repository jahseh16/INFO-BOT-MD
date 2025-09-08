import axios from 'axios';
import fetch from 'node-fetch';
import yts from 'yt-search';

const MAX_FILE_SIZE = 280 * 1024 * 1024;
const VIDEO_THRESHOLD = 70 * 1024 * 1024;
const HEAVY_FILE_THRESHOLD = 100 * 1024 * 1024;
const REQUEST_LIMIT = 3;
const REQUEST_WINDOW_MS = 10000;
const COOLDOWN_MS = 120000;

const requestTimestamps = [];
let isCooldown = false;
let isProcessingHeavy = false;

// Validador URL YouTube
const isValidYouTubeUrl = url =>
  /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/.test(url);

function formatSize(bytes) {
  if (!bytes || isNaN(bytes)) return 'Desconocido';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  bytes = Number(bytes);
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

async function getSize(url) {
  try {
    const res = await axios.head(url, { timeout: 10000 });
    const size = parseInt(res.headers['content-length'], 10);
    if (!size) throw new Error('Tamaño no disponible');
    return size;
  } catch {
    throw new Error('No se pudo obtener el tamaño del archivo');
  }
}

// Tu función de descarga (mp4)
async function ytdl(url) {
  const headers = {
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Chromium";v="132", "Not A(Brand";v="8"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    referer: 'https://id.ytmp3.mobi/',
    'referrer-policy': 'strict-origin-when-cross-origin'
  };

  const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^&?/]+)/)?.[1];
  if (!videoId) throw new Error('ID de video no encontrado');

  try {
    const init = await (await fetch(`https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Date.now()}`, { headers })).json();
    const convert = await (await fetch(`${init.convertURL}&v=${videoId}&f=mp4&_=${Date.now()}`, { headers })).json();

    let info;
    for (let i = 0; i < 3; i++) {
      const res = await fetch(convert.progressURL, { headers });
      info = await res.json();
      if (info.progress === 3) break;
      await new Promise(res => setTimeout(res, 1000));
    }

    if (!info || !convert.downloadURL) throw new Error('No se pudo obtener la URL de descarga');
    return { url: convert.downloadURL, title: info.title || 'Video sin título' };
  } catch (e) {
    throw new Error(`Error en la descarga: ${e.message}`);
  }
}

// Para controlar límite de solicitudes
function checkRequestLimit() {
  const now = Date.now();
  requestTimestamps.push(now);
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > REQUEST_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= REQUEST_LIMIT) {
    isCooldown = true;
    setTimeout(() => {
      isCooldown = false;
      requestTimestamps.length = 0;
    }, COOLDOWN_MS);
    return false;
  }
  return true;
}

// Plugin completo
export default function ytPlugin(sock) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const jid = m.key.remoteJid;
    const text = (m.message.conversation || m.message.extendedTextMessage?.text || '').trim();

    // .play busca y muestra botones (usar yt-search)
    if (text.toLowerCase().startsWith('.play ')) {
      const query = text.slice(6).trim();
      if (!query) return sock.sendMessage(jid, { text: 'Escribe algo para buscar en YouTube.' });

      try {
        const r = await yts(query);
        if (!r || !r.videos || r.videos.length === 0)
          return sock.sendMessage(jid, { text: 'No encontré videos para esa búsqueda.' });

        const video = r.videos[0];

        await sock.sendMessage(jid, {
          image: { url: video.thumbnail },
          caption: `🎬 *${video.title}*\n\nFlutter\njacephhc`,
          footer: '𝕵𝖆𝖈𝖊𝖕𝖍𝖍𝖈 ⚡',
          buttons: [
            { buttonId: `!ytmp3 ${video.url}`, buttonText: { displayText: '🎵 Audio' }, type: 1 },
            { buttonId: `!ytmp4 ${video.url}`, buttonText: { displayText: '📽️ Video' }, type: 1 },
          ],
          headerType: 4,
        });
      } catch (e) {
        await sock.sendMessage(jid, { text: 'Error buscando videos: ' + e.message });
      }
      return;
    }

    // Descargar mp4 con tu función ytdl (no ytdl-core)
    if (text.startsWith('!ytmp4 ')) {
      const url = text.split(' ')[1];
      if (!isValidYouTubeUrl(url)) return sock.sendMessage(jid, { text: 'URL de YouTube inválida.' });

      if (isCooldown || !checkRequestLimit()) {
        return sock.sendMessage(jid, { text: '⏳ Muchas solicitudes. Espera 2 minutos.' });
      }

      if (isProcessingHeavy) {
        return sock.sendMessage(jid, { text: '⚠️ Ya estoy procesando un archivo pesado. Espera un momento.' });
      }

      try {
        isProcessingHeavy = true;
        await sock.sendMessage(jid, { text: 'Descargando video, espera un momento...' });
        const { url: downloadUrl, title } = await ytdl(url);
        const size = await getSize(downloadUrl);

        if (size > MAX_FILE_SIZE) {
          isProcessingHeavy = false;
          return sock.sendMessage(jid, { text: '📦 El archivo supera el límite de 280 MB' });
        }

        const buffer = await fetch(downloadUrl).then(res => res.buffer());

        await sock.sendMessage(
          jid,
          buffer,
          `${title}.mp4`,
          `🎥 ${title}\nTamaño: ${formatSize(size)}`,
          m,
          null,
          {
            mimetype: 'video/mp4',
            asDocument: size > VIDEO_THRESHOLD,
            filename: `${title}.mp4`,
          }
        );

        isProcessingHeavy = false;
      } catch (e) {
        isProcessingHeavy = false;
        await sock.sendMessage(jid, { text: 'Error descargando video: ' + e.message });
      }
      return;
    }

    // Descargar mp3 con tu otro plugin/external downloader que me diste (p. ej. oceansaver)
    if (text.startsWith('!ytmp3 ')) {
      const url = text.split(' ')[1];
      if (!isValidYouTubeUrl(url)) return sock.sendMessage(jid, { text: 'URL de YouTube inválida.' });

      try {
        await sock.sendMessage(jid, { text: 'Preparando audio, espera un momento...' });

        // Usa tu código externo de descarga mp3 aquí
        // Supondré que tienes una función externa 'ddownr.download' que ya me pasaste
        // Para no repetir, aquí la pones importada o definida arriba y la usas

        // Ejemplo:
        const ddownr = {
          download: async (url, format) => {
            // código de tu downloader mp3 que me diste antes
            // reemplaza con tu función real
          }
        };

        const downloadUrl = await ddownr.download(url, 'mp3');

        if (!downloadUrl) throw new Error('No se pudo descargar el audio');

        await sock.sendMessage(jid, {
          document: { url: downloadUrl },
          mimetype: 'audio/mpeg',
          fileName: 'audio.mp3',
        });
      } catch (e) {
        await sock.sendMessage(jid, { text: 'Error descargando audio: ' + e.message });
      }
      return;
    }
  });
}
