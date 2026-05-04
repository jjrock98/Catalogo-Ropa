import { defineType, defineField } from 'sanity'

const producto = defineType({
  name: 'product',
  type: 'document',
  title: 'Productos de Ropa',
  fields: [
    defineField({ name: 'name', type: 'string', title: 'Nombre de la prenda' }),
    defineField({ name: 'price', type: 'number', title: 'Precio' }),
    defineField({ name: 'stock', type: 'number', title: 'Stock disponible' }),
    defineField({ name: 'category', type: 'string', title: 'Categoría' }),
    defineField({ name: 'image', type: 'image', title: 'Foto de la prenda', options: { hotspot: true } }),
  ]
})

export default producto // Exportación simple al final
