#!/bin/bash

# Script helper para ejecutar tests de debugging de pantalla negra
# Uso: ./test-debug.sh [1|2|3|restore]

set -e

LAYOUT_DIR="app"
TESTS_DIR="app-tests"
ORIGINAL_LAYOUT="$LAYOUT_DIR/_layout.tsx"
BACKUP_LAYOUT="$TESTS_DIR/_layout.backup.tsx"
TEST1="$TESTS_DIR/_layout.test1.tsx"
TEST2="$TESTS_DIR/_layout.test2.tsx"
TEST3="$TESTS_DIR/_layout.test3.tsx"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para crear backup
create_backup() {
    # Asegurar que el directorio de tests existe
    mkdir -p "$TESTS_DIR"
    
    if [ -f "$ORIGINAL_LAYOUT" ]; then
        cp "$ORIGINAL_LAYOUT" "$BACKUP_LAYOUT"
        print_success "Backup creado: $BACKUP_LAYOUT"
    fi
}

# Función para restaurar desde backup
restore_from_backup() {
    if [ -f "$BACKUP_LAYOUT" ]; then
        cp "$BACKUP_LAYOUT" "$ORIGINAL_LAYOUT"
        print_success "Restaurado desde backup"
    else
        print_error "No se encontró backup. Usa 'restore' para restaurar desde git."
    fi
}

# Función para ejecutar TEST 1
run_test1() {
    print_header "TEST 1: Sin Splash Screen Personalizado"
    
    if [ ! -f "$TEST1" ]; then
        print_error "No se encontró $TEST1"
        exit 1
    fi
    
    create_backup
    cp "$TEST1" "$ORIGINAL_LAYOUT"
    print_success "TEST 1 activado"
    print_info "Si ves una pantalla verde con texto, el problema es el CustomSplashScreen"
    print_info "Ejecuta: npm start"
}

# Función para ejecutar TEST 2
run_test2() {
    print_header "TEST 2: Sin AuthContext"
    
    if [ ! -f "$TEST2" ]; then
        print_error "No se encontró $TEST2"
        exit 1
    fi
    
    create_backup
    cp "$TEST2" "$ORIGINAL_LAYOUT"
    print_success "TEST 2 activado"
    print_info "Si ves una pantalla azul con texto, el problema es AuthContext"
    print_info "Ejecuta: npm start"
}

# Función para ejecutar TEST 3
run_test3() {
    print_header "TEST 3: Sin Google Sign-In Init"
    
    if [ ! -f "$TEST3" ]; then
        print_error "No se encontró $TEST3"
        exit 1
    fi
    
    create_backup
    cp "$TEST3" "$ORIGINAL_LAYOUT"
    print_success "TEST 3 activado"
    print_info "Si ves una pantalla magenta con texto, el problema es initializeGoogleSignIn()"
    print_info "Ejecuta: npm start"
}

# Función para restaurar versión original
restore_original() {
    print_header "Restaurando Versión Original"
    
    if [ -f "$BACKUP_LAYOUT" ]; then
        restore_from_backup
    else
        print_info "No hay backup local. Restaurando desde git..."
        git checkout "$ORIGINAL_LAYOUT" 2>/dev/null || {
            print_error "No se pudo restaurar desde git. Verifica manualmente."
            exit 1
        }
        print_success "Restaurado desde git"
    fi
    
    print_info "Versión original restaurada"
}

# Main
case "$1" in
    1)
        run_test1
        ;;
    2)
        run_test2
        ;;
    3)
        run_test3
        ;;
    restore)
        restore_original
        ;;
    *)
        echo "Uso: $0 [1|2|3|restore]"
        echo ""
        echo "Opciones:"
        echo "  1       - Ejecutar TEST 1 (Sin splash personalizado)"
        echo "  2       - Ejecutar TEST 2 (Sin AuthContext)"
        echo "  3       - Ejecutar TEST 3 (Sin Google Sign-In)"
        echo "  restore - Restaurar versión original"
        exit 1
        ;;
esac

