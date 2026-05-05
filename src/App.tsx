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
  descripcion?: string;
  colores?: string[];
  tipoStock: 'a_pedido' | 'con_stock';
  cantidadStock?: number;
  precioMediaDocena: number;
  precioDocena: number;
  categoria: string;
  imagenes?: string[]; // AHORA ES UN ARRAY DE STRINGS
}

interface ItemCarrito extends Producto {
  idCart: string;
  tipoVenta: 'Media Docena' | 'Docena';
  cantidadPacks: number;
  precioAplicado: number;
}

interface ConfiguracionTienda {
  telefono: string;
  aliasMP: string;
}

function App() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todas');
  
  // --- NUEVOS ESTADOS ---
  const [modoOscuro, setModoOscuro] = useState<boolean>(false);
  const [productoAmpliando, setProductoAmpliando] = useState<Producto | null>(null);
  const [indiceImagenModal, setIndiceImagenModal] = useState<number>(0);

  const [configTienda, setConfigTienda] = useState<ConfiguracionTienda>({
    telefono: "5491122334455",
    aliasMP: "claros.javier"
  });

  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const configData = await client.fetch(`*[_type == "configuracion"][0]{telefono, aliasMP}`);
        if (configData) {
          setConfigTienda({
            telefono: configData.telefono || "5491122334455",
            aliasMP: configData.aliasMP || "claros.javier"
          });
        }

        // FETCH ACTUALIZADO PARA TRAER ARRAY DE IMAGENES
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
          "imagenes": imagenes[0].asset->url 
        }`);
        setProductos(dataProductos);
      } catch (error) {
        console.error("Error al traer datos:", error);
      } finally {
        setCargando(false);
      }
    };
    obtenerDatos();
  }, []);

  const agregarAlCarrito = (producto: Producto, tipoVenta: 'Media Docena' | 'Docena') => {
    const idCart = `${producto.id}-${tipoVenta}`;
    const unidadesPorPack = tipoVenta === 'Media Docena' ? 6 : 12;
    const precioPack = producto.tipoStock === 'a_pedido' ? 0 : (tipoVenta === 'Media Docena' ? producto.precioMediaDocena : producto.precioDocena);

    setCarrito((carritoActual) => {
      const unidadesYaEnCarrito = carritoActual
        .filter(item => item.id === producto.id)
        .reduce((acc, item) => acc + (item.tipoVenta === 'Media Docena' ? 6 : 12) * item.cantidadPacks, 0);

      if (producto.tipoStock === 'con_stock') {
        const stockDisponible = producto.cantidadStock || 0;
        if (unidadesYaEnCarrito + unidadesPorPack > stockDisponible) {
          toast.error(`No hay suficiente stock físico.`);
          return carritoActual;
        }
      }

      const itemExiste = carritoActual.find(item => item.idCart === idCart);
      if (itemExiste) {
        toast.success(`Sumaste otra ${tipoVenta}`);
        return carritoActual.map(item => item.idCart === idCart ? { ...item, cantidadPacks: item.cantidadPacks + 1 } : item);
      } else {
        toast.success(`Agregado al pedido`);
        return [...carritoActual, { ...producto, idCart, tipoVenta, cantidadPacks: 1, precioAplicado: precioPack }];
      }
    });
  };

  const restarDelCarrito = (idCart: string) => {
    setCarrito((carritoActual) => {
      const itemExiste = carritoActual.find(item => item.idCart === idCart);
      if (itemExiste?.cantidadPacks === 1) {
        return carritoActual.filter(item => item.idCart !== idCart);
      } else {
        return carritoActual.map(item => item.idCart === idCart ? { ...item, cantidadPacks: item.cantidadPacks - 1 } : item);
      }
    });
  };

  const enviarPedidoWhatsApp = () => {
    if (carrito.length === 0) return;

    let mensaje = "Hola! Quiero realizar el siguiente pedido:\n";
    const itemsStock = carrito.filter(item => item.tipoStock === 'con_stock');
    const itemsEncargo = carrito.filter(item => item.tipoStock === 'a_pedido');

    if (itemsStock.length > 0) {
      mensaje += "\n✅ PRODUCTOS EN STOCK:\n";
      let totalS = 0;
      itemsStock.forEach(item => {
        const sub = item.precioAplicado * item.cantidadPacks;
        mensaje += `- ${item.cantidadPacks}x ${item.tipoVenta} de ${item.nombre} ($${sub})\n`;
        totalS += sub;
      });
      mensaje += `TOTAL: $${totalS}\nAlias: ${configTienda.aliasMP}\n`;
    }

    if (itemsEncargo.length > 0) {
      mensaje += "\n📦 ENCARGOS POR PEDIDO:\n";
      itemsEncargo.forEach(item => {
        const nombrePrenda = item.nombre || "Prenda sin nombre";
        mensaje += `- ${item.cantidadPacks}x ${item.tipoVenta} de ${nombrePrenda.toUpperCase()}\n`;
      });
      mensaje += "\nAguardo confirmación para coordinar precio y entrega.";
    }

    const num = configTienda.telefono.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // --- LÓGICA DEL MODAL DE IMÁGENES ---
  const abrirModal = (producto: Producto) => {
    if (producto.imagenes && producto.imagenes.length > 0) {
      setProductoAmpliando(producto);
      setIndiceImagenModal(0);
    }
  };

  const cerrarModal = () => {
    setProductoAmpliando(null);
  };

  const imagenSiguiente = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (productoAmpliando?.imagenes) {
      setIndiceImagenModal((prev) => (prev + 1) % productoAmpliando.imagenes!.length);
    }
  };

  const imagenAnterior = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (productoAmpliando?.imagenes) {
      setIndiceImagenModal((prev) => (prev - 1 + productoAmpliando.imagenes!.length) % productoAmpliando.imagenes!.length);
    }
  };

  // --- RENDERIZADO ---
  if (cargando) return <div className="min-h-screen flex items-center justify-center text-2xl font-bold bg-gray-100">Cargando catálogo...</div>;

  const categoriasUnicas = ['Todas', ...Array.from(new Set(productos.map(p => p.categoria)))].filter(Boolean);
  const productosMostrados = categoriaActiva === 'Todas' ? productos : productos.filter(p => p.categoria === categoriaActiva);

  // CLASES DINÁMICAS PARA MODO OSCURO
  const themeBg = modoOscuro ? "bg-gray-900" : "bg-gray-100";
  const themeText = modoOscuro ? "text-gray-100" : "text-gray-800";
  const cardBg = modoOscuro ? "bg-gray-800 border-gray-700" : "bg-white";
  const cartBg = modoOscuro ? "bg-gray-800 border-gray-700 text-white" : "bg-white";

  return (
    <div className={`min-h-screen p-6 flex flex-col lg:flex-row gap-6 transition-colors duration-300 ${themeBg} ${themeText}`}>
      <Toaster position="bottom-right" richColors />

      {/* SECCIÓN PRINCIPAL: PRODUCTOS */}
      <div className="w-full lg:w-3/4">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Claros Importados - Mayorista</h1>
          
          {/* BOTÓN MODO OSCURO */}
          <button 
            onClick={() => setModoOscuro(!modoOscuro)} 
            className="p-2 rounded-full border-2 border-gray-400 hover:scale-110 transition"
            title="Cambiar Modo Día/Noche"
          >
            {modoOscuro ? '☀️ Día' : '🌙 Noche'}
          </button>
        </div>
        
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categoriasUnicas.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className={`px-4 py-2 rounded-full font-semibold transition whitespace-nowrap ${
                categoriaActiva === cat ? 'bg-blue-600 text-white' : (modoOscuro ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600 hover:bg-gray-200')
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
              <div key={prod.id} className={`rounded-xl shadow-lg overflow-hidden flex flex-col border ${cardBg}`}>
                
                {/* IMAGEN DEL PRODUCTO (CLICK PARA AMPLIAR) */}
                <div 
                  className="relative cursor-pointer group" 
                  onClick={() => abrirModal(prod)}
                >
                  {prod.imagenes && prod.imagenes.length > 0 ? (
                    <img src={prod.imagenes[0]} alt={prod.nombre} className="w-full h-64 object-cover group-hover:opacity-80 transition" />
                  ) : (
                    <div className="w-full h-64 bg-gray-300 flex items-center justify-center">Sin imagen</div>
                  )}
                  {prod.imagenes && prod.imagenes.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      1/{prod.imagenes.length} 🔍
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition flex items-center justify-center">
                     <span className="opacity-0 group-hover:opacity-100 text-white text-3xl drop-shadow-md">🔍</span>
                  </div>
                </div>
                
                <div className="p-4 flex flex-col flex-grow text-center">
                  <span className="text-xs uppercase tracking-wider text-gray-400 mb-1">{prod.categoria}</span>
                  <h2 className="text-xl font-bold">{prod.nombre}</h2>
                  
                  {prod.descripcion && <p className={`text-sm mt-2 line-clamp-3 text-left ${modoOscuro ? 'text-gray-400' : 'text-gray-500'}`}>{prod.descripcion}</p>}

                  {prod.colores && prod.colores.length > 0 && (
                    <div className="flex justify-center gap-2 mt-3">
                      {prod.colores.map((colorHex, idx) => (
                        <div key={idx} className="w-5 h-5 rounded-full border shadow-sm" style={{ backgroundColor: colorHex }} title="Color disponible" />
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t flex flex-col gap-2">
                    {prod.tipoStock === 'con_stock' ? (
                      <>
                        <div className="text-sm font-semibold mb-2 text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Stock Físico: {stockActual} unidades
                        </div>
                        <div className={`flex justify-between items-center p-2 rounded-lg ${modoOscuro ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className="text-left">
                            <p className="text-xs">Media docena</p>
                            <p className="text-md text-green-500 font-bold">${prod.precioMediaDocena}</p>
                          </div>
                          <button onClick={() => agregarAlCarrito(prod, 'Media Docena')} disabled={stockActual < 6} className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white text-sm font-bold py-2 px-3 rounded">
                            + Media
                          </button>
                        </div>
                        <div className={`flex justify-between items-center p-2 rounded-lg ${modoOscuro ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className="text-left">
                            <p className="text-xs">Docena</p>
                            <p className="text-md text-green-500 font-bold">${prod.precioDocena}</p>
                          </div>
                          <button onClick={() => agregarAlCarrito(prod, 'Docena')} disabled={stockActual < 12} className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white text-sm font-bold py-2 px-3 rounded">
                            + Docena
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2 p-3 rounded-lg border border-purple-300">
                        <span className="text-sm font-bold text-purple-500 uppercase tracking-wider mb-1">📦 Por Encargo</span>
                        <div className="flex gap-2 w-full">
                          <button onClick={() => agregarAlCarrito(prod, 'Media Docena')} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold py-2 px-1 rounded">
                            Encargar Media
                          </button>
                          <button onClick={() => agregarAlCarrito(prod, 'Docena')} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold py-2 px-1 rounded">
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
        <div className={`rounded-xl shadow-lg p-6 sticky top-6 border ${cartBg}`}>
          <h2 className="text-2xl font-bold mb-4 border-b pb-2">Tu Pedido</h2>
          
          {carrito.length === 0 ? (
            <p className="text-center my-8 opacity-60">El carrito está vacío</p>
          ) : (
            <div className="flex flex-col gap-4">
              {carrito.map(item => (
                <div key={item.idCart} className="flex flex-col gap-1 border-b border-gray-600 pb-2 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold leading-tight">
                      {item.nombre} <br/>
                      <span className="text-xs font-normal opacity-70">({item.tipoVenta})</span>
                    </span>
                    <span className="font-bold">
                      {item.tipoStock === 'a_pedido' ? 'A coordinar' : `$${item.precioAplicado * item.cantidadPacks}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => restarDelCarrito(item.idCart)} className="bg-red-500 text-white px-2 py-1 rounded font-bold">-</button>
                    <span>{item.cantidadPacks}</span>
                    <button onClick={() => agregarAlCarrito(item, item.tipoVenta)} className="bg-green-500 text-white px-2 py-1 rounded font-bold">+</button>
                  </div>
                </div>
              ))}
              
              <div className="mt-2 pt-2 flex justify-between items-center font-bold text-lg">
                <span>Total a pagar hoy:</span>
                <span className="text-green-500">${carrito.reduce((acc, item) => acc + (item.precioAplicado * item.cantidadPacks), 0)}</span>
              </div>

              <button onClick={enviarPedidoWhatsApp} className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg w-full flex justify-center items-center gap-2">
                Enviar pedido por WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL PARA AMPLIAR IMÁGENES --- */}
      {productoAmpliando && productoAmpliando.imagenes && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={cerrarModal}
        >
          <div className="relative max-w-4xl max-h-full flex flex-col items-center">
            
            {/* BOTÓN CERRAR */}
            <button 
              className="absolute -top-10 right-0 text-white text-3xl font-bold hover:text-gray-300"
              onClick={cerrarModal}
            >
              &times;
            </button>

            {/* IMAGEN AMPLIA */}
            <img 
              src={productoAmpliando.imagenes[indiceImagenModal]} 
              alt={productoAmpliando.nombre} 
              className="max-h-[80vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Evita que se cierre al hacer click en la foto
            />
            
            <p className="text-white mt-4 text-xl font-semibold">{productoAmpliando.nombre}</p>

            {/* CONTROLES CARRUSEL (Solo si hay más de 1 imagen) */}
            {productoAmpliando.imagenes.length > 1 && (
              <div className="absolute top-1/2 left-0 w-full flex justify-between px-4 -translate-y-1/2">
                <button 
                  onClick={imagenAnterior}
                  className="bg-black bg-opacity-50 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl hover:bg-opacity-80 transition transform -translate-x-6"
                >
                  &#10094;
                </button>
                <button 
                  onClick={imagenSiguiente}
                  className="bg-black bg-opacity-50 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl hover:bg-opacity-80 transition transform translate-x-6"
                >
                  &#10095;
                </button>
              </div>
            )}

            {/* INDICADORES DE FOTOS */}
            {productoAmpliando.imagenes.length > 1 && (
              <div className="flex gap-2 mt-4">
                {productoAmpliando.imagenes.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-2 w-8 rounded-full ${idx === indiceImagenModal ? 'bg-blue-500' : 'bg-gray-500'}`} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;

