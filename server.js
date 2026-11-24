// Tacto: el teléfono como control remoto de una experiencia web.
//   teléfono (web) --MQTT/WebSocket--> broker MQTT (este mismo proceso) --> experiencia web (/exp)
// Sirve las páginas por HTTPS (certificado autofirmado) y trae un broker MQTT embebido:
//   · MQTT sobre WebSocket en  /mqtt   (navegadores)
//   · MQTT sobre TCP en el puerto 1883  (Arduino/ESP32, Node-RED, Python, MQTT Explorer…)
// Si prefieres un broker externo, no lo necesitas: las páginas aceptan ?broker=wss://…
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const http = require('http');
const https = require('https');
const express = require('express');
const { WebSocketServer, createWebSocketStream } = require('ws');
const QRCode = require('qrcode');
const { Aedes } = require('aedes');

const USE_TUNNEL = process.argv.includes('--tunnel') || process.env.TUNNEL === '1';
const PORT = +process.env.PORT || 8443;
const PLAIN_HTTP = process.env.HTTP === '1' || USE_TUNNEL;        // para túneles / hosting que ya ponen el HTTPS
const MQTT_TCP = process.env.MQTT_TCP === undefined ? 1883 : +process.env.MQTT_TCP; // 0 = sin puerto TCP
const PUBLIC_URL = process.env.PUBLIC_URL || '';

const LAN = [];
for (const list of Object.values(os.networkInterfaces()))
  for (const i of list || []) if (i.family === 'IPv4' && !i.internal) LAN.push(i.address);
const HOST_IP = process.env.HOST_IP || LAN[0] || 'localhost'; // con varios adaptadores (hotspot, USB, WiFi) fuerza cuál usar
const scheme = PLAIN_HTTP ? 'http' : 'https';
let baseUrl = PUBLIC_URL || `${scheme}://${HOST_IP}:${PORT}`;

// ---------- HTTP ----------
const app = express();
const pub = path.join(__dirname, 'public');
app.use(express.static(pub));
app.use('/vendor', express.static(path.join(__dirname, 'node_modules', 'mqtt', 'dist'))); // mqtt.min.js sin depender de internet
app.get('/exp', (_, res) => res.sendFile(path.join(pub, 'exp.html')));
app.get('/tecnico', (_, res) => res.sendFile(path.join(pub, 'exp_tecnico.html')));
app.get('/info', (_, res) => res.json({ baseUrl, mqtt: true, mqttTcp: MQTT_TCP || null, tunnel: USE_TUNNEL }));
app.get('/qr.svg', async (req, res) => {
  const u = String(req.query.u || baseUrl).slice(0, 400);
  res.type('image/svg+xml').send(await QRCode.toString(u, { type: 'svg', margin: 1 }));
});

let server;
if (PLAIN_HTTP) {
  server = http.createServer(app);
} else {
  const selfsigned = require('selfsigned');
  const dir = path.join(__dirname, '.cert');
  const keyF = path.join(dir, 'key.pem'), crtF = path.join(dir, 'cert.pem'), ipF = path.join(dir, 'ips.json');
  let same = false;
  try { same = fs.existsSync(crtF) && JSON.stringify(JSON.parse(fs.readFileSync(ipF, 'utf8'))) === JSON.stringify(LAN); } catch {}
  if (!same) { // se regenera si cambian las IPs (por ejemplo al conectar un hotspot)
    fs.mkdirSync(dir, { recursive: true });
    const alt = [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }, ...LAN.map(ip => ({ type: 7, ip }))];
    const pems = selfsigned.generate([{ name: 'commonName', value: 'tacto' }], {
      days: 825, keySize: 2048, algorithm: 'sha256', extensions: [{ name: 'subjectAltName', altNames: alt }],
    });
    fs.writeFileSync(keyF, pems.private); fs.writeFileSync(crtF, pems.cert); fs.writeFileSync(ipF, JSON.stringify(LAN));
  }
  server = https.createServer({ key: fs.readFileSync(keyF), cert: fs.readFileSync(crtF) }, app);
  server.on('clientError', (err, socket) => {
    if (err.code === 'ERR_SSL_HTTP_REQUEST') {
      socket.end(`HTTP/1.1 302 Found\r\nLocation: https://localhost:${PORT}/exp\r\nConnection: close\r\n\r\n`);
    }
  });
}

// ---------- Broker MQTT ----------
(async () => {
  const broker = await Aedes.createBroker();
  let clients = 0;
  broker.on('client', c => { clients++; console.log(`+ mqtt ${c.id} (${clients})`); });
  broker.on('clientDisconnect', c => { clients--; console.log(`- mqtt ${c.id} (${clients})`); });

  // navegadores: MQTT sobre WebSocket
  const wss = new WebSocketServer({ server, path: '/mqtt', handleProtocols: p => (p.has('mqtt') ? 'mqtt' : false) });
  wss.on('connection', ws => broker.handle(createWebSocketStream(ws)));

  // herramientas externas: MQTT sobre TCP
  if (MQTT_TCP) {
    net.createServer(broker.handle).on('error', e => console.log(`  (sin puerto MQTT ${MQTT_TCP}: ${e.code})`)).listen(MQTT_TCP, '0.0.0.0');
  }

async function startTunnel(port) {
  // 1. Cloudflare Quick Tunnel (Red mundial Cloudflare: 100% estable, sin "Bad Gateway" ni pantallas de espera)
  try {
    const { spawn } = require('child_process');
    const cloudflared = require('cloudflared');
    const bin = cloudflared.DEFAULT_CLOUDFLARED_BIN;
    if (bin && fs.existsSync(bin)) {
      return await new Promise((resolve, reject) => {
        const p = spawn(bin, ['tunnel', '--url', `http://localhost:${port}`]);
        let resolved = false;
        const timer = setTimeout(() => {
          if (!resolved) {
            p.kill();
            reject(new Error('Cloudflare timeout'));
          }
        }, 14000);

        p.stderr.on('data', d => {
          const m = d.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
          if (m && !resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({ url: m[0], type: 'Cloudflare Edge', close: () => p.kill() });
          }
        });
        p.on('error', err => { if (!resolved) { clearTimeout(timer); reject(err); } });
      });
    }
  } catch (err) {
    console.log('  (Cloudflare no disponible, usando localtunnel...)');
  }

  // 2. Fallback a localtunnel
  const localtunnel = require('localtunnel');
  const t = await localtunnel({ port });
  return { url: t.url, type: 'Localtunnel', close: () => t.close() };
}

  server.listen(PORT, '0.0.0.0', async () => {
    const local = `${scheme}://localhost:${PORT}`;
    console.log('\n  Tacto · Vive Afuera');
    console.log('  Experiencia (pantalla): %s/exp', local);

    if (USE_TUNNEL) {
      try {
        console.log('  Iniciando túnel seguro de alta velocidad para celulares fuera del WiFi…');
        const tunnel = await startTunnel(PORT);
        baseUrl = tunnel.url;
        console.log('\n  ==============================================================');
        console.log('  🚀 TÚNEL GLOBAL ACTIVO (%s): %s', tunnel.type, baseUrl);
        console.log('  📱 Celulares entran a:       %s', baseUrl);
        console.log('  (El QR en pantalla se actualizará automáticamente)');
        console.log('  ¡Funciona desde 4G/5G y cualquier WiFi con conexión inmediata!');
        console.log('  ==============================================================\n');
      } catch (err) {
        console.error('  No se pudo crear el túnel automáticamente:', err.message);
        console.log('  Continuando con IP local: %s', baseUrl);
      }
    } else {
      console.log('  Teléfonos entran a:     %s   (la experiencia muestra el QR con la sala)', baseUrl);
      if (LAN.length > 1) console.log('  Otras direcciones: %s  (fuerza una con HOST_IP=...)', LAN.map(ip => `${scheme}://${ip}:${PORT}`).join('  '));
      console.log('  💡 Para conectar celulares desde fuera de tu WiFi (4G/5G) ejecuta: npm run tunnel\n');
    }

    console.log('  Broker MQTT:  %s://localhost:%d/mqtt%s\n', PLAIN_HTTP ? 'ws' : 'wss', PORT, MQTT_TCP ? `   ·   tcp :${MQTT_TCP}` : '');
  });
})();
