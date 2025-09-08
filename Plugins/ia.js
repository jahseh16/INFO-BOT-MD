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

export default function (sock) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return

    const from = m.key.remoteJid
    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message.imageMessage?.caption ||
      ''

    // 📌 Mostrar menú con botones
    if (text.toLowerCase() === '.jk') {
      const buttons = [
        { buttonId: 'btn_ia', buttonText: { displayText: '🤖 Usar IA' }, type: 1 },
        { buttonId: 'btn_img', buttonText: { displayText: '🎨 Generar Imagen' }, type: 1 }
      ]
      await sock.sendMessage(from, {
        text: '📋 *Menú de Opciones IA*',
        buttons: buttons,
        headerType: 1
      }, { quoted: m })
      return
    }

    // 📌 Detectar botón pulsado
    if (m.message.buttonsResponseMessage) {
      const buttonId = m.message.buttonsResponseMessage.selectedButtonId

      if (buttonId === 'btn_ia') {
        const prompt = 'Escribe aquí tu pregunta para la IA'
        try {
          const { data } = await axios.get(
            `https://text.pollinations.ai/${encodeURIComponent(prompt)}`
          )
          await sock.sendMessage(from, {
            text: `🤖 *IA de Jahseh responde:*\n\n${data}`,
          }, { quoted: m })
        } catch (e) {
          console.error(e)
          await sock.sendMessage(from, { text: '❌ Error al generar texto con IA.' }, { quoted: m })
        }
      }

      if (buttonId === 'btn_img') {
        const prompt = 'Paisaje futurista con robots'
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
        try {
          await sock.sendMessage(from, {
            image: { url: imageUrl },
            caption: `🎨 Imagen generada para: *${prompt}*`,
          }, { quoted: m })
        } catch (e) {
          console.error(e)
          await sock.sendMessage(from, { text: '❌ Error al generar imagen con IA.' }, { quoted: m })
        }
      }
    }

    // 🧠 IA de texto (comando manual)
    if (text.toLowerCase().startsWith('ia ')) {
      const prompt = text.slice(3).trim()
      if (!prompt) {
        await sock.sendMessage(from, {
          text: '❌ Escribe un mensaje después de "ia"',
        }, { quoted: m })
      } else {
        try {
          const { data } = await axios.get(
            `https://text.pollinations.ai/${encodeURIComponent(prompt)}`
          )
          await sock.sendMessage(from, {
            text: `🤖 *IA de Jahseh responde:*\n\n${data}`,
          }, { quoted: m })
        } catch (e) {
          console.error(e)
          await sock.sendMessage(from, {
            text: '❌ Error al generar texto con IA.',
          }, { quoted: m })
        }
      }
    }

    // 🎨 Imagen con IA (comando manual)
    if (text.toLowerCase().startsWith('img ')) {
      const prompt = text.slice(4).trim()
      if (!prompt) {
        await sock.sendMessage(from, {
          text: '❌ Escribe un mensaje después de "img"',
        }, { quoted: m })
      } else {
        try {
          const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
          await sock.sendMessage(from, {
            image: { url: imageUrl },
            caption: `🎨 Imagen generada para: *${prompt}*`,
          }, { quoted: m })
        } catch (e) {
          console.error(e)
          await sock.sendMessage(from, {
            text: '❌ Error al generar imagen con IA.',
          }, { quoted: m })
        }
      }
    }

    // 🎙️ IA con voz (mejorada: split + "grabando" + progreso)
    if (text.toLowerCase().startsWith('.voz')) {
      const prompt = text.slice(4).trim()
      if (!prompt) {
        await sock.sendMessage(from, {
          text: '❌ Escribe un mensaje después de ".voz"',
        }, { quoted: m })
      } else {
        // crea tmp si no existe
        if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true })

        let filePaths = []
        // marcar presencia como "grabando"
        try {
          // intenta poner "recording" para que el usuario vea que está "grabando"
          try { await sock.sendPresenceUpdate('recording', from) } catch (e) { /* no crítico */ }

          // 1️⃣ Generar respuesta de la IA (Pollinations)
          const { data } = await axios.get(
            `https://text.pollinations.ai/${encodeURIComponent(prompt)}`
          )
          const iaText = typeof data === 'string' ? data : JSON.stringify(data)

          // 2️⃣ Split inteligente en trozos <= 200 chars
          const partes = splitTextSmart(iaText, 200)

          // Enviar mensaje opcional informativo (puedes comentar si no quieres)
          await sock.sendMessage(from, {
            text: `🔊 Generando voz — partes: ${partes.length}. Espera un momento...`
          }, { quoted: m })

          // 3️⃣ Generar TTS por cada parte, simulando "grabación"
          const baseTs = Date.now()
          for (let i = 0; i < partes.length; i++) {
            const textChunk = partes[i]
            // refuerza presencia "recording" mientras genera cada parte
            try { await sock.sendPresenceUpdate('recording', from) } catch (e) { /* ignore */ }

            // Construir URL Google Translate TTS (cliente "tw-ob")
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encodeURIComponent(textChunk)}`
            const headers = {
              // user-agent ayuda a que la petición no sea rechazada
              'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)'
            }
            const resp = await axios.get(ttsUrl, { responseType: 'arraybuffer', headers })

            const filePath = `./tmp/voz_${baseTs}_${i}.mp3`
            fs.writeFileSync(filePath, resp.data)
            filePaths.push(filePath)

            // pequeño delay para simular grabación entre fragmentos
            await sleep(700)
          }

          // 4️⃣ Concatenar buffers (simple) — funciona en la mayoría de casos
          const buffers = filePaths.map(p => fs.readFileSync(p))
          const finalBuffer = Buffer.concat(buffers)

          // 5️⃣ Enviar audio como nota de voz
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
          // limpiar archivos temporales
          try { filePaths.forEach(p => fs.existsSync(p) && fs.unlinkSync(p)) } catch (e) { /* ignore */ }
          // volver a presencia disponible
          try { await sock.sendPresenceUpdate('available', from) } catch (e) { /* ignore */ }
        }
      }
    } // fin .voz
  }) // end messages.upsert
} // end export

