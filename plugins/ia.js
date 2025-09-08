import axios from 'axios'
import fs from 'fs'

// helper sleep
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

// divide el texto en partes intentando no cortar palabras y respetando maxLen
function splitTextSmart(text, maxLen = 200) {
  const parts = []
  let remaining = text.trim()
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      parts.push(remaining.trim())
      break
    }
    // intenta cortar por el último espacio antes de maxLen
    let slice = remaining.slice(0, maxLen)
    let lastSpace = slice.lastIndexOf(' ')
    if (lastSpace > 40) { // evita cortar en un espacio muy pequeño (siempre permite al menos 40 chars)
      parts.push(slice.slice(0, lastSpace).trim())
      remaining = remaining.slice(lastSpace + 1)
    } else {
      // si no hay espacio decente, corta en maxLen
      parts.push(slice.trim())
      remaining = remaining.slice(maxLen)
    }
  }
  return parts
}

export default [{
  command: '.jk',
  execute: async ({ sock, m }) => {
    const buttons = [
      { buttonId: 'btn_ia', buttonText: { displayText: '🤖 Usar IA' }, type: 1 },
      { buttonId: 'btn_img', buttonText: { displayText: '🎨 Generar Imagen' }, type: 1 }
    ]
    await sock.sendMessage(m.key.remoteJid, {
      text: '📋 *Menú de Opciones IA*',
      buttons: buttons,
      headerType: 1
    }, { quoted: m })
  }
}, {
  command: 'btn_ia',
  isButton: true,
  execute: async ({ sock, m }) => {
    const prompt = 'Escribe aquí tu pregunta para la IA'
    try {
      const { data } = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(prompt)}`
      )
      await sock.sendMessage(m.key.remoteJid, {
        text: `🤖 *IA de Jahseh responde:*\n\n${data}`,
      }, { quoted: m })
    } catch (e) {
      console.error(e)
      await sock.sendMessage(m.key.remoteJid, { text: '❌ Error al generar texto con IA.' }, { quoted: m })
    }
  }
}, {
  command: 'btn_img',
  isButton: true,
  execute: async ({ sock, m }) => {
    const prompt = 'Paisaje futurista con robots'
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
    try {
      await sock.sendMessage(m.key.remoteJid, {
        image: { url: imageUrl },
        caption: `🎨 Imagen generada para: *${prompt}*`,
      }, { quoted: m })
    } catch (e) {
      console.error(e)
      await sock.sendMessage(m.key.remoteJid, { text: '❌ Error al generar imagen con IA.' }, { quoted: m })
    }
  }
}, {
  command: 'ia',
  startsWith: true,
  execute: async ({ sock, m, text }) => {
    if (!text) {
      return await sock.sendMessage(m.key.remoteJid, {
        text: '❌ Escribe un mensaje después de "ia"',
      }, { quoted: m })
    }
    try {
      const { data } = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(text)}`
      )
      await sock.sendMessage(m.key.remoteJid, {
        text: `🤖 *IA de Jahseh responde:*\n\n${data}`,
      }, { quoted: m })
    } catch (e) {
      console.error(e)
      await sock.sendMessage(m.key.remoteJid, {
        text: '❌ Error al generar texto con IA.',
      }, { quoted: m })
    }
  }
}, {
  command: 'img',
  startsWith: true,
  execute: async ({ sock, m, text }) => {
    if (!text) {
      return await sock.sendMessage(m.key.remoteJid, {
        text: '❌ Escribe un mensaje después de "img"',
      }, { quoted: m })
    }
    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}`
      await sock.sendMessage(m.key.remoteJid, {
        image: { url: imageUrl },
        caption: `🎨 Imagen generada para: *${text}*`,
      }, { quoted: m })
    } catch (e) {
      console.error(e)
      await sock.sendMessage(m.key.remoteJid, {
        text: '❌ Error al generar imagen con IA.',
      }, { quoted: m })
    }
  }
}, {
  command: '.voz',
  startsWith: true,
  execute: async ({ sock, m, text }) => {
    if (!text) {
      return await sock.sendMessage(m.key.remoteJid, {
        text: '❌ Escribe un mensaje después de ".voz"',
      }, { quoted: m })
    }

    const from = m.key.remoteJid;
    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true })

    let filePaths = []
    try {
      await sock.sendPresenceUpdate('recording', from)

      const { data } = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(text)}`
      )
      const iaText = typeof data === 'string' ? data : JSON.stringify(data)
      const partes = splitTextSmart(iaText, 200)

      await sock.sendMessage(from, {
        text: `🔊 Generando voz — partes: ${partes.length}. Espera un momento...`
      }, { quoted: m })

      const baseTs = Date.now()
      for (let i = 0; i < partes.length; i++) {
        const textChunk = partes[i]
        await sock.sendPresenceUpdate('recording', from)

        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encodeURIComponent(textChunk)}`
        const headers = {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)'
        }
        const resp = await axios.get(ttsUrl, { responseType: 'arraybuffer', headers })

        const filePath = `./tmp/voz_${baseTs}_${i}.mp3`
        fs.writeFileSync(filePath, resp.data)
        filePaths.push(filePath)
        await sleep(700)
      }

      const buffers = filePaths.map(p => fs.readFileSync(p))
      const finalBuffer = Buffer.concat(buffers)

      await sock.sendMessage(from, {
        audio: finalBuffer,
        mimetype: 'audio/mpeg',
        ptt: true
      }, { quoted: m })

    } catch (e) {
      console.error('Error .voz:', e)
      await sock.sendMessage(from, {
        text: '❌ Error al generar voz con IA.',
      }, { quoted: m })
    } finally {
      try { filePaths.forEach(p => fs.existsSync(p) && fs.unlinkSync(p)) } catch (e) { /* ignore */ }
      await sock.sendPresenceUpdate('available', from)
    }
  }
}]
