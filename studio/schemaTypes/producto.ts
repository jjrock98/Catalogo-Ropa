import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'producto',
  type: 'document',
  title: 'Productos de Ropa',
  fields: [
    defineField({ name: 'name', type: 'string', title: 'Nombre de la prenda' }),
    defineField({ name: 'description', type: 'text', title: 'Descripción del producto' }), // <-- Nuevo campo
    defineField({ name: 'price', type: 'number', title: 'Precio' }),
    defineField({ name: 'stock', type: 'number', title: 'Stock disponible' }),
    defineField({ name: 'category', type: 'string', title: 'Categoría' }),
    defineField({ name: 'image', type: 'image', title: 'Foto de la prenda', options: { hotspot: true } }),
    defineField({
      name: 'colors', // <-- Nuevo campo
      type: 'array',
      title: 'Colores disponibles',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Negro', value: '#000000' },
          { title: 'Blanco', value: '#ffffff' },
          { title: 'Gris', value: '#6b7280' },
          { title: 'Rojo', value: '#ef4444' },
          { title: 'Azul', value: '#3b82f6' },
          { title: 'Verde', value: '#22c55e' },
          { title: 'Beige', value: '#f5f5dc' },
          { title: 'Rosa', value: '#ec4899'},
          { title: 'Violeta', value: '#8b5cf6'},
          { title: 'Morado', value: '#7c3aed'},
          { title: 'Naranja', value: '#f97316'},
          { title: 'Caqui', value: '#c3b091'},
          { title: 'Marrón', value: '#78350f'}
        ]
      }
    })
  ]
})

