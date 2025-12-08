#!/bin/bash

# Script para configurar el token de GitHub en ambos archivos mcp.json

echo "=== Configuración de GitHub Personal Access Token ==="
echo ""

# Verificar si se proporcionó el token como variable de entorno
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Por favor, proporciona tu token de GitHub:"
    echo ""
    echo "Opción 1: Como variable de entorno"
    echo "  export GITHUB_TOKEN='tu_token_aqui'"
    echo "  ./configurar-github-token.sh"
    echo ""
    echo "Opción 2: Como argumento"
    echo "  ./configurar-github-token.sh 'tu_token_aqui'"
    echo ""
    echo "Opción 3: Se te pedirá ingresarlo"
    echo ""
    read -sp "Ingresa tu GitHub Personal Access Token: " GITHUB_TOKEN
    echo ""
    echo ""
fi

# Si se pasó como argumento
if [ -n "$1" ]; then
    GITHUB_TOKEN="$1"
fi

# Validar que el token no esté vacío
if [ -z "$GITHUB_TOKEN" ] || [ "$GITHUB_TOKEN" = "YOUR_GITHUB_TOKEN" ]; then
    echo "❌ Error: No se proporcionó un token válido"
    exit 1
fi

# Validar formato del token (debe empezar con ghp_)
if [[ ! "$GITHUB_TOKEN" =~ ^ghp_ ]]; then
    echo "⚠️  Advertencia: El token no parece tener el formato correcto (debe empezar con 'ghp_')"
    read -p "¿Deseas continuar de todas formas? (s/n): " continuar
    if [ "$continuar" != "s" ] && [ "$continuar" != "S" ]; then
        exit 1
    fi
fi

echo "Actualizando archivos mcp.json..."
echo ""

# Función para actualizar un archivo
update_mcp_file() {
    local file_path="$1"
    local file_name="$2"
    
    if [ ! -f "$file_path" ]; then
        echo "⚠️  Archivo $file_name no encontrado: $file_path"
        return 1
    fi
    
    # Crear backup
    cp "$file_path" "${file_path}.backup"
    
    # Actualizar usando Python para manejar JSON correctamente
    python3 << PYTHON_SCRIPT
import json
import sys

file_path = "$file_path"
token = "$GITHUB_TOKEN"

try:
    with open(file_path, 'r') as f:
        config = json.load(f)
    
    if 'mcpServers' in config and 'github' in config['mcpServers']:
        if 'env' not in config['mcpServers']['github']:
            config['mcpServers']['github']['env'] = {}
        config['mcpServers']['github']['env']['GITHUB_PERSONAL_ACCESS_TOKEN'] = token
        
        with open(file_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"✅ Token actualizado en {file_name}")
        sys.exit(0)
    else:
        print(f"⚠️  No se encontró configuración de GitHub en {file_name}")
        sys.exit(1)
except
except Exception as e:
    print(f"❌ Error al actualizar $file_name: {e}")
    sys.exit(1)
PYTHON_SCRIPT
}

# Actualizar archivo global
GLOBAL_PATH="$HOME/.cursor/mcp.json"
update_mcp_file "$GLOBAL_PATH" "archivo global (~/.cursor/mcp.json)"

# Actualizar archivo local
LOCAL_PATH=".cursor/mcp.json"
if [ -f "$LOCAL_PATH" ]; then
    update_mcp_file "$LOCAL_PATH" "archivo local (.cursor/mcp.json)"
else
    echo "⚠️  Archivo local no encontrado: $LOCAL_PATH"
fi

echo ""
echo "=== Verificación ==="
echo ""
echo "Token configurado (primeros y últimos caracteres): ${GITHUB_TOKEN:0:10}...${GITHUB_TOKEN: -4}"
echo ""

# Verificar que se actualizó correctamente
echo "Verificando configuración..."
GLOBAL_HAS_TOKEN=$(cat "$HOME/.cursor/mcp.json" 2>/dev/null | grep -c "GITHUB_PERSONAL_ACCESS_TOKEN.*$GITHUB_TOKEN" || echo "0")
if [ "$GLOBAL_HAS_TOKEN" -gt 0 ]; then
    echo "✅ Archivo global verificado"
else
    echo "⚠️  No se pudo verificar el archivo global"
fi

if [ -f "$LOCAL_PATH" ]; then
    LOCAL_HAS_TOKEN=$(cat "$LOCAL_PATH" 2>/dev/null | grep -c "GITHUB_PERSONAL_ACCESS_TOKEN.*$GITHUB_TOKEN" || echo "0")
    if [ "$LOCAL_HAS_TOKEN" -gt 0 ]; then
        echo "✅ Archivo local verificado"
    else
        echo "⚠️  No se pudo verificar el archivo local"
    fi
fi

echo ""
echo "=== Configuración Completada ==="
echo ""
echo "📝 Próximos pasos:"
echo "1. Reinicia Cursor completamente (Cmd+Q)"
echo "2. Abre Cursor nuevamente"
echo "3. El servidor MCP de GitHub debería estar funcionando"
echo ""
echo "💡 Para verificar que funciona, puedo intentar listar tus repositorios"
echo ""

