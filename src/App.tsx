import { createClient } from '@sanity/client';
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';

// --- CONFIGURACIÓN DE SANITY ---
const client = createClient({
  projectId: 'hwujeebe', // <-- Tu Project ID
  dataset: 'production',
  useCdn: false,
  apiVersion: '2026-05-03',
});

// --- INTERFACES ---
interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  colores?: string[];
  tipoStock: 'a_pedido' | 'con_stock';
  cantidadStock?: number;
  precioMediaDocena: number;
  precioDocena: number;
  categoria: string;
  imagen: string;
}

interface ItemCarrito extends Producto {
  idCart: string; 
  tipoVenta: 'Media Docena' | 'Docena';
  cantidadPacks: number;
  precioAplicado: number; // Será 0 si es a pedido
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
  
  const [configTienda, setConfigTienda] = useState<ConfiguracionTienda>({
    telefono: "5491122334455",
    aliasMP: "claros.javier"
  });

  // --- CONEXIÓN A SANITY ---
  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const configData = await client.fetch(`*[_type == "configuracion"][0]{
          telefono, aliasMP
        }`);
        if (configData) {
          setConfigTienda({
            telefono: configData.telefono || "5491122334455",
            aliasMP: configData.aliasMP || "claros.javier"
          });
        }

        const dataProductos = await client.fetch(`*[_type == "producto"]{
          "id": _id,
          "nombre": name,
          "descripcion": description,
          "colores": colors,
          "tipoStock": tipoStock,
          "cantidadStock": cantidadStock,
          "precioMediaDocena": precioMediaDocena,
          "precioDocena": precioDocena,
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
  const agregarAlCarrito = (producto: Producto, tipoVenta: 'Media Docena' | 'Docena') => {
    const idCart = `${producto.id}-${tipoVenta}`;
    const unidadesPorPack = tipoVenta === 'Media Docena' ? 6 : 12;
    
    // Si es a pedido, el precio en el carrito es 0 (no se cobra ahora).
    const precioPack = producto.tipoStock === 'a_pedido' 
      ? 0 
      : (tipoVenta === 'Media Docena' ? producto.precioMediaDocena : producto.precioDocena);

    setCarrito((carritoActual) => {
      const unidadesYaEnCarrito = carritoActual
        .filter(item => item.id === producto.id)
        .reduce((acc, item) => acc + (item.tipoVenta === 'Media Docena' ? 6 : 12) * item.cantidadPacks, 0);

      // Verificación de stock físico (solo si no es a pedido)
      if (producto.tipoStock === 'con_stock') {
        const stockDisponible = producto.cantidadStock || 0;
        if (unidadesYaEnCarrito + unidadesPorPack > stockDisponible) {
          toast.error(`No hay suficiente stock físico para agregar otra ${tipoVenta}.`);
          return carritoActual; 
        }
      }

      const itemExiste = carritoActual.find(item => item.idCart === idCart);

      if (itemExiste) {
        toast.success(`Sumaste otra ${tipoVenta} de ${producto.nombre}`);
        return carritoActual.map(item =>
          item.idCart === idCart ? { ...item, cantidadPacks: item.cantidadPacks + 1 } : item
        );
      } else {
        const mensajeToast = producto.tipoStock === 'a_pedido' 
          ? `Encargo añadido: ${tipoVenta} de ${producto.nombre}`
          : `${tipoVenta} de ${producto.nombre} agregada`;
          
        toast.success(mensajeToast);
        return [...carritoActual, { 
          ...producto, 
          idCart, 
          tipoVenta, 
          cantidadPacks: 1, 
          precioAplicado: precioPack 
        }];
      }
    });
  };

  const restarDelCarrito = (idCart: string) => {
    setCarrito((carritoActual) => {
      const itemExiste = carritoActual.find(item => item.idCart === idCart);
      
      if (itemExiste?.cantidadPacks === 1) {
        toast.info("Item eliminado del carrito");
        return carritoActual.filter(item => item.idCart !== idCart);
      } else {
        return carritoActual.map(item =>
          item.idCart === idCart ? { ...item, cantidadPacks: item.cantidadPacks - 1 } : item
        );
      }
    });
  };

  const enviarPedidoWhatsApp = () => {
  if (carrito.length === 0) {
    toast.error("El carrito está vacío");
    return;
  }

  // 1. Iniciamos el mensaje con texto plano y saltos de línea estándar
  let mensaje = "Hola! Quiero realizar el siguiente pedido:\n\n";

  // 2. Filtramos los grupos
  const conStock = carrito.filter(item => item.tipoStock === 'con_stock');
  const aPedido = carrito.filter(item => item.tipoStock === 'a_pedido');

  // 3. Procesamos productos con STOCK
  if (conStock.length > 0) {
    mensaje += "✅ PRODUCTOS EN STOCK:\n";
    let subtotalStock = 0;
    
    conStock.forEach(item => {
      const precioTotalItem = item.precioAplicado * item.cantidadPacks;
      mensaje += `- ${item.cantidadPacks}x ${item.tipoVenta} de ${item.nombre} ($${precioTotalItem})\n`;
      subtotalStock += precioTotalItem;
    });
    
    mensaje += `TOTAL STOCK: $${subtotalStock}\n`;
    mensaje += `Alias MP: ${configTienda.aliasMP}\n\n`;
  }

  // 4. Procesamos productos A PEDIDO (Los que te están fallando)
  if (aPedido.length > 0) {
    mensaje += "📦 ENCARGOS A PEDIDO:\n";
    
    aPedido.forEach(item => {
      // Usamos trim() para limpiar el nombre por si trae caracteres extraños de Sanity
      const nombreLimpio = item.nombre ? item.nombre.trim() : "Producto sin nombre";
      mensaje += `- ${item.cantidadPacks}x ${item.tipoVenta} de ${nombreLimpio}\n`;
    });
    
    mensaje += "\nAguardo confirmación para coordinar el pago de los encargos.";
  }

  // 5. LA PARTE CRÍTICA: La codificación
  // Eliminamos emojis conflictivos en la URL si fuera necesario, 
  // pero encodeURIComponent debería manejarlos. 
  const urlFinal = `https://wa.me/${configTienda.telefono}?text=${encodeURIComponent(mensaje)}`;

  // Abrimos la ventana
  window.open(urlFinal, '_blank');
};




  // --- LÓGICA DE FILTROS ---
  const categoriasUnicas = ['Todas', ...Array.from(new Set(productos.map(p => p.categoria)))].filter(Boolean);
  const productosMostrados = categoriaActiva === 'Todas'
    ? productos : productos.filter(p => p.categoria === categoriaActiva);

  // --- RENDERIZADO ---
  if (cargando) return <div className="min-h-screen flex items-center justify-center text-2xl font-bold bg-gray-100">Cargando catálogo...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col lg:flex-row gap-6">
      <Toaster position="bottom-right" richColors />

      {/* SECCIÓN PRINCIPAL: PRODUCTOS */}
      <div className="w-full lg:w-3/4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Claros Importados - Mayorista</h1>
        
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categoriasUnicas.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className={`px-4 py-2 rounded-full font-semibold transition whitespace-nowrap ${
                categoriaActiva === cat ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-200 shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productosMostrados.map((prod) => {
            const stockActual = prod.tipoStock === 'a_pedido' ? Infinity : (prod.cantidadStock || 0);
            
            return (
              <div key={prod.id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
                {prod.imagen && <img src={prod.imagen} alt={prod.nombre} className="w-full h-64 object-cover" />}
                
                <div className="p-4 flex flex-col flex-grow text-center">
                  <span className="text-xs uppercase tracking-wider text-gray-400 mb-1">{prod.categoria}</span>
                  <h2 className="text-xl font-bold text-gray-700">{prod.nombre}</h2>
                  
                  {prod.descripcion && <p className="text-sm text-gray-500 mt-2 line-clamp-3 text-left">{prod.descripcion}</p>}

                  {prod.colores && prod.colores.length > 0 && (
                    <div className="flex justify-center gap-2 mt-3">
                      {prod.colores.map((colorHex, idx) => (
                        <div key={idx} className="w-5 h-5 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: colorHex }} title="Color disponible" />
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t flex flex-col gap-2">
                    {/* Botones condicionales según si es a pedido o con stock */}
                    {prod.tipoStock === 'con_stock' ? (
                      <>
                        <div className="text-sm font-semibold mb-2 text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Stock Físico: {stockActual} unidades
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                          <div className="text-left">
                            <p className="text-xs text-gray-500">Media docena</p>
                            <p className="text-md text-green-600 font-bold">${prod.precioMediaDocena}</p>
                          </div>
                          <button
                            onClick={() => agregarAlCarrito(prod, 'Media Docena')}
                            disabled={stockActual < 6}
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-bold py-2 px-3 rounded transition"
                          >
                            + Media
                          </button>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                          <div className="text-left">
                            <p className="text-xs text-gray-500">Docena</p>
                            <p className="text-md text-green-600 font-bold">${prod.precioDocena}</p>
                          </div>
                          <button
                            onClick={() => agregarAlCarrito(prod, 'Docena')}
                            disabled={stockActual < 12}
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-bold py-2 px-3 rounded transition"
                          >
                            + Docena
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2 bg-purple-50 p-3 rounded-lg border border-purple-100">
                        <span className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-1">📦 Por Encargo</span>
                        <p className="text-xs text-purple-600 mb-2">Se coordina precio y entrega por WhatsApp</p>
                        
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={() => agregarAlCarrito(prod, 'Media Docena')}
                            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold py-2 px-1 rounded transition"
                          >
                            Encargar Media
                          </button>
                          <button
                            onClick={() => agregarAlCarrito(prod, 'Docena')}
                            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold py-2 px-1 rounded transition"
                          >
                            Encargar Docena
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
                <div key={item.idCart} className="flex flex-col gap-1 border-b pb-2 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold leading-tight">
                      {item.nombre} <br/> 
                      <span className="text-xs text-gray-500 font-normal">({item.tipoVenta})</span>
                      {item.tipoStock === 'a_pedido' && <span className="ml-1 text-[10px] bg-purple-100 text-purple-600 px-1 rounded">Encargo</span>}
                    </span>
                    <span className="font-bold">
                      {item.tipoStock === 'a_pedido' ? 'A coordinar' : `$${item.precioAplicado * item.cantidadPacks}`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => restarDelCarrito(item.idCart)} className="bg-red-100 text-red-600 px-2 py-1 rounded font-bold">-</button>
                    <span>{item.cantidadPacks}</span>
                    <button onClick={() => agregarAlCarrito(item, item.tipoVenta)} className="bg-green-100 text-green-600 px-2 py-1 rounded font-bold">+</button>
                  </div>
                </div>
              ))}
              
              <div className="mt-2 pt-2 flex justify-between items-center font-bold text-lg">
                <span>Total a pagar hoy:</span>
                <span>${carrito.reduce((acc, item) => acc + (item.precioAplicado * item.cantidadPacks), 0)}</span>
              </div>

              <button onClick={enviarPedidoWhatsApp} className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg w-full flex justify-center items-center gap-2">
                Enviar pedido por WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default App;