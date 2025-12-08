#!/bin/bash

# Script para iniciar Chrome con depuración remota habilitada

echo "Cerrando Chrome..."
pkill -f "Google Chrome"

echo "Esperando 2 segundos..."
sleep 2

echo "Iniciando Chrome con depuración remota en puerto 9222..."
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 > /dev/null 2>&1 &

echo "Esperando a que Chrome inicie..."
sleep 3

echo "Verificando conexión..."
if curl -s http://localhost:9222/json/version > /dev/null 2>&1; then
    echo "✅ Chrome está ejecutándose con depuración remota en puerto 9222"
    echo "Ahora puedes usar el servidor MCP de Chrome DevTools"
else
    echo "❌ No se pudo conectar a Chrome. Intenta iniciarlo manualmente:"
    echo "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222"
fi


