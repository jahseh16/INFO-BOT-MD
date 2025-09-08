export default [{
    command: '.tts',
    startsWith: true,
    async execute({ sock, m, text }) {
        const from = m.key.remoteJid;
        const say = text.trim();

        if (!say) {
            return await sock.sendMessage(from, { text: "❌ Escribe un texto después de *.tts*" }, { quoted: m });
        }

        if (say.length > 200) {
            return await sock.sendMessage(from, { text: "❌ El texto es muy largo. Máximo 200 caracteres." }, { quoted: m });
        }

        try {
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encodeURIComponent(say)}`;

            await sock.sendMessage(from, {
                audio: { url: ttsUrl },
                mimetype: "audio/mp4",
                ptt: true // para que llegue como nota de voz
            }, { quoted: m });

        } catch (e) {
            console.error("❌ Error en TTS:", e);
            await sock.sendMessage(from, { text: "⚠️ Error generando el audio." }, { quoted: m });
        }
    }
}];
