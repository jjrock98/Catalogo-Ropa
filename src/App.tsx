import { createClient } from '@sanity/client';
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from '@vercel/speed-insights/react'

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

  // ESTADOS DEL FORMULARIO
  const [nombreCliente, setNombreCliente] = useState('');
  const [direccionCliente, setDireccionCliente] = useState('');
  const [metodoEnvio, setMetodoEnvio] = useState('Moto');

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

  const enviarPedidoWhatsApp = () => {
    if (carrito.length === 0) return;
    if (!nombreCliente.trim() || (metodoEnvio !== 'Retiro' && !direccionCliente.trim())) {
      toast.error("Por favor, completa tus datos antes de continuar.");
      return;
    }

    let mensaje = "🙌 *¡Hola! Quiero realizar un pedido en Claros Importados* 🛒\n\n";
    mensaje += "👤 *MIS DATOS:*\n";
    mensaje += `- *Nombre:* ${nombreCliente}\n`;
    
    if (metodoEnvio === 'Retiro') {
      mensaje += `- *Entrega:* Retiro en Local\n`;
    } else {
      mensaje += `- *Envío:* ${metodoEnvio}\n`;
      mensaje += `- *Dirección:* ${direccionCliente}\n`;
    }
    mensaje += "\n";
    mensaje += "✅ *PRODUCTOS:* \n";
    let total = 0;
    carrito.forEach(item => {
      const subtotal = item.precioAplicado * item.cantidadPacks;
      mensaje += `• ${item.cantidadPacks}x ${item.tipoVenta} - *${item.nombre}* ($${subtotal})\n`;
      total += subtotal;
    });

    mensaje += `\n💰 *TOTAL PRODUCTOS:* $${total}\n`;
    mensaje += `📌 *ALIAS MP:* ${configTienda.aliasMP}\n\n`;
    mensaje += "🚀 _Aguardo confirmación de stock para realizar el pago._";

    const num = configTienda.telefono.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const irAlCarrito = () => {
    setVistaActiva('catalogo');
    setTimeout(() => {
      document.getElementById('carrito-seccion')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const abrirWhatsAppDirecto = () => {
    const num = configTienda.telefono.replace(/\D/g, '');
    window.open(`https://wa.me/${num}`, '_blank');
  };

  const themeBg = modoOscuro ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900";
  const cardBg = modoOscuro ? "bg-slate-800/60 border-slate-700 backdrop-blur-md" : "bg-white/70 border-white shadow-xl backdrop-blur-md";

  if (cargando) return <div className={`h-screen flex items-center justify-center font-bold ${themeBg}`}>Cargando catálogo...</div>;

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-20 ${themeBg}`}>
      <Toaster position="bottom-center" richColors />

      <style>{`
        .google-maps-container iframe {
          width: 100% !important;
          height: 100% !important;
          border: 0;
          border-radius: 2rem;
        }
      `}</style>

      <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-lg ${modoOscuro ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent leading-none">CLAROS</h1>
            <span className="text-[10px] tracking-[0.3em] font-bold opacity-50 uppercase">Importados</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setModoOscuro(!modoOscuro)} className="text-xl p-2 rounded-full hover:bg-slate-500/10 transition">
              {modoOscuro ? '☀️' : '🌙'}
            </button>
            <div className="relative">
              <button onClick={() => setMenuAbierto(!menuAbierto)} className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition">
                Menú {menuAbierto ? '✕' : '☰'}
              </button>
              {menuAbierto && (
                <div className={`absolute right-0 mt-3 w-56 rounded-3xl border p-2 shadow-2xl animate-in zoom-in-95 duration-200 z-50 ${cardBg}`}>
                  <button onClick={() => { setVistaActiva('catalogo'); setMenuAbierto(false); }} className={`w-full text-left p-4 rounded-2xl transition ${vistaActiva === 'catalogo' ? 'bg-blue-600 text-white' : 'hover:bg-slate-500/10'}`}>🛍️ Catálogo</button>
                  <button onClick={() => { setVistaActiva('contacto'); setMenuAbierto(false); }} className={`w-full text-left p-4 rounded-2xl transition ${vistaActiva === 'contacto' ? 'bg-blue-600 text-white' : 'hover:bg-slate-500/10'}`}>📍 Contacto</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {vistaActiva === 'catalogo' ? (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
                {['Todas', ...new Set(productos.map(p => p.categoria))].map(cat => (
                  <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all ${categoriaActiva === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-500/10 hover:bg-slate-500/20'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {productos.filter(p => categoriaActiva === 'Todas' || p.categoria === categoriaActiva).map(prod => (
                  <div key={prod.id} className={`rounded-[2.5rem] border p-5 transition-all hover:shadow-2xl ${cardBg}`}>
                    {prod.imagenes && <img src={prod.imagenes[0]} className="w-full h-72 object-cover rounded-[1.8rem] mb-6 shadow-inner" alt={prod.nombre} />}
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 px-3 py-1 bg-blue-500/10 rounded-full">{prod.categoria}</span>
                    <h3 className="text-2xl font-black mt-3 mb-2">{prod.nombre}</h3>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button onClick={() => agregarAlCarrito(prod, 'Media Docena')} className="flex flex-col items-center bg-slate-500/5 p-4 rounded-3xl hover:bg-blue-600 hover:text-white transition group">
                        <span className="text-[10px] font-bold uppercase opacity-60 group-hover:opacity-100">Media Docena</span>
                        <span className="text-lg font-black">${prod.precioMediaDocena}</span>
                      </button>
                      <button onClick={() => agregarAlCarrito(prod, 'Docena')} className="flex flex-col items-center bg-slate-500/5 p-4 rounded-3xl hover:bg-blue-600 hover:text-white transition group">
                        <span className="text-[10px] font-bold uppercase opacity-60 group-hover:opacity-100">Docena</span>
                        <span className="text-lg font-black">${prod.precioDocena}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside id="carrito-seccion" className="w-full lg:w-96">
              <div className={`sticky top-28 p-8 rounded-[2.5rem] border ${cardBg}`}>
                <h2 className="text-3xl font-black mb-8">MI PEDIDO</h2>
                {carrito.length === 0 ? (
                  <div className="text-center py-10 opacity-40 italic">Tu carrito está vacío</div>
                ) : (
                  <>
                    <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-2">
                      {carrito.map(item => (
                        <div key={item.idCart} className="flex justify-between items-center bg-slate-500/5 p-4 rounded-3xl">
                          <div className="text-sm font-black">{item.nombre} <span className="block text-xs font-normal opacity-50">{item.cantidadPacks}x {item.tipoVenta}</span></div>
                          <button onClick={() => restarDelCarrito(item.idCart)} className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition flex items-center justify-center">✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 bg-slate-500/5 p-5 rounded-[2rem] border border-slate-500/10 mb-6">
                        <input type="text" placeholder="Nombre Completo" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} className="w-full bg-white/50 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        <select value={metodoEnvio} onChange={(e) => setMetodoEnvio(e.target.value)} className="w-full bg-white/50 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="Moto">Envío por Moto</option>
                          <option value="Correo">Envío por Correo</option>
                          <option value="Retiro">Retiro en Local</option>
                        </select>
                        {metodoEnvio === 'Retiro' ? (
                          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-600">📍 {configTienda.direccion}</div>
                        ) : (
                          <textarea placeholder="Dirección completa" value={direccionCliente} onChange={(e) => setDireccionCliente(e.target.value)} className="w-full bg-white/50 border-none rounded-2xl p-4 text-sm min-h-[80px] outline-none focus:ring-2 focus:ring-blue-500" />
                        )}
                    </div>
                    <div className="flex justify-between items-end mb-6 px-2">
                      <span className="font-bold opacity-50">SUBTOTAL</span>
                      <span className="text-4xl font-black text-green-500">${carrito.reduce((acc, i) => acc + (i.precioAplicado * i.cantidadPacks), 0)}</span>
                    </div>
                    <button onClick={enviarPedidoWhatsApp} className="w-full bg-green-500 text-white font-black py-5 rounded-[1.8rem] shadow-xl hover:scale-[1.02] transition uppercase tracking-widest">Enviar Pedido</button>
                  </>
                )}
              </div>
            </aside>
          </div>
        ) : (
          /* VISTA CONTACTO */
          <div className="max-w-4xl mx-auto py-10 text-center flex flex-col items-center">
             <h2 className="text-4xl font-black mb-8">Contacto y Ubicación</h2>
             
             {/* BOTÓN WHATSAPP VERDE */}
             <button 
               onClick={abrirWhatsAppDirecto}
               className="mb-12 bg-[#25D366] hover:bg-[#128C7E] text-white px-10 py-5 rounded-[2rem] font-black flex items-center gap-4 shadow-2xl shadow-green-500/30 transition-all hover:scale-105 active:scale-95"
             >
               <span className="text-3xl">💬</span> 
               <div className="text-left leading-tight">
                 <p className="text-[10px] uppercase opacity-80">Contacto Directo</p>
                 <p className="text-lg">Chatear por WhatsApp</p>
               </div>
             </button>

             <div className="mb-10 space-y-4 px-4">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2">Donde encontrarnos</p>
                  <p className="text-2xl font-black">{configTienda.direccion || "Dirección no configurada"}</p>
               </div>
               
               {/* DESCRIPCIÓN DINÁMICA */}
               {configTienda.descripcionUbicacion && (
                 <div className="bg-slate-500/5 p-8 rounded-[2.5rem] border border-slate-500/10 max-w-2xl mx-auto relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase">Información</span>
                    <p className="text-lg opacity-80 leading-relaxed italic">
                      "{configTienda.descripcionUbicacion}"
                    </p>
                 </div>
               )}
             </div>
             
             {/* IFRAME DE GOOGLE MAPS */}
             <div className="w-full h-[500px] google-maps-container shadow-2xl rounded-[2.5rem] overflow-hidden border-8 border-white/40 bg-slate-200">
               {configTienda.mapaIframe ? (
                 <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: configTienda.mapaIframe }} />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                    El mapa se cargará aquí desde Sanity
                 </div>
               )}
             </div>

             <button onClick={() => setVistaActiva('catalogo')} className="mt-12 text-blue-500 font-bold hover:underline">
               ← Volver al catálogo principal
             </button>
          </div>
        )}
      </main>

      {/* PUSH FLOTANTE DEL CARRITO */}
      {carrito.length > 0 && vistaActiva === 'catalogo' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 animate-in slide-in-from-bottom-10 duration-500">
            <button
              onClick={irAlCarrito}
              className="w-full bg-blue-600 text-white p-5 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(37,99,235,0.5)] flex items-center justify-between border-2 border-white/20 group overflow-hidden relative"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="bg-white/20 p-2 rounded-xl text-xl">🛒</div>
                <div className="text-left">
                    <p className="text-[10px] font-bold uppercase opacity-70">Ver mi pedido</p>
                    <p className="font-black text-lg">Total: ${carrito.reduce((acc, i) => acc + (i.precioAplicado * i.cantidadPacks), 0)}</p>
                </div>
              </div>
              <div className="bg-white text-blue-600 font-black px-4 py-2 rounded-2xl relative z-10">
                {carrito.reduce((acc, item) => acc + item.cantidadPacks, 0)} Items
              </div>
              <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[150%] transition-all duration-1000"></div>
            </button>
        </div>
      )}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
// --- FIN DEL ARCHIVO ---

