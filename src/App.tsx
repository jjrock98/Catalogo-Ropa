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
  imagen: string;
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
        return carritoActual.map(item => item.idCart === idCart ? { ...item, cantidadPacks: item.cantidadPacks + 1 } : item);
      } else {
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

  // --- FUNCIÓN WHATSAPP CORREGIDA ---
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
      mensaje += `TOTAL: $${totalS}\n`;
    }

    if (itemsEncargo.length > 0) {
      mensaje += "\n📦 ENCARGOS POR PEDIDO:\n";
      itemsEncargo.forEach(item => {
        // Usamos item.nombre con un fallback por si Sanity devuelve null
        const nombrePrenda = item.nombre || "Prenda sin nombre";
        mensaje += `- ${item.cantidadPacks}x ${item.tipoVenta} de ${nombrePrenda.toUpperCase()}\n`;
      });
      mensaje += "\nAguardo confirmación para coordinar.";
    }

    const num = configTienda.telefono.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  if (cargando) return <div className="min-h-screen flex items-center justify-center text-2xl font-bold">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col lg:flex-row gap-6">
      <Toaster position="bottom-right" richColors />
      <div className="w-full lg:w-3/4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Claros Importados</h1>
        {/* Resto del catálogo... */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productos.filter(p => categoriaActiva === 'Todas' || p.categoria === categoriaActiva).map((prod) => (
            <div key={prod.id} className="bg-white rounded-xl shadow-lg p-4 flex flex-col">
              {prod.imagen && <img src={prod.imagen} alt={prod.nombre} className="w-full h-64 object-cover rounded-md" />}
              <h2 className="text-xl font-bold mt-4">{prod.nombre}</h2>
              <div className="mt-auto">
                <button onClick={() => agregarAlCarrito(prod, 'Docena')} className="w-full bg-blue-500 text-white mt-2 py-2 rounded">Agregar Docena</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-1/4">
        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
          <h2 className="text-2xl font-bold mb-4">Tu Pedido</h2>
          {carrito.map(item => (
            <div key={item.idCart} className="flex justify-between border-b py-2">
              <span>{item.nombre} ({item.cantidadPacks})</span>
              <button onClick={() => restarDelCarrito(item.idCart)} className="text-red-500 font-bold">-</button>
            </div>
          ))}
          <button onClick={enviarPedidoWhatsApp} className="mt-4 w-full bg-green-500 text-white py-3 rounded-lg font-bold">
            Enviar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;