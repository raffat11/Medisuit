/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. SOLUCIÓN AL ERROR DE TERMINAL (allowedDevOrigins en la raíz)
  // Nota: Esto arregla el bloqueo de actualizaciones en vivo.
  allowedDevOrigins: [
    'localhost:3000',
    '3000-firebase-studio-1759136298722.cluster-beimwvuktjcu6sechxlysokr36.cloudworkstations.dev'
  ],

  // 2. SOLUCIÓN PARA BOTONES Y ACCIONES (Server Actions)
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '3000-firebase-studio-1759136298722.cluster-beimwvuktjcu6sechxlysokr36.cloudworkstations.dev'
      ]
    }
  },

  // 3. VIGILANCIA DE CAMBIOS
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    return config
  },

  // 4. IMÁGENES
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

// Fíjate que aquí usamos "export default" en lugar de "module.exports"
export default nextConfig;