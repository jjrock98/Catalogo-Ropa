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
  const [vistaActiva, setVistaActiva] = useState<'catalogo' | 'contacto'>('catalogo');
  const [menuAbierto, setMenuAbierto] = useState<boolean>(false);

  const [configTienda, setConfigTienda] = useState<ConfiguracionTienda>({
    telefono: "5491122334455",
    aliasMP: "claros.javier",
    direccion: "",
    descripcionUbicacion: "",
    mapaIframe: "" 
  });

  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const configData = await client.fetch(`*[_type == "configuracion"][0]`);
        if (configData) setConfigTienda(configData);

        const dataProductos = await client.fetch(`*[_type == "producto"]{
          "id": _id,
          "nombre": name,
          "descripcion": description,
          "tipoStock": tipoStock,
          "precioMediaDocena": precioMediaDocena,
          "precioDocena": precioDocena,
          "categoria": category,
          "imagenes": imagenes[].asset->url 
        }`);
        setProductos(dataProductos);
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setCargando(false);
      }
    };
    obtenerDatos();
  }, []);

  const agregarAlCarrito = (producto: Producto, tipoVenta: 'Media Docena' | 'Docena') => {
    const idCart = `${producto.id}-${tipoVenta}`;
    const precio = tipoVenta === 'Media Docena' ? producto.precioMediaDocena : producto.precioDocena;
    setCarrito((prev) => {
      const existe = prev.find(item => item.idCart === idCart);
      if (existe) {
        toast.success(`Sumaste otra ${tipoVenta}`);
        return prev.map(item => item.idCart === idCart ? { ...item, cantidadPacks: item.cantidadPacks + 1 } : item);
      }
      toast.success(`Agregado al pedido`);
      return [...prev, { ...producto, idCart, tipoVenta, cantidadPacks: 1, precioAplicado: precio }];
    });
  };

  const restarDelCarrito = (idCart: string) => {
    setCarrito((prev) => prev.map(item => item.idCart === idCart ? { ...item, cantidadPacks: item.cantidadPacks - 1 } : item).filter(item => item.cantidadPacks > 0));
  };

  // ... (debajo de restarDelCarrito)

const enviarPedidoWhatsApp = () => {
  if (carrito.length === 0) return;

  // --- ENCABEZADO PROFESIONAL ---
  let mensaje = "🙌 *¡Hola! Quiero realizar un pedido en Claros Importados* 🛒\n\n";
  
  // --- DATOS PARA AGILIZAR ---
  mensaje += "👤 *MIS DATOS:*\n";
  mensaje += "- *Nombre:* \n";
  mensaje += "- *Localidad:* \n";
  mensaje += "- *Envío:* (Moto / Correo / Retiro) \n\n";

  const itemsStock = carrito.filter(item => item.tipoStock === 'con_stock');
  const itemsEncargo = carrito.filter(item => item.tipoStock === 'a_pedido');

  // --- SECCIÓN STOCK ---
  if (itemsStock.length > 0) {
    mensaje += "✅ *PRODUCTOS EN STOCK:*\n";
    let totalS = 0;
    itemsStock.forEach(item => {
      const sub = item.precioAplicado * item.cantidadPacks;
      mensaje += `• ${item.cantidadPacks}x ${item.tipoVenta} - *${item.nombre}* ($${sub})\n`;
      totalS += sub;
    });
    mensaje += `\n💰 *TOTAL PRODUCTOS:* $${totalS}\n`;
    mensaje += `📌 *ALIAS MP:* ${configTienda.aliasMP}\n`;
  }

  // --- SECCIÓN ENCARGOS ---
  if (itemsEncargo.length > 0) {
    mensaje += "\n📦 *ENCARGOS POR PEDIDO (A COORDINAR):*\n";
    itemsEncargo.forEach(item => {
      mensaje += `• ${item.cantidadPacks}x ${item.tipoVenta} - *${item.nombre.toUpperCase()}*\n`;
    });
  }

  // --- CIERRE ---
  mensaje += "\n🚀 _Aguardo confirmación de stock para realizar el pago._";

  const num = configTienda.telefono.replace(/\D/g, '');
  const url = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
};

// ... (después seguís con irAlCarrito)


  const irAlCarrito = () => {
    setVistaActiva('catalogo');
    setTimeout(() => {
      document.getElementById('carrito-seccion')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // --- ESTILOS ---
  const themeBg = modoOscuro ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900";
  const cardBg = modoOscuro ? "bg-slate-800/60 border-slate-700 backdrop-blur-md" : "bg-white/70 border-white shadow-xl backdrop-blur-md";

  if (cargando) return <div className={`h-screen flex items-center justify-center font-bold ${themeBg}`}>Cargando catálogo...</div>;

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-20 ${themeBg}`}>
      <Toaster position="bottom-center" richColors />

      {/* HEADER / NAVBAR */}
      <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-lg ${modoOscuro ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent leading-none">CLAROS</h1>
            <span className="text-[10px] tracking-[0.3em] font-bold opacity-50 uppercase">Importados</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setModoOscuro(!modoOscuro)} className="text-xl">
              {modoOscuro ? '☀️' : '🌙'}
            </button>
            
            {/* BOTÓN MENÚ DESPLEGABLE */}
            <div className="relative">
              <button 
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition"
              >
                Menú {menuAbierto ? '✕' : '☰'}
              </button>

              {menuAbierto && (
                <div className={`absolute right-0 mt-3 w-56 rounded-3xl border p-2 shadow-2xl animate-in zoom-in-95 duration-200 ${cardBg}`}>
                  <button 
                    onClick={() => { setVistaActiva('catalogo'); setMenuAbierto(false); }}
                    className={`w-full text-left p-4 rounded-2xl transition ${vistaActiva === 'catalogo' ? 'bg-blue-600 text-white' : 'hover:bg-slate-500/10'}`}
                  >
                    🛍️ Catálogo
                  </button>
                  <button 
                    onClick={() => { setVistaActiva('contacto'); setMenuAbierto(false); }}
                    className={`w-full text-left p-4 rounded-2xl transition ${vistaActiva === 'contacto' ? 'bg-blue-600 text-white' : 'hover:bg-slate-500/10'}`}
                  >
                    📍 Ubicación y Contacto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {vistaActiva === 'catalogo' ? (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* PRODUCTOS */}
            <div className="flex-1">
              <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
                {['Todas', ...new Set(productos.map(p => p.categoria))].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setCategoriaActiva(cat)}
                    className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all ${categoriaActiva === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-500/10 hover:bg-slate-500/20'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {productos.filter(p => categoriaActiva === 'Todas' || p.categoria === categoriaActiva).map(prod => (
                  <div key={prod.id} className={`rounded-[2.5rem] overflow-hidden border p-5 transition-all hover:shadow-2xl ${cardBg}`}>
                    {prod.imagenes && <img src={prod.imagenes[0]} className="w-full h-72 object-cover rounded-[1.8rem] mb-6 shadow-inner" alt={prod.nombre} />}
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 px-3 py-1 bg-blue-500/10 rounded-full">{prod.categoria}</span>
                    <h3 className="text-2xl font-black mt-3 mb-2">{prod.nombre}</h3>
                    <p className="text-sm opacity-60 mb-6 leading-relaxed line-clamp-3">{prod.descripcion || "Importado de calidad premium."}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => agregarAlCarrito(prod, 'Media Docena')} className="flex flex-col items-center bg-slate-500/5 p-4 rounded-3xl hover:bg-blue-600 hover:text-white transition group">
                        <span className="text-[10px] font-bold uppercase opacity-60 group-hover:opacity-100 text-center">Media Docena</span>
                        <span className="text-lg font-black">${prod.precioMediaDocena}</span>
                      </button>
                      <button onClick={() => agregarAlCarrito(prod, 'Docena')} className="flex flex-col items-center bg-slate-500/5 p-4 rounded-3xl hover:bg-blue-600 hover:text-white transition group">
                        <span className="text-[10px] font-bold uppercase opacity-60 group-hover:opacity-100 text-center">Docena</span>
                        <span className="text-lg font-black">${prod.precioDocena}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CARRITO (Lado derecho en PC, abajo en móvil) */}
            <aside id="carrito-seccion" className="w-full lg:w-96">
              <div className={`sticky top-28 p-8 rounded-[2.5rem] border ${cardBg}`}>
                <h2 className="text-3xl font-black mb-8">MI PEDIDO</h2>
                {carrito.length === 0 ? (
                  <div className="text-center py-10 opacity-40 italic">Tu carrito está esperando...</div>
                ) : (
                  <>
                    <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-2">
                      {carrito.map(item => (
                        <div key={item.idCart} className="flex justify-between items-center bg-slate-500/5 p-4 rounded-3xl">
                          <div>
                            <p className="font-black text-sm">{item.nombre}</p>
                            <p className="text-xs opacity-50">{item.cantidadPacks}x {item.tipoVenta}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-blue-600">${item.precioAplicado * item.cantidadPacks}</span>
                            <button onClick={() => restarDelCarrito(item.idCart)} className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition">-</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-500/20 pt-6">
                      <div className="flex justify-between items-end mb-8">
                        <span className="font-bold opacity-50">SUBTOTAL</span>
                        <span className="text-4xl font-black text-green-500">${carrito.reduce((acc, i) => acc + (i.precioAplicado * i.cantidadPacks), 0)}</span>
                      </div>
                      <button 
                        onClick={enviarPedidoWhatsApp} 
                        className="w-full bg-green-500 text-white font-black py-5 rounded-[1.8rem] shadow-xl shadow-green-500/30 hover:scale-[1.02] active:scale-95 transition"
                      >
                        CONFIRMAR WHATSAPP
                      </button>

                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>
        ) : (
          /* VISTA DE CONTACTO Y UBICACIÓN */
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`p-8 md:p-12 rounded-[3rem] border ${cardBg}`}>
              <h2 className="text-4xl md:text-5xl font-black mb-10 text-center">Nuestra Ubicación</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                <div className="space-y-8">
                  <div className="flex gap-5">
                    <span className="text-4xl bg-blue-500/10 p-4 rounded-3xl">📍</span>
                    <div>
                      <h4 className="font-black text-blue-500 uppercase tracking-tighter">Dirección Física</h4>
                      <p className="text-2xl font-bold mt-1">{configTienda.direccion || "Buenos Aires, Argentina"}</p>
                    </div>
                  </div>
                  <div className="flex gap-5">
                    <span className="text-4xl bg-purple-500/10 p-4 rounded-3xl">🏬</span>
                    <div>
                      <h4 className="font-black text-purple-500 uppercase tracking-tighter">Local y Referencias</h4>
                      <p className="text-lg opacity-80 leading-relaxed mt-1">{configTienda.descripcionUbicacion || "Consúltanos los detalles de pasillo y local."}</p>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-slate-500/20">
                    <h4 className="font-black mb-4">Atención Directa</h4>
                    <a 
                      href={`https://wa.me/${configTienda.telefono.replace(/\D/g, '')}`}
                      target="_blank"
                      className="inline-flex items-center gap-3 bg-green-500 text-white px-8 py-4 rounded-2xl font-black hover:bg-green-600 shadow-xl shadow-green-500/20 transition"
                    >
                      <span>Hablar con nosotros</span>
                      <span className="text-xl">💬</span>
                    </a>
                  </div>
                </div>

                <div className="rounded-[2rem] overflow-hidden min-h-[350px] shadow-2xl border-4 border-white/10">
                  {configTienda.mapaIframe ? (
                    <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: configTienda.mapaIframe.replace(/width="\d+"/, 'width="100%"').replace(/height="\d+"/, 'height="100%"') }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-500/10 italic">Cargando mapa...</div>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setVistaActiva('catalogo')}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-500/30 font-bold opacity-60 hover:opacity-100 hover:border-blue-500 hover:text-blue-500 transition"
              >
                ← Volver al catálogo de productos
              </button>
            </div>
          </div>
        )}
      </main>

      {/* CARRITO FLOTANTE (Móviles) */}
      {carrito.length > 0 && vistaActiva === 'catalogo' && (
        <button 
          onClick={irAlCarrito}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-2xl animate-bounce lg:hidden"
        >
          🛒 <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">{carrito.reduce((acc, i) => acc + i.cantidadPacks, 0)}</span>
        </button>
      )}
    </div>
  );
}
