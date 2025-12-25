#!/bin/bash

# Script para iniciar backend con ngrok automáticamente
# Uso: ./scripts/start-backend-with-ngrok.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
API_DIR="$(cd "$PROJECT_DIR/../API" && pwd)"

cd "$API_DIR"

echo "🚀 Iniciando backend con ngrok..."
echo ""

# Verificar que ngrok esté instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok no está instalado"
    echo "📦 Instalando ngrok..."
    if command -v brew &> /dev/null; then
        brew install ngrok
    else
        echo "Por favor instala ngrok manualmente desde: https://ngrok.com/download"
        exit 1
    fi
fi

# Verificar authtoken
if ! ngrok config check &> /dev/null; then
    echo "⚠️  ngrok no está configurado"
    echo "🔑 Necesitas configurar tu authtoken:"
    echo ""
    echo "1. Ve a: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "2. Copia tu authtoken"
    echo "3. Ejecuta: ngrok config add-authtoken TU_AUTHTOKEN"
    echo ""
    read -p "¿Tienes tu authtoken listo? (s/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        read -p "Pega tu authtoken: " authtoken
        ngrok config add-authtoken "$authtoken"
    else
        echo "❌ No se puede continuar sin authtoken"
        exit 1
    fi
fi

# Iniciar backend en background
echo "📦 Iniciando backend..."
cd "$API_DIR"
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Esperar a que el backend esté listo
echo "⏳ Esperando a que el backend esté listo..."
sleep 5

# Verificar que el backend esté corriendo
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ El backend no pudo iniciarse"
    cat /tmp/backend.log
    exit 1
fi

echo "✅ Backend iniciado (PID: $BACKEND_PID)"
echo ""

# Iniciar ngrok
echo "🌐 Iniciando ngrok..."
ngrok http 3000 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

sleep 3

# Obtener URL de ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "⚠️  No se pudo obtener la URL de ngrok automáticamente"
    echo "📋 Revisa la interfaz web de ngrok: http://localhost:4040"
    echo ""
    echo "O ejecuta manualmente:"
    echo "  ngrok http 3000"
    echo ""
    echo "Luego copia la URL HTTPS que te da ngrok"
    exit 1
fi

echo "✅ ngrok iniciado"
echo ""
echo "🌐 URL pública: $NGROK_URL"
echo ""
echo "📋 Próximos pasos:"
echo "1. Actualizar variable de entorno en EAS:"
echo "   eas env:create preview --name EXPO_PUBLIC_API_URL --value \"$NGROK_URL\" --scope project --type string --visibility plaintext --non-interactive --force"
echo ""
echo "2. Generar nuevo APK:"
echo "   npm run build:android:preview"
echo ""
echo "⚠️  IMPORTANTE:"
echo "- Mantén esta terminal abierta mientras uses el backend"
echo "- La URL de ngrok cambia cada vez que reinicias (plan gratuito)"
echo "- Para URL permanente, considera desplegar en Railway/Render"
echo ""
echo "📊 Logs del backend: tail -f /tmp/backend.log"
echo "📊 Interfaz ngrok: http://localhost:4040"
echo ""
echo "Para detener:"
echo "  kill $BACKEND_PID $NGROK_PID"

# Guardar PIDs para poder detenerlos después
echo "$BACKEND_PID $NGROK_PID" > /tmp/backend-ngrok.pids
echo "$NGROK_URL" > /tmp/ngrok-url.txt

echo ""
echo "✅ Todo listo! El backend está accesible en: $NGROK_URL"

