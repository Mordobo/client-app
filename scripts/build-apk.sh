#!/bin/bash

# Script de ayuda para generar APK de Mordobo
# Uso: ./scripts/build-apk.sh [preview|staging|production]

set -e

PROFILE=${1:-preview}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "🚀 Generando APK de Mordobo"
echo "📋 Perfil: $PROFILE"
echo ""

# Verificar que EAS CLI esté instalado
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI no está instalado"
    echo "📦 Instalando EAS CLI..."
    npm install -g eas-cli
fi

# Verificar que esté logueado
echo "🔐 Verificando autenticación..."
if ! eas whoami &> /dev/null; then
    echo "⚠️  No estás logueado en EAS"
    echo "🔑 Iniciando sesión..."
    eas login
fi

# Verificar variables de entorno
echo ""
echo "🔍 Verificando variables de entorno..."
API_URL=$(eas secret:list --json 2>/dev/null | grep -o '"EXPO_PUBLIC_API_URL"' || echo "")

if [ -z "$API_URL" ]; then
    echo "⚠️  EXPO_PUBLIC_API_URL no está configurada"
    echo ""
    echo "📝 Configura la URL de tu API:"
    echo ""
    echo "Para red local (misma WiFi):"
    echo "  1. Obtén tu IP local:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "NO_ENCONTRADA")
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        LOCAL_IP=$(hostname -I | awk '{print $1}')
    else
        LOCAL_IP="TU_IP_LOCAL"
    fi
    
    if [ "$LOCAL_IP" != "NO_ENCONTRADA" ] && [ "$LOCAL_IP" != "TU_IP_LOCAL" ]; then
        echo "     IP detectada: $LOCAL_IP"
        echo ""
        read -p "  ¿Usar $LOCAL_IP:3000? (s/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[SsYy]$ ]]; then
            API_URL="http://$LOCAL_IP:3000"
        else
            read -p "  Ingresa la URL de tu API: " API_URL
        fi
    else
        read -p "  Ingresa la URL de tu API (ej: http://192.168.1.100:3000): " API_URL
    fi
    
    if [ -n "$API_URL" ]; then
        echo ""
        echo "💾 Guardando secreto para perfil: $PROFILE"
        eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "$API_URL" --type string --profile "$PROFILE" || {
            echo "⚠️  Error al guardar secreto. Intenta manualmente:"
            echo "   eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value \"$API_URL\" --type string --profile $PROFILE"
        }
    fi
else
    echo "✅ EXPO_PUBLIC_API_URL está configurada"
fi

# Verificar que el backend esté accesible
echo ""
echo "🔍 Verificando conectividad con el backend..."
if [ -n "$API_URL" ]; then
    # Extraer host de API_URL si está disponible
    if [ -z "$API_URL" ]; then
        API_URL=$(eas secret:list --json 2>/dev/null | grep -A 1 '"EXPO_PUBLIC_API_URL"' | grep -o '"value":"[^"]*"' | cut -d'"' -f4 || echo "")
    fi
fi

# Mostrar información del build
echo ""
echo "📦 Información del build:"
echo "   Perfil: $PROFILE"
echo "   Plataforma: Android"
echo "   Tipo: APK"
echo ""

# Confirmar antes de construir
read -p "¿Continuar con el build? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo "❌ Build cancelado"
    exit 1
fi

# Ejecutar el build
echo ""
echo "🏗️  Iniciando build..."
echo ""

case $PROFILE in
    preview)
        eas build --platform android --profile preview
        ;;
    staging)
        eas build --platform android --profile staging
        ;;
    production)
        echo "⚠️  Production build genera AAB por defecto"
        echo "   Si necesitas APK, modifica eas.json temporalmente"
        read -p "¿Continuar? (s/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[SsYy]$ ]]; then
            eas build --platform android --profile production
        else
            echo "❌ Build cancelado"
            exit 1
        fi
        ;;
    *)
        echo "❌ Perfil inválido: $PROFILE"
        echo "   Usa: preview, staging, o production"
        exit 1
        ;;
esac

echo ""
echo "✅ Build iniciado"
echo "📱 Revisa el progreso en la URL que se mostró arriba"
echo "💾 Para descargar el APK cuando termine:"
echo "   eas build:download --latest --platform android"

