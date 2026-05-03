import { defineType, defineField } from 'sanity'

const producto = defineType({
  name: 'producto',
  type: 'document',
  title: 'Productos de Ropa',
  fields: [
    defineField({ name: 'nombre', type: 'string', title: 'Nombre de la prenda' }),
    defineField({ name: 'precio', type: 'number', title: 'Precio' }),
    defineField({ name: 'stock', type: 'number', title: 'Stock disponible' }),
    defineField({ name: 'categoria', type: 'string', title: 'Categoría' }),
    defineField({ name: 'imagen', type: 'image', title: 'Foto de la prenda', options: { hotspot: true } }),
  ]
})

export default producto // Exportación simple al final
