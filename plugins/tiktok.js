import axios from "axios";

export default [{
    command: '.tiktok',
    startsWith: true,
    async execute({ sock, m, text }) {
        const from = m.key.remoteJid;
        const url = text.trim();

        if (!url || !url.includes('tiktok.com')) {
            return await sock.sendMessage(from, { text: "❌ Envia un enlace de TikTok válido.\nEjemplo: *.tiktok https://vm.tiktok.com/XXXXX/*" }, { quoted: m });
        }

        try {
            await sock.sendMessage(from, { text: "⏳ Descargando tu video de TikTok..." }, { quoted: m });

            const api = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(api);

            if (data.code !== 0 || !data.data?.play) {
                throw new Error(data.msg || "No se pudo obtener el video.");
            }

            const videoUrl = data.data.play;

            await sock.sendMessage(from, {
                video: { url: videoUrl },
                caption: `🎵 Video descargado de TikTok ✅`
            }, { quoted: m });
        } catch (err) {
            console.error("❌ Error TikTok:", err.message);
            await sock.sendMessage(from, { text: `⚠️ Error al descargar el video. (${err.message})` }, { quoted: m });
        }
    }
}];
