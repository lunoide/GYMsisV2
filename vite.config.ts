import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Optimizaciones de build para producción
  build: {
    // Minificación optimizada
    minify: 'terser',
    
    // Source maps para debugging en producción (opcional)
    sourcemap: false,
    
    // Optimización de chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendor libraries
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          ui: ['lucide-react'],
          router: ['react-router-dom']
        }
      }
    },
    
    // Configuración de assets
    assetsDir: 'assets',
    
    // Límite de tamaño para warnings
    chunkSizeWarningLimit: 1000,
    
    // Optimización de CSS
    cssCodeSplit: true
  },
  
  // Configuración del servidor de desarrollo
  server: {
    port: 3000,
    host: true, // Para acceso desde red local
    open: false
  },
  
  // Preview server (para testing de build)
  preview: {
    port: 4173,
    host: true
  },
  
  // Optimización de dependencias
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore'
    ]
  },
  
  // Variables de entorno
  envPrefix: 'VITE_',
  
  // Configuración específica para Vercel
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})
