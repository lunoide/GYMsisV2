#!/bin/bash

# 🚀 GYMsis V2 - CI/CD Setup Script
# Este script automatiza la configuración inicial del CI/CD

set -e

echo "🚀 Configurando CI/CD para GYMsis V2..."
echo "========================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

# Verificar si Git está inicializado
if [ ! -d ".git" ]; then
    print_error "Este proyecto no está inicializado con Git"
    exit 1
fi

print_step "Verificando dependencias necesarias..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado"
    exit 1
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado"
    exit 1
fi

print_success "Node.js y npm están disponibles"

# Instalar dependencias de desarrollo si no están instaladas
print_step "Instalando dependencias de desarrollo..."

# Lista de dependencias necesarias para CI/CD
DEV_DEPS=(
    "prettier"
    "@lhci/cli"
    "audit-ci"
    "bundlesize"
)

for dep in "${DEV_DEPS[@]}"; do
    if ! npm list "$dep" &> /dev/null; then
        print_step "Instalando $dep..."
        npm install --save-dev "$dep"
        print_success "$dep instalado"
    else
        print_success "$dep ya está instalado"
    fi
done

# Verificar si Firebase CLI está instalado globalmente
print_step "Verificando Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    print_warning "Firebase CLI no está instalado globalmente"
    echo "Para instalar Firebase CLI ejecuta: npm install -g firebase-tools"
else
    print_success "Firebase CLI está disponible"
fi

# Verificar si Vercel CLI está instalado globalmente
print_step "Verificando Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI no está instalado globalmente"
    echo "Para instalar Vercel CLI ejecuta: npm install -g vercel"
else
    print_success "Vercel CLI está disponible"
fi

# Verificar archivos de configuración
print_step "Verificando archivos de configuración..."

CONFIG_FILES=(
    ".github/workflows/ci.yml"
    ".github/workflows/cd.yml"
    ".github/workflows/security.yml"
    ".github/workflows/pr-checks.yml"
    ".github/dependabot.yml"
    ".prettierrc"
    ".prettierignore"
    "lighthouserc.js"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file existe"
    else
        print_error "$file no encontrado"
    fi
done

# Ejecutar tests para verificar configuración
print_step "Ejecutando verificaciones..."

# Verificar que el proyecto se puede construir
print_step "Verificando build..."
if npm run build; then
    print_success "Build exitoso"
else
    print_error "Build falló"
    exit 1
fi

# Verificar linting
print_step "Verificando linting..."
if npm run lint; then
    print_success "Linting exitoso"
else
    print_warning "Hay errores de linting. Ejecuta 'npm run lint:fix' para corregirlos"
fi

# Verificar formato
print_step "Verificando formato de código..."
if npm run format:check; then
    print_success "Formato de código correcto"
else
    print_warning "Código no está formateado. Ejecuta 'npm run format' para corregirlo"
fi

# Verificar TypeScript
print_step "Verificando TypeScript..."
if npm run type-check; then
    print_success "TypeScript sin errores"
else
    print_error "Hay errores de TypeScript"
    exit 1
fi

# Verificar tests
print_step "Ejecutando tests..."
if npm run test:run; then
    print_success "Tests exitosos"
else
    print_error "Algunos tests fallaron"
    exit 1
fi

echo ""
echo "🎉 ¡Configuración de CI/CD completada!"
echo "========================================"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. 🔐 Configurar secretos en GitHub:"
echo "   - Ve a Settings > Secrets and variables > Actions"
echo "   - Añade los secretos listados en .github/CI-CD-SETUP.md"
echo ""
echo "2. 🔥 Configurar Firebase:"
echo "   - Ejecuta: firebase login:ci"
echo "   - Copia el token generado a GitHub Secrets como FIREBASE_TOKEN"
echo ""
echo "3. ▲ Configurar Vercel:"
echo "   - Ejecuta: vercel login"
echo "   - Ejecuta: vercel link"
echo "   - Copia los IDs generados a GitHub Secrets"
echo ""
echo "4. 🌍 Configurar environments en GitHub:"
echo "   - Ve a Settings > Environments"
echo "   - Crea 'staging' y 'production'"
echo ""
echo "5. 🚀 ¡Haz tu primer push para activar los workflows!"
echo ""
echo "📚 Para más información, consulta: .github/CI-CD-SETUP.md"
echo ""
print_success "¡Todo listo para CI/CD! 🚀"