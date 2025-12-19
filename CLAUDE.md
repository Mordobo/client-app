# CLAUDE.md

Proyecto: **Mordobo Mobile**

⸻

## 📘 Descripción del Proyecto

Mordobo es una aplicación móvil multiplataforma (iOS, Android, Web) que permite a los clientes navegar, reservar y gestionar servicios para el hogar. La aplicación está construida con Expo Router utilizando file-based routing, proporcionando una experiencia de usuario fluida y moderna con soporte para autenticación múltiple (email, Google, Facebook), internacionalización (i18n) y gestión de estado avanzada.

**Características principales:**
- Autenticación con múltiples proveedores (Email, Google Sign-In)
- Navegación basada en pestañas con Expo Router
- Internacionalización (i18n) con soporte para inglés y español
- Gestión de estado con Zustand y React Query
- Almacenamiento seguro con AsyncStorage y React Native Keychain
- Splash screen personalizado
- Soporte para modo claro/oscuro automático

⸻

## 🍉 Principios de Desarrollo (Context Engineering)

### Design Philosophy

- **KISS** – Prefiere soluciones simples y directas
- **YAGNI** – Implementa solo lo necesario, evita sobre-ingeniería
- **DRY** – Evita duplicación de código, reutiliza componentes y utilidades
- **Mobile-First** – Prioriza la experiencia móvil nativa sobre web
- **Performance** – Optimiza para dispositivos móviles con recursos limitados

⸻

## 🛡️ Security Best Practices

### Datos Sensibles

- **Never log sensitive data** – Nunca registrar tokens, contraseñas, o información personal en logs
- **Encrypt data at rest** – Usar React Native Keychain para datos sensibles (tokens, credenciales)
- **Secure storage** – AsyncStorage solo para datos no sensibles, Keychain para tokens y credenciales
- **HTTPS everywhere** – Todas las comunicaciones con APIs deben usar HTTPS
- **Token management** – Tokens de autenticación deben almacenarse de forma segura y refrescarse automáticamente
- **Input validation** – Validar y sanitizar todos los inputs del usuario
- **Environment variables** – Usar `EXPO_PUBLIC_*` para variables públicas, nunca exponer secrets en el código

### Autenticación

- Validar tokens antes de cada request crítico
- Implementar refresh tokens para sesiones persistentes
- Manejar logout completo limpiando todos los datos de autenticación
- Verificar estado de autenticación en rutas protegidas

⸻

## ⚡ Performance Guidelines

### React Native / Expo Optimizations

- **List rendering** – Usar `@shopify/flash-list` para listas grandes en lugar de FlatList estándar
- **Image optimization** – Usar `expo-image` con lazy loading y placeholders
- **Memoization** – Usar `React.memo`, `useMemo`, `useCallback` para componentes pesados
- **Code splitting** – Aprovechar lazy loading de rutas con Expo Router
- **Bundle size** – Monitorear tamaño del bundle, evitar imports innecesarios
- **Re-renders** – Minimizar re-renders innecesarios usando Zustand selectors específicos
- **Animations** – Usar `react-native-reanimated` para animaciones de 60fps
- **Background tasks** – Evitar operaciones pesadas en el hilo principal

### React Query Best Practices

- Configurar `staleTime` y `cacheTime` apropiadamente según el tipo de dato
- Usar `useQuery` para datos de lectura, `useMutation` para operaciones de escritura
- Implementar optimistic updates cuando sea apropiado
- Invalidar queries relacionadas después de mutaciones

### Network Optimization

- Implementar retry logic con exponential backoff
- Cachear respuestas cuando sea apropiado
- Usar debounce/throttle para búsquedas y inputs frecuentes
- Manejar estados offline gracefully

⸻

## 🤖 AI Assistant Guidelines

### When Suggesting Code

- **Siempre incluir types en TypeScript** – No usar `any`, preferir tipos explícitos o `unknown`
- **Seguir principios definidos en este documento** – KISS, YAGNI, DRY
- **Implementar error handling** – Try-catch blocks, error boundaries, manejo de estados de error
- **Incluir tests cuando sea relevante** – Especialmente para lógica de negocio y utilidades
- **Mantener simplicidad y claridad** – Código legible y autodocumentado
- **Respetar estructura del proyecto** – Colocar archivos en las carpetas correctas según su propósito
- **Usar hooks personalizados** – Extraer lógica reutilizable en hooks
- **Componentes funcionales** – Siempre usar componentes funcionales con hooks
- **Type safety** – Validar tipos en runtime con Zod cuando sea necesario

### Documentation Policy

- **NO crear archivos .md innecesarios** – Evitar crear documentación que no sea estrictamente necesaria para el proyecto
- **Comunicar directamente** – Si se necesita información o configuración, decirlo directamente en el chat en lugar de crear archivos de documentación
- **Implementar directamente** – Si es necesario hacer algo (configuración, setup, etc.), hacerlo directamente en lugar de solo documentarlo
- **Documentación solo cuando sea esencial** – Crear archivos .md únicamente cuando sean absolutamente necesarios para el funcionamiento del proyecto (ej: README.md, CLAUDE.md, documentación de API crítica)
- **Preferir código sobre documentación** – Implementar la solución directamente en lugar de crear guías extensas

### Priority Order (Context Hierarchy)

1. **CLAUDE.md rules** (highest priority) – Este documento tiene precedencia absoluta
2. **Archivos de configuración** – `package.json`, `app.json`, `tsconfig.json`, `.env`
3. **Estructura del proyecto** – Respetar la organización de carpetas establecida
4. **Convenciones del proyecto** – Patrones establecidos en código existente
5. **Best practices generales** – React Native, Expo, TypeScript standards

### Code Review Checklist

Antes de sugerir código, verificar:
- ✅ Types definidos correctamente
- ✅ Error handling implementado
- ✅ No hay datos sensibles en logs
- ✅ Performance optimizado (memoization, lazy loading)
- ✅ Internacionalización considerada (usar `t()` para textos)
- ✅ Accesibilidad básica (labels, hints)
- ✅ Compatibilidad multiplataforma (iOS, Android, Web)
- ✅ **Si afecta API**: Backend actualizado y sincronizado
- ✅ **Si afecta API**: Tipos coinciden entre frontend y backend

⸻

## 🏗️ Tech Stack & Architecture

### Core Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Expo SDK ~54.0.0
- **Routing**: Expo Router ~6.0.4 (file-based routing)
- **UI Library**: React Native 0.81.4
- **State Management**: 
  - Zustand ^5.0.8 (estado global)
  - React Query (@tanstack/react-query ^5.87.4) (server state)
- **Navigation**: React Navigation 7.x (via Expo Router)
- **Storage**: 
  - AsyncStorage (datos no sensibles)
  - React Native Keychain (tokens y credenciales)
- **Authentication**: 
  - Google Sign-In (@react-native-google-signin/google-signin)
  - Facebook SDK (react-native-fbsdk-next)
- **Internationalization**: i18n-js ^4.5.1
- **Validation**: Zod ^4.1.8
- **Styling**: React Native StyleSheet + Theme system
- **Animations**: React Native Reanimated ~4.1.0
- **Lists**: Shopify Flash List 2.0.2

### Platform Support

- ✅ iOS (con soporte para tablets)
- ✅ Android (con edge-to-edge habilitado)
- ✅ Web (static export)

⸻

## 🏛️ Arquitectura Multi-Repositorio

### Estructura del Ecosistema Mordobo

El proyecto Mordobo está dividido en múltiples repositorios que trabajan juntos:

```
Mordobo/
├── mobile/                    # 📱 Este proyecto - Aplicación móvil
│   └── Repo: (local)
│
└── API/                       # 🔌 Backend API
    └── Repo: https://github.com/Mordobo/backend-api
    └── Path: Proyectos_Personales/Mordobo/API
```

### Proyecto Backend API

**Ubicación:** `/Users/angelorivas/Desktop/Proyectos_Personales/Mordobo/API`  
**Repositorio:** https://github.com/Mordobo/backend-api

#### Tech Stack del Backend

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js ^5.1.0
- **Database**: PostgreSQL (Supabase)
- **Authentication**: 
  - JWT (jsonwebtoken ^9.0.2)
  - bcrypt ^6.0.0 (password hashing)
- **Security**: 
  - Helmet ^8.1.0 (security headers)
  - CORS ^2.8.5
  - express-rate-limit ^8.1.0
- **Validation**: Zod ^4.1.11
- **Database Client**: pg ^8.16.3 (PostgreSQL)

#### Estructura del Backend

```
API/
├── src/
│   ├── index.ts              # Punto de entrada del servidor Express
│   ├── db.ts                 # Configuración de conexión a PostgreSQL/Supabase
│   └── routes/
│       └── auth.ts           # Rutas de autenticación
├── dist/                     # Build compilado (TypeScript → JavaScript)
├── package.json
├── tsconfig.json
├── create_refresh_tokens_table.sql  # Migración SQL para refresh tokens
├── BRUNO_API_DOCUMENTATION.md      # Documentación completa de endpoints
└── README.md
```

#### Endpoints Principales del Backend

- `POST /auth/register` - Registro de usuarios
- `POST /auth/login` - Login con credenciales (email/phone + password)
- `POST /auth/google` - Login con Google OAuth
- `POST /auth/refresh` - Refrescar tokens de acceso
- `POST /auth/validate-email` - Validar email (verificación)

#### Configuración del Backend

**Variables de Entorno Requeridas:**
```env
DATABASE_URL=postgresql://...          # Connection string de PostgreSQL/Supabase
JWT_SECRET=your_jwt_secret_key         # Secret para access tokens
JWT_REFRESH_SECRET=your_refresh_secret # Secret para refresh tokens
PORT=3000                              # Puerto del servidor (default: 3000)
```

**Comandos del Backend:**
```bash
cd ../API                    # Navegar al proyecto backend
npm install                  # Instalar dependencias
npm run dev                  # Desarrollo con hot reload (ts-node-dev)
npm run build               # Compilar TypeScript
npm start                    # Ejecutar build de producción
```

#### Seguridad del Backend

- **Password Hashing**: bcrypt con 12 salt rounds
- **JWT Tokens**: 
  - Access tokens: expiran en 15 minutos
  - Refresh tokens: expiran en 7 días
- **Rate Limiting**: Login endpoint limitado a 5 requests/minuto por IP
- **Token Rotation**: Refresh tokens se rotan en cada refresh request
- **Security Headers**: Helmet configurado para protección adicional

### Comunicación Frontend-Backend

#### Configuración de API en Mobile

El proyecto mobile se conecta al backend mediante:

```typescript
// services/auth.ts
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
```

**Variables de Entorno Mobile:**
```bash
# .env en mobile/
EXPO_PUBLIC_API_URL=http://localhost:3000        # Desarrollo local
# EXPO_PUBLIC_API_URL=https://api.mordobo.com    # Producción
```

#### Manejo de URLs en Android Emulator

El código mobile ya maneja automáticamente la conversión de `localhost` a `10.0.2.2` para Android emulator:

```typescript
// services/auth.ts - Ya implementado
if (Platform.OS === 'android' && /localhost/i.test(envUrl)) {
  return envUrl.replace(/localhost/gi, '10.0.2.2');
}
```

### Guía para Cambios que Afectan Ambos Proyectos

Cuando se necesite hacer cambios que afecten tanto el frontend como el backend:

#### 1. Identificar Impacto

- ✅ ¿Se necesita un nuevo endpoint en el backend?
- ✅ ¿Cambia la estructura de datos de respuesta?
- ✅ ¿Se agregan nuevos campos a modelos existentes?
- ✅ ¿Cambia la autenticación o autorización?

#### 2. Protocolo de Desarrollo Cross-Repo

**Paso 1: Backend First (Recomendado)**
1. Implementar endpoint/modelo en backend
2. Probar endpoint con Bruno/Postman
3. Documentar cambios en `BRUNO_API_DOCUMENTATION.md`
4. Actualizar tipos TypeScript si es necesario

**Paso 2: Frontend Integration**
1. Actualizar tipos en `services/` del mobile
2. Implementar llamadas al nuevo endpoint
3. Actualizar componentes que consumen el endpoint
4. Manejar errores y estados de carga

**Paso 3: Testing End-to-End**
1. Verificar flujo completo desde mobile
2. Validar manejo de errores
3. Confirmar que tipos coinciden entre frontend y backend

#### 3. Sincronización de Tipos

**Estrategia Recomendada:**

1. **Backend define tipos base** en respuestas API
2. **Frontend mapea tipos** en `services/` y `utils/authMapping.ts`
3. **Validación con Zod** en ambos lados cuando sea crítico

**Ejemplo de Sincronización:**

```typescript
// Backend: src/routes/auth.ts
interface RegisterResponse {
  userType: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
  };
  token?: string;
  refreshToken?: string;
}

// Frontend: services/auth.ts
export interface RegisterResponse {
  userType: string;
  user: RegisterResponseUser;
  token?: string;
  refreshToken?: string;
}

// Frontend: utils/authMapping.ts - Mapear snake_case → camelCase
export function mapApiUserToAppUser(apiUser: RegisterResponseUser): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    firstName: apiUser.full_name.split(' ')[0],
    lastName: apiUser.full_name.split(' ').slice(1).join(' '),
    phone: apiUser.phone_number,
    // ...
  };
}
```

#### 4. Checklist para Cambios Cross-Repo

Antes de completar una feature que afecta ambos proyectos:

- [ ] Backend endpoint implementado y probado
- [ ] Documentación del backend actualizada (`BRUNO_API_DOCUMENTATION.md`)
- [ ] Tipos TypeScript sincronizados entre proyectos
- [ ] Frontend actualizado con nuevos endpoints
- [ ] Manejo de errores implementado en frontend
- [ ] Testing end-to-end completado
- [ ] Variables de entorno configuradas correctamente
- [ ] Migraciones de BD ejecutadas si aplica

### Acceso a Archivos del Backend

Claude y Cursor tienen acceso al proyecto backend mediante MCP Filesystem configurado en:
- Path permitido: `/Users/angelorivas/Desktop/Proyectos_Personales/Mordobo/API`

**Para trabajar con el backend:**
- Usar rutas absolutas: `/Users/angelorivas/Desktop/Proyectos_Personales/Mordobo/API/src/...`
- O rutas relativas desde mobile: `../API/src/...`

### Documentación del Backend

- **BRUNO_API_DOCUMENTATION.md** - Documentación completa de todos los endpoints
- **README.md** - Setup y configuración del backend
- **create_refresh_tokens_table.sql** - Migración SQL para refresh tokens

### Notas Importantes

1. **Puerto del Backend**: Por defecto corre en `http://localhost:3000`
2. **CORS**: El backend tiene CORS habilitado para permitir requests desde mobile
3. **Base de Datos**: Usa PostgreSQL/Supabase, asegurar que `DATABASE_URL` esté configurado
4. **Tokens**: El backend maneja JWT con refresh tokens, el mobile debe almacenarlos en Keychain
5. **Rate Limiting**: El endpoint de login tiene rate limiting, considerar esto en UX del mobile

⸻

## 📁 Estructura del Proyecto

```
mobile/
├── app/                          # 🎯 Expo Router - File-based routing
│   ├── _layout.tsx              # Root layout con AuthProvider
│   ├── (auth)/                  # Grupo de rutas de autenticación
│   │   ├── _layout.tsx
│   │   ├── index.tsx            # Landing/auth selector
│   │   ├── login.tsx            # Login screen
│   │   ├── register.tsx         # Register screen
│   │   └── verify.tsx           # Email verification
│   ├── (tabs)/                  # Grupo de rutas principales (tabs)
│   │   ├── _layout.tsx          # Tab navigator
│   │   ├── index.tsx            # Tab index/redirect
│   │   ├── home.tsx             # Home tab
│   │   ├── explore.tsx          # Explore tab
│   │   └── profile.tsx          # Profile tab
│   └── modal.tsx                # Modal screen
│
├── components/                   # 🧩 Componentes UI reutilizables
│   ├── ui/                      # Componentes UI base (collapsible, icons)
│   ├── SplashScreen.tsx         # Splash screen personalizado
│   ├── MordoboLogo.tsx          # Logo component
│   └── ...                      # Otros componentes genéricos
│
├── contexts/                     # 🔄 React Contexts
│   └── AuthContext.tsx          # Context de autenticación
│
├── services/                     # 🌐 Servicios de API
│   └── auth.ts                  # Servicio de autenticación
│
├── utils/                        # 🛠️ Utilidades
│   ├── authMapping.ts           # Mapeo de datos de autenticación
│   ├── googleAuth.ts            # Utilidades de Google Auth
│   ├── googleSignIn.ts          # Wrapper de Google Sign-In
│   └── userStorage.ts           # Utilidades de almacenamiento
│
├── hooks/                        # 🎣 Custom Hooks
│   ├── use-color-scheme.ts      # Hook para tema claro/oscuro
│   └── use-theme-color.ts       # Hook para colores del tema
│
├── config/                       # ⚙️ Configuraciones
│   └── google-signin.ts         # Configuración de Google Sign-In
│
├── constants/                    # 📌 Constantes
│   └── theme.ts                 # Constantes de tema
│
├── i18n/                         # 🌍 Internacionalización
│   ├── index.ts                 # Configuración i18n
│   └── locales/
│       ├── en.ts                # Traducciones inglés
│       └── es.ts                # Traducciones español
│
├── assets/                       # 📦 Assets estáticos
│   └── images/                  # Imágenes (iconos, splash, etc.)
│
├── android/                      # 🤖 Android nativo
│   └── app/                     # Configuración Android
│
├── app.json                      # ⚙️ Configuración Expo
├── tsconfig.json                 # ⚙️ Configuración TypeScript
├── package.json                  # 📦 Dependencias y scripts
└── CLAUDE.md                     # 📖 Este archivo
```

### Convenciones de Estructura

- **app/** – Rutas usando Expo Router (file-based routing)
- **components/** – Componentes UI reutilizables y genéricos
- **contexts/** – React Contexts para estado global compartido
- **services/** – Servicios de API y comunicación con backend
- **utils/** – Funciones utilitarias puras y helpers
- **hooks/** – Custom React hooks reutilizables
- **config/** – Configuraciones de servicios externos
- **constants/** – Constantes globales de la aplicación
- **i18n/** – Configuración y traducciones de internacionalización

⸻

## 📐 Convenciones de Código

### TypeScript Guidelines

- **Siempre incluir type hints** – No usar `any`, preferir tipos explícitos
- **Interfaces** → Para object shapes y props de componentes
- **Types** → Para unions, primitives, y tipos derivados
- **Evitar `any`** → Usar `unknown` si es necesario, luego hacer type guards
- **Strict mode** – `tsconfig.json` tiene `strict: true`, respetarlo
- **Path aliases** – Usar `@/*` para imports absolutos desde root

### Component Patterns

#### Ejemplo correcto de componente:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@/i18n';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export function Button({ 
  children, 
  variant = 'primary', 
  onPress, 
  disabled = false,
  testID 
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, styles[variant], disabled && styles.disabled]}
      testID={testID}
    >
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
  },
  primary: {
    backgroundColor: '#10B981',
  },
  secondary: {
    backgroundColor: '#6B7280',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
```

### Naming Conventions

- **Components** – PascalCase: `UserProfile.tsx`, `LoginForm.tsx`
- **Hooks** – camelCase con prefijo `use`: `useAuth.ts`, `useDebounce.ts`
- **Utils/Services** – camelCase: `authMapping.ts`, `userStorage.ts`
- **Constants** – UPPER_SNAKE_CASE: `API_BASE`, `MAX_RETRIES`
- **Types/Interfaces** – PascalCase: `User`, `AuthContextType`
- **Files** – kebab-case o camelCase según contexto (mantener consistencia)

### React Native Specific

- **StyleSheet.create** – Usar StyleSheet.create para estilos, no objetos inline para performance
- **Platform-specific code** – Usar `Platform.OS === 'ios'` o `Platform.select()` cuando sea necesario
- **SafeAreaView** – Usar `react-native-safe-area-context` para manejar safe areas
- **Keyboard handling** – Usar `KeyboardAvoidingView` cuando sea necesario
- **Accessibility** – Incluir `accessibilityLabel`, `accessibilityHint` cuando sea relevante

### API Service Pattern

```typescript
// services/example.ts
import { API_BASE } from './auth';
import { ApiError } from './auth';
import { t } from '@/i18n';

export interface ExampleResponse {
  data: string;
}

export const fetchExample = async (): Promise<ExampleResponse> => {
  try {
    const response = await fetch(`${API_BASE}/example`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new ApiError(
        t('errors.requestFailed'),
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      t('errors.networkError'),
      0,
      error
    );
  }
};
```

### Internationalization Pattern

```typescript
// Siempre usar t() para textos visibles al usuario
import { t } from '@/i18n';

// En componentes
<Text>{t('auth.login.title')}</Text>
<Text>{t('auth.login.subtitle', { name: user.firstName })}</Text>

// En errores
throw new Error(t('errors.invalidCredentials'));
```

⸻

## 🧪 Testing Strategy

### Test-Driven Development (TDD)

1. **Red** – Escribe un test que falle
2. **Green** – Implementa el código mínimo para pasar
3. **Refactor** – Mejora el código manteniendo tests verdes

### AAA Pattern

- **Arrange** – Configurar el estado inicial y dependencias
- **Act** – Ejecutar la acción a testear
- **Assert** – Verificar el resultado esperado

### Testing Priorities

1. **Utils y servicios** – Lógica de negocio y funciones puras
2. **Hooks personalizados** – Lógica reutilizable
3. **Componentes críticos** – Componentes de autenticación, formularios
4. **Integración** – Flujos completos de usuario

### Testing Tools (Recomendado)

- Jest para unit tests
- React Native Testing Library para componentes
- Detox para E2E tests (opcional)

⸻

## 🧱 Git Workflow & Repository Rules

### Branch Strategy

- **main** – Production ready, código estable y probado
- **develop** – Integration branch para features completadas
- **feature/TICKET-123-description** – Nuevas funcionalidades
- **hotfix/TICKET-456-description** – Correcciones urgentes en producción
- **bugfix/TICKET-789-description** – Correcciones de bugs

### Conventional Commits

Usar formato Conventional Commits para mensajes claros y automatización:

```
feat(auth): add Google Sign-In integration
fix(api): handle null user response gracefully
docs(readme): update installation steps
refactor(components): extract Button component
test(utils): add tests for authMapping
chore(deps): update Expo SDK to 54.0.0
perf(lists): replace FlatList with FlashList
style(theme): update color palette
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Documentación
- `style`: Formato (no afecta código)
- `refactor`: Refactorización
- `perf`: Mejora de performance
- `test`: Tests
- `chore`: Tareas de mantenimiento

⸻

## 🛠️ Comandos Importantes

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm start                    # Expo dev server
npm run android             # Ejecutar en Android
npm run ios                 # Ejecutar en iOS
npm run web                 # Ejecutar en web

# Linting
npm run lint                # Ejecutar ESLint
```

### Build

```bash
# Build para producción (usar EAS Build)
eas build --platform android
eas build --platform ios
```

### Utilidades

```bash
# Resetear proyecto (mover código inicial a app-example)
npm run reset-project
```

### Expo CLI

```bash
# Previsualizar en Expo Go
npx expo start

# Limpiar cache
npx expo start --clear

# Generar tipos de rutas
npx expo customize tsconfig.json
```

⸻

## 🔌 Auto Port Detection (CRÍTICO para desarrollo)

### Expo Development Server

El servidor de desarrollo de Expo detecta automáticamente puertos disponibles:

```bash
npm start
# Auto-detecta puertos 8081, 8082, etc.
```

### Android Emulator

Para desarrollo en Android emulator, el código ya maneja automáticamente la conversión de `localhost` a `10.0.2.2`:

```typescript
// Ya implementado en services/auth.ts
if (Platform.OS === 'android' && /localhost/i.test(envUrl)) {
  return envUrl.replace(/localhost/gi, '10.0.2.2');
}
```

### Variables de Entorno

Usar `EXPO_PUBLIC_API_URL` para configurar la URL de la API:

```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

⸻

## 🌐 Platform-Specific Considerations

### iOS

- Usar `react-native-safe-area-context` para manejar safe areas
- Configurar `bundleIdentifier` en `app.json`
- Manejar permisos en `Info.plist` cuando sea necesario

### Android

- Configurar `package` en `app.json`
- `edgeToEdgeEnabled: true` para Android moderno
- Manejar permisos en `AndroidManifest.xml`
- Usar `10.0.2.2` para localhost en emulador

### Web

- `output: "static"` para export estático
- Verificar compatibilidad de componentes React Native Web
- Usar `react-native-web` para componentes compatibles

⸻

## 📚 Referencias & Context

### Documentación Oficial

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

### Backend & API

- **Backend Repository**: https://github.com/Mordobo/backend-api
- **Backend Path Local**: `/Users/angelorivas/Desktop/Proyectos_Personales/Mordobo/API`
- **API Documentation**: `../API/BRUNO_API_DOCUMENTATION.md`
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

### Autenticación

- [Google Sign-In Setup](https://docs.expo.dev/guides/authentication/#google)
- [React Native Keychain](https://github.com/oblador/react-native-keychain)
- [JWT.io](https://jwt.io/) - Para debuggear tokens JWT

### Internacionalización

- [i18n-js Documentation](https://github.com/fnando/i18n-js)

### Performance

- [Flash List Documentation](https://shopify.github.io/flash-list/)
- [React Native Performance](https://reactnative.dev/docs/performance)

### Documentación Interna del Proyecto

- `CONFIGURACION_ACCESO_API.md` - Guía de configuración de acceso a APIs
- `LOGIN_SETUP.md` - Setup de autenticación
- `../API/README.md` - Setup del backend
- `../API/BRUNO_API_DOCUMENTATION.md` - Documentación completa de endpoints

⸻

## 🚀 Pre-Development Validation Protocol

Antes de iniciar cualquier desarrollo, seguir este protocolo:

### 1. Validar Arquitectura Afectada

- Identificar qué partes del código se verán afectadas
- **Verificar si requiere cambios en backend** – ¿Necesita nuevos endpoints o modificaciones?
- Verificar dependencias entre módulos
- Revisar estructura de carpetas y ubicación correcta de archivos
- Si afecta backend, revisar estructura en `/Users/angelorivas/Desktop/Proyectos_Personales/Mordobo/API`

### 2. Confirmar Dependencias Necesarias

- Verificar si se necesitan nuevas dependencias en `package.json` (mobile)
- **Si requiere backend**: Verificar dependencias en `../API/package.json`
- Revisar compatibilidad con versión actual de Expo SDK
- Considerar impacto en tamaño del bundle

### 3. Revisar Reglas de Seguridad

- Verificar manejo de datos sensibles
- Confirmar uso de almacenamiento seguro (Keychain vs AsyncStorage)
- Validar que no se expongan secrets en código
- **Si afecta backend**: Verificar rate limiting, validación de inputs, sanitización

### 4. Alinear Comportamiento con CLAUDE.md

- Revisar principios de desarrollo (KISS, YAGNI, DRY)
- Verificar convenciones de código y naming
- Confirmar estructura de archivos y organización
- **Si afecta backend**: Asegurar que sigue convenciones del backend también

### 5. Definir Pasos de Implementación

- Crear lista de tareas específicas
- **Si requiere backend**: Definir orden (backend primero recomendado)
- Identificar orden de implementación
- Considerar impacto en otras features
- Planificar sincronización de tipos entre frontend y backend

### 6. Solicitar Implementation Plan

- Pedir a Claude un plan de implementación basado en estos pasos
- **Si afecta ambos proyectos**: Incluir pasos para backend y frontend
- Revisar el plan antes de comenzar
- Validar que el plan sigue todas las convenciones

### Checklist Pre-Desarrollo

- [ ] Arquitectura validada
- [ ] **Backend impactado identificado** (si aplica)
- [ ] Dependencias confirmadas (mobile y backend si aplica)
- [ ] Seguridad revisada
- [ ] Convenciones alineadas
- [ ] Pasos definidos (incluyendo orden backend/frontend)
- [ ] Plan de implementación aprobado
- [ ] **Tipos sincronizados** (si hay cambios en API)

⸻

## 🎯 Feature Development Guidelines

### Al Crear una Nueva Feature

1. **Identificar ubicación** – ¿Va en `app/`, `components/`, `services/`, etc.?
2. **Verificar si requiere backend** – ¿Necesita nuevos endpoints o modificaciones en API?
3. **Si requiere backend**: 
   - Implementar endpoint primero en `../API/src/routes/`
   - Probar con Bruno/Postman
   - Documentar en `../API/BRUNO_API_DOCUMENTATION.md`
   - Definir tipos de request/response
4. **Crear estructura** – Si es una feature compleja, considerar estructura feature-first
5. **Tipos primero** – Definir interfaces y types antes de implementar (sincronizar con backend si aplica)
6. **Internacionalización** – Agregar traducciones necesarias en `i18n/locales/`
7. **Error handling** – Implementar manejo de errores desde el inicio
8. **Testing** – Escribir tests para lógica crítica
9. **Sincronizar tipos** – Asegurar que tipos del frontend coincidan con respuestas del backend

### Al Modificar Features Existentes

1. **Entender el código existente** – Leer código relacionado primero
2. **Verificar impacto en backend** – ¿El cambio requiere modificar endpoints existentes?
3. **Mantener consistencia** – Seguir patrones establecidos
4. **No romper APIs** – Mantener compatibilidad con código existente
   - Si se cambia API, usar versionado o mantener backward compatibility
5. **Actualizar tipos** – Asegurar que tipos reflejen cambios (en ambos proyectos si aplica)
6. **Actualizar traducciones** – Si se agregan nuevos textos
7. **Actualizar documentación** – Si hay cambios en API, actualizar `BRUNO_API_DOCUMENTATION.md`

### Features que Requieren Backend

Cuando una feature necesita cambios en el backend:

**Orden de Implementación Recomendado:**

1. **Backend (API)**
   - Crear/modificar endpoint en `../API/src/routes/`
   - Implementar validación con Zod
   - Agregar manejo de errores
   - Probar endpoint con Bruno/Postman
   - Documentar en `BRUNO_API_DOCUMENTATION.md`

2. **Tipos TypeScript**
   - Definir tipos de request/response en backend
   - Crear tipos equivalentes en frontend (`services/` o `types/`)
   - Crear funciones de mapeo si hay diferencias (snake_case → camelCase)

3. **Frontend (Mobile)**
   - Crear función de servicio en `services/`
   - Implementar llamada al endpoint
   - Manejar estados de carga y error
   - Actualizar componentes que consumen el servicio
   - Agregar traducciones si hay mensajes nuevos

4. **Testing End-to-End**
   - Probar flujo completo desde mobile
   - Verificar manejo de errores
   - Confirmar sincronización de tipos

⸻

## 🐛 Debugging Guidelines

### Logging

- Usar `console.log` para desarrollo, pero nunca loggear datos sensibles
- Usar prefijos consistentes: `[Auth]`, `[API]`, `[Storage]`
- Remover logs de debug antes de commits importantes

### React Native Debugger

- Usar React Native Debugger para debugging avanzado
- Habilitar Redux DevTools para Zustand (si se configura)

### Expo Dev Tools

- Usar Expo Dev Tools para inspeccionar bundle
- Verificar errores en Metro bundler
- Usar `npx expo start --clear` si hay problemas de cache

⸻

## 📱 Mobile-Specific Best Practices

### Performance Mobile

- Minimizar re-renders en listas largas
- Usar imágenes optimizadas y apropiadas para densidad de pantalla
- Implementar lazy loading para pantallas y componentes pesados
- Evitar operaciones síncronas pesadas en el hilo principal

### UX Mobile

- Implementar feedback háptico con `expo-haptics` cuando sea apropiado
- Manejar estados de carga y error gracefully
- Implementar pull-to-refresh donde sea relevante
- Considerar gestos nativos (swipe, long press)

### Offline Support

- Cachear datos críticos localmente
- Mostrar estado offline cuando no hay conexión
- Sincronizar datos cuando la conexión se restablece

⸻

---

**Fin de CLAUDE.md**

Este documento debe ser consultado y actualizado regularmente para mantener la calidad y consistencia del código.

