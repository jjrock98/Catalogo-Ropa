import { createClient } from '@sanity/client';
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';

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
  imagenes?: string[];
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
  direccion?: string;
  descripcionUbicacion?: string;
  mapaIframe?: string;
}

function App() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todas');
  const [modoOscuro, setModoOscuro] = useState<boolean>(false);
  const [productoAmpliando, setProductoAmpliando] = useState<Producto | null>(null);
  const [indiceImagenModal, setIndiceImagenModal] = useState<number>(0);

  const [configTienda, setConfigTienda] = useState<ConfiguracionTienda>({
    telefono: "5491122334455",
    aliasMP: "claros.javier",
    direccion: "Cargando dirección...",
    descripcionUbicacion: "Visítanos en nuestra tienda física.",
    mapaIframe: "" // Aquí se guardará el código del mapa
  });

  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const configData = await client.fetch(`*[_type == "configuracion"][0]{
          telefono, 
          aliasMP, 
          direccion, 
          descripcionUbicacion, 
          mapaIframe
        }`);
        
        if (configData) {
          setConfigTienda({
            telefono: configData.telefono || "5491122334455",
            aliasMP: configData.aliasMP || "claros.javier",
            direccion: configData.direccion || "Buenos Aires, Argentina",
            descripcionUbicacion: configData.descripcionUbicacion || "Venta de indumentaria importada.",
            mapaIframe: configData.mapaIframe
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
          "imagenes": imagenes[].asset->url 
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
          toast.error(`No hay suficiente stock.`);
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
        mensaje += `- ${item.cantidadPacks}x ${item.tipoVenta} de ${item.nombre.toUpperCase()}\n`;
      });
    }

    const num = configTienda.telefono.replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const abrirModal = (producto: Producto) => {
    if (producto.imagenes?.length) {
      setProductoAmpliando(producto);
      setIndiceImagenModal(0);
    }
  };

  const themeBg = modoOscuro ? "bg-gray-900" : "bg-gray-100";
  const themeText = modoOscuro ? "text-gray-100" : "text-gray-800";
  const cardBg = modoOscuro ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";

  // --- Agrego esto ---
  const irAlCarrito = () => {
    const seccionCarrito = document.getElementById('carrito-seccion');
    seccionCarrito?.scrollIntoView({ behavior: 'smooth' });
  };
  // -----------

  if (cargando) return <div className="min-h-screen flex items-center justify-center text-2xl font-bold bg-gray-100">Cargando catálogo...</div>;

  const categoriasUnicas = ['Todas', ...Array.from(new Set(productos.map(p => p.categoria)))].filter(Boolean);
  const productosMostrados = categoriaActiva === 'Todas' ? productos : productos.filter(p => p.categoria === categoriaActiva);

  return (
    <div className={`min-h-screen p-4 md:p-8 flex flex-col lg:flex-row gap-6 transition-colors duration-300 ${themeBg} ${themeText}`}>
      <Toaster position="bottom-right" richColors />

      <div className="w-full lg:w-3/4">
        {/* CABECERA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Claros Importados
            </h1>
            <p className={`text-sm tracking-widest uppercase mt-1 font-semibold ${modoOscuro ? 'text-gray-400' : 'text-gray-500'}`}>
              Catálogo Mayorista
            </p>
          </div>
          <button onClick={() => setModoOscuro(!modoOscuro)} className={`p-2 px-4 rounded-full border-2 transition-all font-medium ${modoOscuro ? 'border-gray-600 bg-gray-800 text-yellow-300' : 'border-gray-300 bg-white text-gray-700'}`}>
            {modoOscuro ? '☀️ Modo Día' : '🌙 Modo Noche'}
          </button>
        </div>

        {/* FILTRO CATEGORIAS */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categoriasUnicas.map(cat => (
            <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-5 py-2 rounded-full font-semibold transition whitespace-nowrap shadow-sm ${categoriaActiva === cat ? 'bg-blue-600 text-white' : (modoOscuro ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600')}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* GRID DE PRODUCTOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
          {productosMostrados.map((prod) => (
            <div key={prod.id} className={`rounded-2xl shadow-lg overflow-hidden flex flex-col border transition-all hover:-translate-y-1 ${cardBg}`}>
              <div className="relative cursor-pointer group" onClick={() => abrirModal(prod)}>
                {prod.imagenes?.length ? (
                  <img src={prod.imagenes[0]} alt={prod.nombre} className="w-full h-64 object-cover" />
                ) : (
                  <div className="w-full h-64 bg-gray-300 flex items-center justify-center">Sin imagen</div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white text-3xl">🔍</span>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <span className="text-xs font-bold text-blue-500 uppercase">{prod.categoria}</span>
                <h2 className="text-xl font-bold">{prod.nombre}</h2>

                {/* --- ESTO ES LO QUE TIENES QUE AGREGAR --- */}
                {prod.descripcion && (
                  <p className={`text-sm mt-1 mb-3 ${modoOscuro ? 'text-gray-400' : 'text-gray-600'}`}>
                    {prod.descripcion}
                  </p>
                )}
                {/* ---------------------------------------- */}

                  {/* Aquí siguen los botones de los precios... */}


                
                <div className="mt-auto pt-4 flex flex-col gap-2">
                   <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                      <span className="text-sm">Media Docena: <b className="text-green-600">${prod.precioMediaDocena}</b></span>
                      <button onClick={() => agregarAlCarrito(prod, 'Media Docena')} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">+</button>
                   </div>
                   <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                      <span className="text-sm">Docena: <b className="text-green-600">${prod.precioDocena}</b></span>
                      <button onClick={() => agregarAlCarrito(prod, 'Docena')} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">+</button>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* --- NUEVA SECCIÓN DE UBICACIÓN --- */}
        <div className={`mt-16 p-8 rounded-3xl shadow-xl border ${cardBg}`}>
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Nuestra Ubicación</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-blue-600">{configTienda.direccion}</h3>
              <p className={`text-lg leading-relaxed ${modoOscuro ? 'text-gray-400' : 'text-gray-600'}`}>
                {configTienda.descripcionUbicacion}
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
                <p className="font-bold mb-1">Horarios de Atención:</p>
                <p className="opacity-80">Lunes a Sábados: 09:00 - 19:00 hs</p>
              </div>
            </div>

            
            <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-700 h-[350px] relative">
              {configTienda.mapaIframe ? (
                /* Si el texto contiene la palabra <iframe, lo trata como código */
                configTienda.mapaIframe.includes('<iframe') ? (
                  <div 
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ 
                      __html: configTienda.mapaIframe
                        .replace(/width="\d+"/, 'width="100%"')
                        .replace(/height="\d+"/, 'height="100%"') 
                    }} 
                  />
                ) : (
                  /* Si es solo un link, lo pone directamente en el src */
                  <iframe 
                    src={configTienda.mapaIframe} 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen 
                    loading="lazy"
                  ></iframe>
                )
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-center p-6">
                  <p className="font-medium opacity-50">Cargando mapa...</p>
                </div>
              )}
            </div>

          

          </div>
        </div>
      </div>

      {/* CARRITO LATERAL */}
      <div id="carrito-seccion" className="w-full lg:w-1/4">
        <div className={`rounded-2xl shadow-xl p-6 sticky top-6 border ${cardBg}`}>
          <h2 className="text-2xl font-extrabold mb-6 border-b pb-4">Tu Pedido</h2>
          {carrito.length === 0 ? (
            <p className="text-center py-10 opacity-50">El carrito está vacío</p>
          ) : (
            <div className="flex flex-col gap-4">
              {carrito.map(item => (
                <div key={item.idCart} className="flex justify-between items-center border-b pb-2">
                  <div className="text-sm">
                    <p className="font-bold">{item.nombre}</p>
                    <p className="text-blue-500 text-xs">{item.tipoVenta} x{item.cantidadPacks}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => restarDelCarrito(item.idCart)} className="bg-gray-200 dark:bg-gray-600 px-2 rounded">-</button>
                    <button onClick={() => enviarPedidoWhatsApp()} className="text-green-600 font-bold">${item.precioAplicado * item.cantidadPacks}</button>
                  </div>
                </div>
              ))}
              <div className="pt-4 text-xl font-bold flex justify-between">
                <span>Total:</span>
                <span className="text-green-600">${carrito.reduce((acc, item) => acc + (item.precioAplicado * item.cantidadPacks), 0)}</span>
              </div>
              <button onClick={enviarPedidoWhatsApp} className="bg-green-500 text-white font-bold py-3 rounded-xl w-full mt-4">
                Pedir por WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL IMAGEN */}
      {productoAmpliando && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setProductoAmpliando(null)}>
          <img src={productoAmpliando.imagenes?.[indiceImagenModal]} className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
      {/* --- PEGAR BOTON FLOTANTE AQUI ---*/}
      {carrito.length > 0 && (
        <button
        onClick={irAlCarrito}
        className="lg:hidden fixed bottom-6 right-6 z-40 bg-green-500 text-white p-4 rounded-full shadow-2x1 flex items-center gap-2 animate-bounce border-2 border-white">
        <svg xmlns="https://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className="font-bold">{carrito.reduce((acc, item) => acc + item.cantidadPacks, 0)}</span>
      </button>

        <)}
    </div>
  );
}

export default App;
