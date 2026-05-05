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

export default function App() {
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
    mapaIframe: "" 
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
          toast.error(`No hay suficiente stock de ${producto.nombre}.`);
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

  // --- DISEÑO PREMIUM MEJORADO ---
  const themeBg = modoOscuro 
    ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#111827] to-black" 
    : "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-gray-100 to-[#e2e8f0]";
  const themeText = modoOscuro ? "text-gray-100" : "text-gray-800";
  
  // Efecto Glassmorphism (vidrio esmerilado) para las tarjetas
  const cardBg = modoOscuro 
    ? "bg-gray-800/40 backdrop-blur-xl border-gray-700/50 shadow-2xl shadow-black/50" 
    : "bg-white/60 backdrop-blur-xl border-white shadow-2xl shadow-slate-300/40";

  if (cargando) return (
    <div className={`min-h-screen flex items-center justify-center text-2xl font-light tracking-widest ${themeBg} ${themeText}`}>
      <div className="animate-pulse">Cargando catálogo...</div>
    </div>
  );

  const categoriasUnicas = ['Todas', ...Array.from(new Set(productos.map(p => p.categoria)))].filter(Boolean);
  const productosMostrados = categoriaActiva === 'Todas' ? productos : productos.filter(p => p.categoria === categoriaActiva);

  return (
    <div className={`min-h-screen p-4 md:p-8 flex flex-col lg:flex-row gap-8 transition-colors duration-500 ${themeBg} ${themeText}`}>
      <Toaster position="bottom-right" richColors />

      {/* SECCIÓN PRINCIPAL: PRODUCTOS */}
      <div className="w-full lg:w-2/3 xl:w-3/4">
        
        {/* CABECERA */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
              Claros Importados
            </h1>
            <p className={`text-sm tracking-widest uppercase mt-2 font-medium ${modoOscuro ? 'text-gray-400' : 'text-gray-500'}`}>
              Catálogo Mayorista Premium
            </p>
          </div>
          <button 
            onClick={() => setModoOscuro(!modoOscuro)} 
            className={`p-2 px-6 rounded-full border transition-all duration-300 font-medium shadow-lg hover:scale-105 ${modoOscuro ? 'border-gray-600 bg-gray-800/80 text-yellow-300 hover:bg-gray-700' : 'border-gray-200 bg-white/80 text-gray-700 hover:bg-white'}`}
          >
            {modoOscuro ? '☀️ Modo Día' : '🌙 Modo Noche'}
          </button>
        </div>

        {/* FILTRO CATEGORIAS */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
          {categoriasUnicas.map(cat => (
            <button 
              key={cat} 
              onClick={() => setCategoriaActiva(cat)} 
              className={`px-6 py-2.5 rounded-full font-semibold transition-all duration-300 whitespace-nowrap shadow-md hover:scale-105 ${categoriaActiva === cat ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent' : (modoOscuro ? 'bg-gray-800/60 text-gray-300 border border-gray-700' : 'bg-white/60 text-gray-600 border border-gray-200')}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* GRID DE PRODUCTOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
          {productosMostrados.map((prod) => (
            <div key={prod.id} className={`rounded-3xl overflow-hidden flex flex-col border transition-all duration-300 hover:-translate-y-2 ${cardBg}`}>
              <div className="relative cursor-pointer group overflow-hidden" onClick={() => abrirModal(prod)}>
                {prod.imagenes?.length ? (
                  <img src={prod.imagenes[0]} alt={prod.nombre} className="w-full h-72 object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-72 bg-gray-200/50 flex items-center justify-center text-gray-400">Sin imagen</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="text-white text-4xl drop-shadow-lg">🔍</span>
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-grow">
                <span className="text-xs font-bold tracking-wider text-indigo-500 uppercase mb-1">{prod.categoria}</span>
                <h2 className={`text-2xl font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-gray-900'}`}>{prod.nombre}</h2>
                
                {/* DESCRIPCIÓN REPARADA Y ESTILIZADA */}
                {prod.descripcion ? (
                  <p className={`text-sm mb-4 line-clamp-3 leading-relaxed ${modoOscuro ? 'text-gray-400' : 'text-gray-600'}`}>
                    {prod.descripcion}
                  </p>
                ) : (
                  <p className="text-sm mb-4 italic text-gray-400 opacity-50">Sin descripción</p>
                )}

                <div className="mt-auto pt-4 flex flex-col gap-3">
                   <div className={`flex justify-between items-center p-3 rounded-xl transition-colors ${modoOscuro ? 'bg-gray-800/50 hover:bg-gray-700/50' : 'bg-gray-50 hover:bg-gray-100'}`}>
                      <span className="text-sm font-medium">Media Docena: <br/><b className="text-green-500 text-lg">${prod.precioMediaDocena}</b></span>
                      <button onClick={() => agregarAlCarrito(prod, 'Media Docena')} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shadow-lg hover:shadow-indigo-500/30 hover:scale-110 transition-all">+</button>
                   </div>
                   <div className={`flex justify-between items-center p-3 rounded-xl transition-colors ${modoOscuro ? 'bg-gray-800/50 hover:bg-gray-700/50' : 'bg-gray-50 hover:bg-gray-100'}`}>
                      <span className="text-sm font-medium">Docena: <br/><b className="text-green-500 text-lg">${prod.precioDocena}</b></span>
                      <button onClick={() => agregarAlCarrito(prod, 'Docena')} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shadow-lg hover:shadow-indigo-500/30 hover:scale-110 transition-all">+</button>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN LATERAL: CARRITO */}
      <div id="carrito-seccion" className="w-full lg:w-1/3 xl:w-1/4">
        <div className={`sticky top-8 rounded-3xl p-6 border ${cardBg}`}>
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            🛒 Tu Pedido
          </h3>
          
          {carrito.length === 0 ? (
            <p className={`text-center py-10 italic ${modoOscuro ? 'text-gray-500' : 'text-gray-400'}`}>El carrito está vacío</p>
          ) : (
            <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin">
              {carrito.map((item, index) => (
                <div key={index} className={`p-4 rounded-2xl flex justify-between items-center border ${modoOscuro ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div>
                    <p className="font-bold text-sm">{item.nombre}</p>
                    <p className={`text-xs ${modoOscuro ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.cantidadPacks}x {item.tipoVenta}
                    </p>
                    <p className="text-green-500 font-semibold text-sm">${item.precioAplicado * item.cantidadPacks}</p>
                  </div>
                  <button onClick={() => restarDelCarrito(item.idCart)} className="bg-red-100 text-red-600 w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-red-200 transition-colors">
                    -
                  </button>
                </div>
              ))}
            </div>
          )}

          {carrito.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-500/20">
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-medium">Total Estimado:</span>
                <span className="text-3xl font-extrabold text-green-500">
                  ${carrito.reduce((acc, item) => acc + (item.precioAplicado * item.cantidadPacks), 0)}
                </span>
              </div>
              <button onClick={enviarPedidoWhatsApp} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/30 hover:scale-[1.02] transition-transform text-lg flex items-center justify-center gap-2">
                Enviar por WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE IMÁGENES */}
      {productoAmpliando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setProductoAmpliando(null)}>
          <div className="relative max-w-4xl w-full bg-transparent flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button className="absolute -top-12 right-0 text-white text-4xl hover:text-gray-300 transition-colors" onClick={() => setProductoAmpliando(null)}>&times;</button>
            <img 
              src={productoAmpliando.imagenes![indiceImagenModal]} 
              alt="Ampliación" 
              className="max-h-[80vh] w-auto rounded-xl shadow-2xl object-contain" 
            />
            {productoAmpliando.imagenes!.length > 1 && (
              <div className="flex gap-4 mt-6 overflow-x-auto p-2">
                {productoAmpliando.imagenes!.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt="Miniatura" 
                    className={`h-20 w-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${idx === indiceImagenModal ? 'border-blue-500 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    onClick={() => setIndiceImagenModal(idx)}
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
