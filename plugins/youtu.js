import axios from 'axios';
import fetch from 'node-fetch';
import yts from 'yt-search';

// --- State and Helpers ---
const MAX_FILE_SIZE = 280 * 1024 * 1024;
const VIDEO_THRESHOLD = 70 * 1024 * 1024;
const REQUEST_LIMIT = 3;
const REQUEST_WINDOW_MS = 10000;
const COOLDOWN_MS = 120000;

const requestTimestamps = [];
let isCooldown = false;
let isProcessingHeavy = false;

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

// --- Commands ---
export default [
    {
        command: '.play',
        startsWith: true,
        async execute({ sock, m, text }) {
            const jid = m.key.remoteJid;
            const query = text.trim();
            if (!query) return sock.sendMessage(jid, { text: 'Escribe algo para buscar en YouTube.' }, { quoted: m });

            try {
                const r = await yts(query);
                if (!r || !r.videos || r.videos.length === 0)
                    return sock.sendMessage(jid, { text: 'No encontré videos para esa búsqueda.' }, { quoted: m });

                const video = r.videos[0];

                await sock.sendMessage(jid, {
                    image: { url: video.thumbnail },
                    caption: `🎬 *${video.title}*\n\nDuración: ${video.timestamp}\nVistas: ${video.views}`,
                    footer: '𝕵𝖆𝖈𝖊𝖕𝖍𝖍𝖈 ⚡',
                    buttons: [
                        { buttonId: `!ytmp3 ${video.url}`, buttonText: { displayText: '🎵 Audio' }, type: 1 },
                        { buttonId: `!ytmp4 ${video.url}`, buttonText: { displayText: '📽️ Video' }, type: 1 },
                    ],
                    headerType: 4,
                }, { quoted: m });
            } catch (e) {
                await sock.sendMessage(jid, { text: 'Error buscando videos: ' + e.message }, { quoted: m });
            }
        }
    },
    {
        command: '!ytmp4',
        startsWith: true,
        async execute({ sock, m, text }) {
            const jid = m.key.remoteJid;
            const url = text.trim();
            if (!isValidYouTubeUrl(url)) return sock.sendMessage(jid, { text: 'URL de YouTube inválida.' }, { quoted: m });

            if (isCooldown || !checkRequestLimit()) {
                return sock.sendMessage(jid, { text: '⏳ Muchas solicitudes. Espera 2 minutos.' }, { quoted: m });
            }

            if (isProcessingHeavy) {
                return sock.sendMessage(jid, { text: '⚠️ Ya estoy procesando un archivo pesado. Espera un momento.' }, { quoted: m });
            }

            try {
                isProcessingHeavy = true;
                await sock.sendMessage(jid, { text: 'Descargando video, espera un momento...' }, { quoted: m });
                const { url: downloadUrl, title } = await ytdl(url);
                const size = await getSize(downloadUrl);

                if (size > MAX_FILE_SIZE) {
                    isProcessingHeavy = false;
                    return sock.sendMessage(jid, { text: `📦 El archivo supera el límite de 280 MB. Tamaño: ${formatSize(size)}` });
                }

                await sock.sendMessage(jid, {
                    video: { url: downloadUrl },
                    caption: `🎥 ${title}\nTamaño: ${formatSize(size)}`,
                    mimetype: 'video/mp4'
                }, { quoted: m });

                isProcessingHeavy = false;
            } catch (e) {
                isProcessingHeavy = false;
                await sock.sendMessage(jid, { text: 'Error descargando video: ' + e.message }, { quoted: m });
            }
        }
    },
    {
        command: '!ytmp3',
        startsWith: true,
        async execute({ sock, m, text }) {
            const jid = m.key.remoteJid;
            const url = text.trim();
            if (!isValidYouTubeUrl(url)) return sock.sendMessage(jid, { text: 'URL de YouTube inválida.' }, { quoted: m });

            await sock.sendMessage(jid, { text: '⚠️ La descarga de MP3 no está implementada completamente en esta refactorización. Se necesita una API externa.' }, { quoted: m });
        }
    }
];
