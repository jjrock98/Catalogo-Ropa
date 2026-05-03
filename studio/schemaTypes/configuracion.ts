import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'configuracion',
  type: 'document',
  title: 'Ajustes de la Tienda',
  fields: [
    defineField({ name: 'telefono', type: 'string', title: 'Número de WhatsApp' }),
    defineField({ name: 'aliasMP', type: 'string', title: 'Alias de Mercado Pago' }),
  ]
})
