import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'producto',
  type: 'document',
  title: 'Productos de Ropa',
  fields: [
    defineField({ name: 'name', type: 'string', title: 'Nombre de la prenda' }),
    defineField({ name: 'description', type: 'text', title: 'Descripción del producto' }),
    
    // --- NUEVOS CAMPOS DE PRECIO ---
    defineField({ name: 'precioMediaDocena', type: 'number', title: 'Precio por Media Docena' }),
    defineField({ name: 'precioDocena', type: 'number', title: 'Precio por Docena' }),
    
    // --- NUEVOS CAMPOS DE STOCK ---
    defineField({
      name: 'tipoStock',
      type: 'string',
      title: 'Tipo de Disponibilidad',
      options: {
        list: [
          { title: 'A Pedido (Sin límite de stock)', value: 'a_pedido' },
          { title: 'Stock Numérico (Cantidad de unidades)', value: 'con_stock' }
        ],
        layout: 'radio'
      },
      initialValue: 'con_stock'
    }),
    defineField({ 
      name: 'cantidadStock', 
      type: 'number', 
      title: 'Unidades en Stock',
      description: 'Ingresa la cantidad de UNIDADES individuales (Ej: 24 unidades = 2 docenas).',
      hidden: ({ document }) => document?.tipoStock === 'a_pedido' // Se oculta si es a pedido
    }),

    defineField({ name: 'category', type: 'string', title: 'Categoría' }),
    
    defineField({
      name: 'imagenes',
      type: 'array',
      title: 'Fotos de la prenda(Hasta 4)',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: (Rule) => Rule.max(4).warning('Solo podés subir hasta 4 imágenes')
    }),
    
    defineField({
      name: 'colors',
      type: 'array',
      title: 'Colores disponibles',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Negro', value: '#000000' }, { title: 'Blanco', value: '#ffffff' },
          { title: 'Gris', value: '#6b7280' }, { title: 'Rojo', value: '#ef4444' },
          { title: 'Azul', value: '#3b82f6' }, { title: 'Verde', value: '#22c55e' },
          { title: 'Beige', value: '#f5f5dc' }, { title: 'Rosa', value: '#ec4899'},
          { title: 'Violeta', value: '#8b5cf6'}, { title: 'Morado', value: '#7c3aed'},
          { title: 'Naranja', value: '#f97316'}, { title: 'Caqui', value: '#c3b091'},
          { title: 'Marrón', value: '#78350f'}
        ]
      }
    })
  ]
})


