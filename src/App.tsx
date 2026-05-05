import { createClient } from '@sanity/client';
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';

// --- CONFIGURACIÓN DE SANITY ---
const client = createClient({
  projectId: 'hwujeebe',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2026-05-03',
});

// --- INTERFACES ---
interface Producto {
  id: string;
  nombre: string;
  descripcion?: string; // Nuevo campo
  colores?: string[]; // Nuevo campo
  stock: number;
  imagen: string;
  precio: number;
  categoria: string;
}

interface ItemCarrito extends Producto {
  cantidad: number;
}

interface ConfiguracionTienda {
  telefono: string;
  aliasMP: string;
}

function App() {
  // --- ESTADOS ---
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todas');
  
  // Estado para la configuración dinámica de Sanity
  const [configTienda, setConfigTienda] = useState<ConfiguracionTienda>({
    telefono: "5491122334455", // Valores por defecto por si falla
    aliasMP: "claros.javier"
  });

  // --- CONEXIÓN REAL A SANITY ---
  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        // 1. Traemos la configuración (Teléfono y Alias)
        const configData = await client.fetch(`*[_type == "configuracion"][0]{
          telefono,
          aliasMP
        }`);
        
        if (configData) {
          setConfigTienda({
            telefono: configData.telefono || "5491122334455",
            aliasMP: configData.aliasMP || "claros.javier"
          });
        }

        // 2. Traemos los productos actualizados
        const dataProductos = await client.fetch(`*[_type == "producto"]{
          "id": _id,
          "nombre": name,
          "descripcion":description,
          "colores": colors,
          "stock": stock,
          "precio": price,
          "categoria": category,
          "imagen": image.asset->url
        }`);
        
        setProductos(dataProductos);
      } catch (error) {
        console.error("Error al traer datos de Sanity:", error);
      } finally {
        setCargando(false);
      }
    };
    obtenerDatos();
  }, []);

  // --- LÓGICA DEL CARRITO ---
  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((carritoActual) => {
      const itemExiste = carritoActual.find(item => item.id === producto.id);

      if (itemExiste) {
        if (itemExiste.cantidad < producto.stock) {
          toast.success(`Sumaste otro/a ${producto.nombre}`);
          return carritoActual.map(item =>
            item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
          );
        }
        toast.error("No hay más stock disponible");
        return carritoActual;
      } else {
        toast.success(`${producto.nombre} agregado al carrito`);
        return [...carritoActual, { ...producto, cantidad: 1 }];
      }
    });
  };

  const restarDelCarrito = (id: string) => {
    setCarrito((carritoActual) => {
      const itemExiste = carritoActual.find(item => item.id === id);
      
      if (itemExiste?.cantidad === 1) {
        toast.info("Producto eliminado del carrito");
        return carritoActual.filter(item => item.id !== id);
      } else {
        return carritoActual.map(item =>
          item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item
        );
      }
    });
  };

  const enviarPedidoWhatsApp = () => {
    if (carrito.length === 0) return;

    let texto = "Hola! Quiero realizar el siguiente pedido:%0A%0A";
    let total = 0;

    carrito.forEach(item => {
      const subtotal = item.precio * item.cantidad;
      texto += `- ${item.cantidad}x ${item.nombre} ($${subtotal})%0A`;
      total += subtotal;
    });

    texto += `%0A*Total a abonar: $${total}*%0A%0A`;
    texto += `💳 *Datos para transferencia (Mercado Pago):*%0AAlias: ${configTienda.aliasMP}%0A%0AAguardo confirmación para enviar el comprobante.`;

    window.open(`https://wa.me/${configTienda.telefono}?text=${texto}`, '_blank');
  };

  // --- LÓGICA DE FILTROS ---
  const categoriasUnicas = ['Todas', ...Array.from(new Set(productos.map(p => p.categoria)))].filter(Boolean);

  const productosMostrados = categoriaActiva === 'Todas'
    ? productos
    : productos.filter(p => p.categoria === categoriaActiva);

  // --- RENDERIZADO ---
  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center text-2xl font-bold bg-gray-100">Cargando catálogo...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col lg:flex-row gap-6">
      <Toaster position="bottom-right" richColors />

      {/* SECCIÓN PRINCIPAL: PRODUCTOS */}
      <div className="w-full lg:w-3/4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Claros Importados</h1>
        
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categoriasUnicas.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className={`px-4 py-2 rounded-full font-semibold transition whitespace-nowrap ${
                categoriaActiva === cat
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-200 shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productosMostrados.map((prod) => (
            <div key={prod.id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
              {prod.imagen && <img src={prod.imagen} alt={prod.nombre} className="w-full h-64 object-cover" />}
              
              <div className="p-4 flex flex-col flex-grow text-center">
                <span className="text-xs uppercase tracking-wider text-gray-400 mb-1">{prod.categoria}</span>
                <h2 className="text-xl font-bold text-gray-700">{prod.nombre}</h2>
                
                {/* Descripción del producto */}
                {prod.descripcion && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-3 text-left">
                    {prod.descripcion}
                  </p>
                )}

                {/* Puntitos de colores */}
                {prod.colores && prod.colores.length > 0 && (
                  <div className="flex justify-center gap-2 mt-3">
                    {prod.colores.map((colorHex, idx) => (
                      <div 
                        key={idx} 
                        className="w-5 h-5 rounded-full border border-gray-300 shadow-sm"
                        style={{ backgroundColor: colorHex }}
                        title="Color disponible"
                      />
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-4">
                  <p className="text-lg text-green-600 font-bold">${prod.precio}</p>
                  <p className="text-sm text-gray-500">Stock: {prod.stock}</p>
                  
                  <button
                    onClick={() => agregarAlCarrito(prod)}
                    disabled={prod.stock === 0}
                    className={`mt-4 font-bold py-2 px-4 rounded-lg transition duration-300 w-full ${
                      prod.stock === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {prod.stock === 0 ? 'Sin Stock' : 'Agregar al carrito'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {productosMostrados.length === 0 && (
          <p className="text-center text-gray-500 mt-10">No hay productos publicados todavía.</p>
        )}
      </div>

      {/* SECCIÓN LATERAL: CARRITO */}
      <div className="w-full lg:w-1/4">
        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2">Tu Pedido</h2>
          
          {carrito.length === 0 ? (
            <p className="text-gray-500 text-center my-8">El carrito está vacío</p>
          ) : (
            <div className="flex flex-col gap-4">
              {carrito.map(item => (
                <div key={item.id} className="flex flex-col gap-2 border-b pb-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{item.nombre}</span>
                    <span className="font-bold">${item.precio * item.cantidad}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => restarDelCarrito(item.id)}
                      className="bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded font-bold"
                    >
                      -
                    </button>
                    <span>{item.cantidad}</span>
                    <button
                      onClick={() => agregarAlCarrito(item)}
                      className="bg-green-100 text-green-600 hover:bg-green-200 px-2 py-1 rounded font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="mt-2 pt-2 flex justify-between items-center font-bold text-lg">
                <span>Total:</span>
                <span>${carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)}</span>
              </div>

              {/* Muestra del Alias de Mercado Pago */}
              <div className="mt-4 bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                <p className="text-xs text-blue-800 font-semibold uppercase tracking-wide">Alias Mercado Pago</p>
                <p className="text-md font-bold text-blue-900 mt-1">{configTienda.aliasMP}</p>
                <p className="text-xs text-blue-600 mt-1">Transfiere de forma segura</p>
              </div>

              <button
                onClick={enviarPedidoWhatsApp}
                className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg w-full flex justify-center items-center gap-2"
              >
                Cerrar pedido por WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default App;