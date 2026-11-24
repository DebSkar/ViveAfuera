# 🌿 VIVE AFUERA
### *La ilusión del tacto digital*

## https://debskar.github.io/ViveAfuera/exp.html

Una experiencia interactiva, inmersiva y crítica sobre la virtualidad, el contacto físico recíproco y la naturaleza simulada.

---

## 📖 Reflexión Conceptual

> *"No se puede tocar algo sin ser tocado de vuelta."*

En la realidad física y fenomenológica, el **tacto** es el único sentido intrínsecamente recíproco. Como señalaba Maurice Merleau-Ponty en sus estudios sobre la percepción corporal, la mano que roza una corteza, que se sumerge en un torrente o que acaricia la hierba mojada, es tocada al mismo tiempo por el mundo. Hay resistencia, temperatura, fricción, textura viva y una gravedad ineludible que nos devuelve nuestra propia presencia material.

Sin embargo, en nuestra cotidianidad contemporánea hemos sustituido de forma inadvertida esa reciprocidad viva por un **tacto imaginario y virtual**. Pasamos horas y días deslizando nuestros dedos sobre láminas de vidrio, acariciando pantallas de teléfonos y teclados inertes. Nos persuadimos de que interactuamos con el mundo, cuando en realidad solo nos tocamos a nosotros mismos sobre una superficie plana que jamás nos toca de vuelta. No hay respuesta del otro lado, solo píxeles que reaccionan a nuestras órdenes.

De tanto vivir inmersos en la virtualidad —frente al computador, hipnotizados por los teléfonos inteligentes— **nos olvidamos de vivir afuera**. Consumimos representaciones digitales de ríos, cielos y trinos de pájaros para saciar nuestra añoranza de lo natural, mientras nuestros cuerpos permanecen inmóviles, aislados y desconectados del suelo que habitamos.

**Vive Afuera** nace como una trampa poética y crítica frente a esta condición: seduce al espectador con un paisaje natural simulado de belleza hiperrealista, para luego dinamitar la ilusión y confrontarlo con el absurdo de buscar la naturaleza en una pantalla.

---

## 🎭 La Experiencia

La instalación se divide en dos polos interactivos: una **pantalla principal** (computador, proyector o monitor de gran formato) y un **dispositivo de mediación** (el teléfono celular del usuario sostenido en formato horizontal).

```
   ┌───────────────────────────────────────────────┐
   │        PANTALLA PRINCIPAL (/exp)              │
   │  · HDRI 360° de alta fidelidad                │
   │  · Río caudaloso con deformación 3D en vivo   │
   │  · Paisaje sonoro procedural (viento/río/aves)│
   │  · Bandada de aves en vuelo circular          │
   └───────────────────────▲───────────────────────┘
                           │  MQTT sobre WebSockets
                           │  (tiempo real, baja latencia)
   ┌───────────────────────┴───────────────────────┐
   │          TELÉFONO DEL USUARIO                 │
   │  · Orientación 360° (movimiento espejado)     │
   │  · Tacto en el agua (ondas en la superficie)  │
   │  · Micrófono (soplido que levanta el viento)  │
   │  · Pellizco 2 dedos (zoom en las aves)        │
   │  · Inclinación -90° (cámara real + advertencia)│
   └───────────────────────────────────────────────┘
```

### 1. El Paisaje Simulado
Al escanear el código QR en pantalla, el espectador sostiene su teléfono en horizontal y descubre que el dispositivo se ha transformado en un visor sensorial:
* **Orientación Espacial 360° (Giroscopio Espejado):** Al mover el teléfono en el espacio físico hacia la derecha, izquierda, arriba o abajo, la vista panorámica del paisaje se desplaza con naturalidad en el mismo sentido, como una ventana portátil hacia un cañón montañoso.
* **Tacto en el Río (Ondas 3D en Tiempo Real):** Al deslizar los dedos sobre la superficie táctil del celular, se generan ondas de agua concéntricas en la pantalla del teléfono, y simultáneamente la superficie tridimensional del río en el computador se agita y deforma con oleaje dinámico proporcional a la velocidad del arrastre de los dedos.
* **El Aliento y el Viento (Micrófono Procedural):** Al soplar directamente hacia el micrófono del teléfono, el sistema aísla la turbulencia de baja frecuencia y desata ráfagas sonoras de viento alpino, haciendo volar semillas de polen por el aire.
* **Observación de Aves (Gesto de Pellizco):** Con un gesto de pellizco de dos dedos, el usuario activa el zoom óptico para seguir de cerca a las aves que planean sobre el valle.

### 2. El Quiebre de la Cuarta Pared: "Esto no es real"
El clímax de la obra ocurre cuando el espectador baja la mirada y apunta el teléfono directamente hacia el suelo (**inclinación de -90°**):
* El paisaje idílico 3D se disuelve de inmediato con un desenfoque.
* La cámara real trasera del teléfono se activa en directo, proyectando en el computador y en el celular el suelo real y los pies del espectador.
* Enmarcando la transmisión, aparece un marco futurista rojo sci-fi con una advertencia:

```
  ┌────────────────────────────────────────────────────────┐
  │  ///                ⚠ ADVERTENCIA ⚠                /// │
  ├────────────────────────────────────────────────────────┤
  │                                                        │
  │        [ Vista en vivo de la cámara del celular ]      │
  │                  (Tus pies / El suelo)                 │
  │                                                        │
  ├────────────────────────────────────────────────────────┤
  │       >>> Esto no es real, toca pasto de verdad. <<<   │
  └────────────────────────────────────────────────────────┘
```

En ese instante, la obra rechaza a su propio usuario: el dispositivo que prometía conectar con la naturaleza evidencia su propia farsa. La tecnología sabotea la ilusión y le exige al espectador que apague la pantalla, salga de la habitación y toque el mundo real.

---

## 🛠️ Arquitectura y Tecnologías

El proyecto funciona íntegramente sobre tecnologías web estándar, sin necesidad de que el usuario descargue o instale ninguna aplicación externa:

* **Three.js (WebGL):** Motor 3D que renderiza el entorno panorámico 360° con mapeo equirrectangular en alta resolución (`blue_grotto_2k.exr` vía `EXRLoader`), iluminación ambiental PBR, deformación paramétrica de vértices en la malla del río y bandada procedural de aves.
* **Web Audio API (Síntesis Procedural):** Paisaje sonoro generado matemáticamente en tiempo real sin reproducir audios estáticos:
  * Ruido blanco filtrado paso banda para el torrente continuo del río.
  * Filtro pasa-bajos dinámico modulado por la turbulencia del micrófono para el viento.
  * Osciladores de frecuencia modulada (FM) aleatorios para los trinos de aves silvestres.
* **MQTT sobre WebSockets:** Protocolo de mensajería ligera de publicación/suscripción. Permite sincronizar la orientación, el tacto, el soplido y el video streaming de la cámara a 30–60 cuadros por segundo con latencias inferiores a 10 ms en red local.
* **Aedes (Broker MQTT Embebido):** Broker integrado dentro del servidor Node.js que gestiona las salas independientes (`tacto/<sala>/...`) sin requerir servicios en la nube para el funcionamiento local.
* **getUserMedia & Touch Events API:** Captura de orientación espacial (`deviceorientation`), video en vivo de la cámara trasera y multitacto gestual.

---

## 📂 Estructura de Archivos

```
ViveAfuera-main/
│
├── server.js                  # Servidor Express + Broker MQTT Aedes + Generador QR HTTPS
├── package.json               # Dependencias del proyecto (express, aedes, mqtt, ws, qrcode)
├── README.md                  # Manifiesto conceptual, documentación técnica y guía de uso
├── INICIAR_LOCAL.bat          # Lanzador Windows: ejecuta en red local (mismo WiFi / Hotspot)
├── INICIAR_CON_QR_GLOBAL.bat  # Lanzador Windows: ejecuta con túnel público (QR universal 4G/5G)
│
├── public/                    # Archivos cliente servidos por la web
│   ├── index.html             # Página del teléfono: visor horizontal, canvas táctil y sensores
│   ├── exp.html               # Página de la experiencia: pantalla grande, HUD de advertencia y QR
│   ├── paisaje3d.js           # Motor 3D Three.js, shaders de agua, física de partículas y Web Audio
│   ├── tacto.js               # Librería cliente MQTT: gestión de salas, canales y suscripciones
│   ├── blue_grotto_2k.exr     # Imagen panorámica HDRI 360° optimizada (6.9 MB, carga rápida web)
│   ├── config.js              # Configuración opcional para brokers externos o GitHub Pages
│   ├── ui.css                 # Estilos compartidos y diseño responsive
│   └── vendor/                # Librerías locales (three.min.js, EXRLoader.js, mqtt.min.js)
│
└── .github/workflows/pages.yml# Automatización para publicar en GitHub Pages
```

---

## 🚀 Puesta en Marcha

### Requisitos Previos
* Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior).
* Un computador (pantalla de la experiencia) y un teléfono inteligente (iOS o Android).

---

### Opción A: Inicio Rápido en Windows (Doble Clic)

1. **Modo Túnel Global (Recomendado para pruebas sin configurar WiFi):**
   * Haz doble clic sobre **`INICIAR_CON_QR_GLOBAL.bat`**.
   * Se abrirá automáticamente la experiencia en tu navegador y creará un túnel seguro.
   * El código QR proyectado en la pantalla podrá ser escaneado por **cualquier celular con datos móviles (4G/5G) o cualquier red WiFi**.
2. **Modo Red Local:**
   * Haz doble clic sobre **`INICIAR_LOCAL.bat`**.
   * Requiere que el computador y el celular estén conectados a la misma red WiFi o al *Punto de acceso móvil (Hotspot)* del celular.

---

### Opción B: Inicio desde la Terminal

1. **Instalar dependencias (solo la primera vez):**
   ```bash
   npm install
   ```
2. **Iniciar servidor local:**
   ```bash
   node server.js
   ```
   * En el computador, abre: `https://localhost:8443/exp`
   * Acepta el aviso de certificado de seguridad autofirmado (es generado localmente por tu propia máquina).
3. **Iniciar con túnel público (acceso universal sin estar en el mismo WiFi):**
   ```bash
   node server.js --tunnel
   # o bien:
   npm run tunnel
   ```

---

## 📱 Guía de Interacción para el Celular

1. **Escanear el Código QR:**
   * Abre la cámara de tu celular y apunta al código QR que aparece en la esquina de la pantalla grande.
2. **Permisos de Sensores:**
   * Al pulsar **"✨ Comenzar Experiencia"**, acepta los permisos solicitados de **Giroscopio / Movimiento**, **Micrófono** y **Cámara**.
3. **Sostén el Celular en Horizontal:**
   * La interfaz está diseñada para usarse en posición apaisada (*Landscape*), brindando una sensación cinematográfica de control panorámico.
4. **Interactúa:**
   * **Mueve el teléfono en el aire** para descubrir el paisaje 360° alrededor tuyo.
   * **Desliza tus dedos** sobre la pantalla para formar ondas vivas en el agua del río.
   * **Sopla al micrófono** para escuchar el rugido del viento y ver flotar las semillas.
   * **Pellizca con dos dedos** para hacer zoom y buscar las aves en el horizonte.
   * **Apunta el teléfono hacia el suelo (-90°)** para revelar la advertencia.

---

## ⚡ Canales de Telemetría MQTT

| Tópico MQTT | Contenido | Función en la Instalación |
|---|---|---|
| `tacto/<sala>/<dev>/motion` | `{ view: { yaw, pitch, roll } }` | Orientación 360° de la cámara 3D con movimiento espejado. |
| `tacto/<sala>/<dev>/touch` | `{ n, p: [{ x, y }] }` | Generación de ondas en el río a partir del arrastre de los dedos. |
| `tacto/<sala>/<dev>/mic` | `{ l: nivel, b: [low, mid, high] }` | Soplido aerodinámico que despierta el viento y dispersa semillas. |
| `tacto/<sala>/<dev>/zoom` | `{ z: escala }` | Zoom óptico para observación de aves (1.0x a 4.0x). |
| `tacto/<sala>/<dev>/ground` | `{ active: true/false }` | Detección de inclinación al suelo (-90°) para activar el modo Advertencia. |
| `tacto/<sala>/<dev>/cam_frame` | `{ img: dataUrl }` | Transmisión de fotogramas de la cámara real al visor central. |

