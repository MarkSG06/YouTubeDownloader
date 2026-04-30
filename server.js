const express = require("express");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

const tempDir = path.join(__dirname, "temp");

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

app.post("/download", (req, res) => {
    const { url } = req.body;

    if (!url || !url.trim()) {
        return res.status(400).json({
            ok: false,
            message: "Falta la URL.",
        });
    }

    const videoUrl = url.trim();
    const id = crypto.randomUUID();

    const outputTemplate = path.join(tempDir, `${id}.%(ext)s`);
    const args = [
        "-m",
        "yt_dlp",

        "--format",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format",
        "mp4",

        "--postprocessor-args",
        "ffmpeg:-c:v copy -c:a aac -b:a 192k",

        "--output",
        outputTemplate,
        "--no-playlist",
        "--ignore-errors",
        videoUrl,
    ];

    const pythonCommand = process.env.PYTHON_BIN || "python";
    const ytdlp = spawn(pythonCommand, args);
    let errorOutput = "";

    ytdlp.stderr.on("data", (data) => {
        errorOutput += data.toString();
    });

    ytdlp.on("error", (err) => {
        if (!res.headersSent) {
            return res.status(500).json({
                ok: false,
                message: "No se pudo iniciar yt-dlp.",
                error: err.message,
            });
        }
    });

    ytdlp.on("close", (code) => {
        if (res.headersSent) return;

        if (code !== 0) {
            return res.status(500).json({
                ok: false,
                message: `yt-dlp terminó con código ${code}`,
                error: errorOutput,
            });
        }

        const files = fs.readdirSync(tempDir);
        const downloadedFile = files.find((file) => file.startsWith(id + "."));

        if (!downloadedFile) {
            return res.status(500).json({
                ok: false,
                message: "No se encontró el video descargado.",
            });
        }

        const filePath = path.join(tempDir, downloadedFile);

        res.download(filePath, downloadedFile, (err) => {
            fs.unlink(filePath, () => { });

            if (err && !res.headersSent) {
                res.status(500).json({
                    ok: false,
                    message: "Error enviando el archivo.",
                });
            }
        });
    });
});

app.listen(PORT);
console.log('http://localhost:' + PORT)