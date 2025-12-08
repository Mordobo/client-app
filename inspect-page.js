// Script para inspeccionar la página usando Chrome DevTools Protocol
const http = require('http');

const pageId = '9546EA7B9166D016E28066FAB775BDA1'; // ID de la pestaña localhost:19006

// Obtener información de la página
const options = {
  hostname: 'localhost',
  port: 9222,
  path: `/json/page/${pageId}`,
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const pageInfo = JSON.parse(data);
      console.log('Información de la página:');
      console.log(JSON.stringify(pageInfo, null, 2));
    } catch (e) {
      console.log('Respuesta:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();








