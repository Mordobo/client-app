#!/bin/bash

# Script para configurar MCP Filesystem para Claude
# Ejecuta: ./configurar-mcp-claude.sh

echo "⚙️  Configurando MCP Filesystem para Claude..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MCP_FILE="$HOME/.cursor/mcp.json"
BACKUP_FILE="${MCP_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Crear directorio .cursor si no existe
mkdir -p "$HOME/.cursor"

# Verificar si el archivo existe
if [ -f "$MCP_FILE" ]; then
    echo "📋 Archivo mcp.json existe. Creando backup..."
    cp "$MCP_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup creado: $BACKUP_FILE${NC}"
    echo ""
fi

# Crear/actualizar configuración MCP
echo "📝 Creando/actualizando configuración MCP..."
echo ""

python3 << 'PYTHON_SCRIPT'
import json
import os
from pathlib import Path

mcp_file = Path.home() / ".cursor" / "mcp.json"

# Configuración recomendada
config = {
    "mcpServers": {
        "filesystem": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                "/Users/angelorivas/Desktop/Proyectos_Personales/Mordobo"
            ]
        },
        "filesystem-api": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                "/Users/angelorivas/Desktop/Proyectos_Personales/Mordobo/API"
            ]
        },
        "filesystem-mobile": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                "/Users/angelorivas/Desktop/Proyectos_Personales/Mordobo/mobile"
            ]
        }
    }
}

# Si el archivo existe, leer y mergear configuración
if mcp_file.exists():
    try:
        with open(mcp_file, 'r') as f:
            existing_config = json.load(f)
        
        # Mergear configuraciones existentes con las nuevas
        if "mcpServers" in existing_config:
            existing_config["mcpServers"].update(config["mcpServers"])
            config = existing_config
            print("✅ Configuración existente preservada y actualizada")
    except json.JSONDecodeError:
        print("⚠️  Archivo mcp.json tiene formato inválido, será reemplazado")
    except Exception as e:
        print(f"⚠️  Error leyendo archivo existente: {e}")

# Escribir configuración
try:
    with open(mcp_file, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"✅ Configuración guardada en: {mcp_file}")
except Exception as e:
    print(f"❌ Error escribiendo archivo: {e}")
    exit(1)
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Configuración completada exitosamente!${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Próximos pasos:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. ⚠️  IMPORTANTE: Reinicia Cursor completamente"
    echo "   - Cierra Cursor (Cmd+Q)"
    echo "   - Espera 5 segundos"
    echo "   - Abre Cursor nuevamente"
    echo ""
    echo "2. Abre un archivo del proyecto"
    echo ""
    echo "3. Verifica el acceso ejecutando:"
    echo "   ./verificar-sincronizacion-claude.sh"
    echo ""
    echo "4. Pregunta a Claude:"
    echo "   '¿Puedes leer el archivo CLAUDE.md del proyecto mobile?'"
    echo ""
else
    echo ""
    echo "❌ Error en la configuración. Revisa los mensajes arriba."
    exit 1
fi

