import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'configuracion',
  type: 'document',
  title: 'Configuración de la Tienda',
  fields: [
    defineField({ name: 'telefono', type: 'string', title: 'Teléfono WhatsApp' }),
    defineField({ name: 'aliasMP', type: 'string', title: 'Alias Mercado Pago' }),
    // --- NUEVOS CAMPOS ---
    defineField({ 
      name: 'direccion', 
      type: 'string', 
      title: 'Dirección física',
      description: 'Ej: Av. General Paz 1234, CABA'
    }),
    defineField({ 
      name: 'descripcionUbicacion', 
      type: 'text', 
      title: 'Referencia de la ubicación',
      description: 'Indicaciones adicionales para llegar.'
    }),
    defineField({ 
      name: 'mapaIframe', 
      type: 'text', 
      title: 'Código Iframe de Google Maps',
      description: 'Pega aquí el código <iframe...> que te da Google Maps al "Compartir > Insertar un mapa".'
    })
  ]
})

