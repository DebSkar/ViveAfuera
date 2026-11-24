// Configuración de Tacto / Vive Afuera:
//
// 1. MODO LOCAL / MISMO WI-FI (RECOMENDADO PARA PRUEBAS):
//    Dejando 'broker' y 'phoneUrl' vacíos, el servidor detecta tu IP local
//    automáticamente y usa el broker MQTT embebido de alta velocidad.
//
// 2. MODO GITHUB PAGES (SIN CLAVES NI EXPONER CONTRASEÑAS):
//    Al subir este repositorio a GitHub Pages, se conectará automáticamente
//    al broker público seguro 'wss://broker.emqx.io:8084/mqtt' sin requerir claves ni exponer credenciales.
//
// 3. BROKER PRIVADO EN LA NUBE (OPCIONAL):
//    Si tienes tu propia instancia privada de EMQX o HiveMQ, puedes colocarla aquí:
//    broker: 'wss://mi-broker.emqxsl.com:8084/mqtt', username: '...', password: '...'
//
window.TACTO_CONFIG = {
  broker: '',    // Vacío = broker embebido local (en PC) o broker público gratuito (en GitHub Pages)
  phoneUrl: ''   // Vacío = se calcula automáticamente con la IP local o la URL del hosting
};
