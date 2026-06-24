import { Sucursal, Producto, Lote, Cliente, Proveedor, Usuario } from '../types/pharmacy';

export const INITIAL_SUCURSALES: Sucursal[] = [
  {
    id: 'suc-01',
    nombre: 'Botica Mifarma - Sucursal Miraflores',
    direccion: 'Av. Larco 452, Miraflores',
    ubigeo: '150122',
    ciudad: 'Lima',
    telefono: '(01) 4412345'
  },
  {
    id: 'suc-02',
    nombre: 'Botica Inkafarma - Sucursal Lima Centro',
    direccion: 'Jr. de la Unión 825, Cercado de Lima',
    ubigeo: '150101',
    ciudad: 'Lima',
    telefono: '(01) 4287890'
  },
  {
    id: 'suc-03',
    nombre: 'Botica San José - Sucursal Yanahuara',
    direccion: 'Av. Ejército 714, Yanahuara',
    ubigeo: '040129',
    ciudad: 'Arequipa',
    telefono: '(054) 253012'
  }
];

export const INITIAL_PRODUCTOS: Producto[] = [
  {
    id: 'prod-01',
    codigo_barras: '7750102030401',
    nombre: 'Paracetamol 500mg',
    principio_activo: 'Paracetamol',
    concentracion: '500 mg',
    presentacion: 'Caja x 100 tabletas',
    laboratorio: 'Laboratorios Portugal S.A.',
    registro_sanitario: 'NG-12048',
    categoria: 'Analgésico / Antipirético',
    requiere_receta: false,
    precio_sugerido: 0.20
  },
  {
    id: 'prod-02',
    codigo_barras: '7750203040502',
    nombre: 'Amoxicilina 500mg (Amoxil)',
    principio_activo: 'Amoxicilina',
    concentracion: '500 mg',
    presentacion: 'Caja x 50 cápsulas',
    laboratorio: 'Hersil S.A. Laboratorios',
    registro_sanitario: 'EE-03487',
    categoria: 'Antibiótico',
    requiere_receta: true,
    precio_sugerido: 1.20
  },
  {
    id: 'prod-03',
    codigo_barras: '7750304050603',
    nombre: 'Ibuprofeno 400mg',
    principio_activo: 'Ibuprofeno',
    concentracion: '400 mg',
    presentacion: 'Caja x 100 tabletas',
    laboratorio: 'IQFarma (Industria Química Farmacéutica)',
    registro_sanitario: 'EN-09852',
    categoria: 'Antiinflamatorio no esteroideo (AINE)',
    requiere_receta: false,
    precio_sugerido: 0.50
  },
  {
    id: 'prod-04',
    codigo_barras: '7750405060704',
    nombre: 'Lansoprazol 30mg',
    principio_activo: 'Lansoprazol',
    concentracion: '30 mg',
    presentacion: 'Caja x 28 cápsulas',
    laboratorio: 'Laboratorios Lansier S.A.C.',
    registro_sanitario: 'EG-01934',
    categoria: 'Antiulceroso / Inhibidor bomba protones',
    requiere_receta: true,
    precio_sugerido: 2.50
  },
  {
    id: 'prod-05',
    codigo_barras: '7750506070805',
    nombre: 'Atorvastatina 20mg',
    principio_activo: 'Atorvastatina Magnésica',
    concentracion: '20 mg',
    presentacion: 'Caja x 30 tabletas',
    laboratorio: 'Medifarma S.A.',
    registro_sanitario: 'EE-07851',
    categoria: 'Cardiovascular / Hipolipemiante',
    requiere_receta: true,
    precio_sugerido: 3.00
  },
  {
    id: 'prod-06',
    codigo_barras: '7501008493012',
    nombre: 'Bepanthen Crema 50g',
    principio_activo: 'Dexpantenol',
    concentracion: '5%',
    presentacion: 'Tubo x 50 g',
    laboratorio: 'Bayer S.A.',
    registro_sanitario: 'EE-00512',
    categoria: 'Dermatológico / Cicatrizante',
    requiere_receta: false,
    precio_sugerido: 28.50
  },
  {
    id: 'prod-07',
    codigo_barras: '7751023405921',
    nombre: 'Azitromicina 500mg',
    principio_activo: 'Azitromicina dihidrato',
    concentracion: '500 mg',
    presentacion: 'Caja x 3 tabletas',
    laboratorio: 'Sandoz Perú S.A.',
    registro_sanitario: 'EE-05612',
    categoria: 'Antibiótico / Macrólido',
    requiere_receta: true,
    precio_sugerido: 4.80
  }
];

// Generamos fechas de vencimiento relativas para simular alertas DIGEMID
const getOffsetDateString = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export const INITIAL_LOTES: Lote[] = [
  // Lotes para Paracetamol (prod-01) en Miraflores (suc-01)
  {
    id: 'lote-101',
    id_producto: 'prod-01',
    id_sucursal: 'suc-01',
    numero_lote: 'L-P01A25',
    fecha_vencimiento: getOffsetDateString(-5), // Expired 5 days ago! (CRITICAL DIGEMID ALERT)
    stock: 45,
    stock_inicial: 500,
    precio_compra: 0.05,
    precio_venta: 0.20
  },
  {
    id: 'lote-102',
    id_producto: 'prod-01',
    id_sucursal: 'suc-01',
    numero_lote: 'L-P01B26',
    fecha_vencimiento: getOffsetDateString(45), // Expires in 45 days (CRITICAL URGENT - < 90 days)
    stock: 250,
    stock_inicial: 500,
    precio_compra: 0.05,
    precio_venta: 0.20
  },
  {
    id: 'lote-103',
    id_producto: 'prod-01',
    id_sucursal: 'suc-02', // En sucursal Lima Centro
    numero_lote: 'L-P01C27',
    fecha_vencimiento: getOffsetDateString(450), // Expires in more than a year
    stock: 600,
    stock_inicial: 1000,
    precio_compra: 0.045,
    precio_venta: 0.15
  },

  // Lotes para Amoxicilina (prod-02) (Requiere receta)
  {
    id: 'lote-201',
    id_producto: 'prod-02',
    id_sucursal: 'suc-01',
    numero_lote: 'L-AMX921',
    fecha_vencimiento: getOffsetDateString(15), // Expires in 15 days (VERY URGENT)
    stock: 120,
    stock_inicial: 200,
    precio_compra: 0.45,
    precio_venta: 1.20
  },
  {
    id: 'lote-202',
    id_producto: 'prod-02',
    id_sucursal: 'suc-02',
    numero_lote: 'L-AMX820',
    fecha_vencimiento: getOffsetDateString(400),
    stock: 350,
    stock_inicial: 500,
    precio_compra: 0.42,
    precio_venta: 1.10
  },

  // Lotes para Ibuprofeno (prod-03)
  {
    id: 'lote-301',
    id_producto: 'prod-03',
    id_sucursal: 'suc-01',
    numero_lote: 'L-IBU304',
    fecha_vencimiento: getOffsetDateString(75), // Expires in 75 days (Alert - < 90 days)
    stock: 14, // Low stock too!
    stock_inicial: 300,
    precio_compra: 0.12,
    precio_venta: 0.50
  },
  {
    id: 'lote-302',
    id_producto: 'prod-03',
    id_sucursal: 'suc-03', // En Yanahuara, Arequipa
    numero_lote: 'L-IBU305',
    fecha_vencimiento: getOffsetDateString(520),
    stock: 400,
    stock_inicial: 400,
    precio_compra: 0.11,
    precio_venta: 0.45
  },

  // Lansoprazol (prod-04)
  {
    id: 'lote-401',
    id_producto: 'prod-04',
    id_sucursal: 'suc-01',
    numero_lote: 'L-LAN102',
    fecha_vencimiento: getOffsetDateString(120), // Okay
    stock: 80,
    stock_inicial: 100,
    precio_compra: 0.90,
    precio_venta: 2.50
  },
  {
    id: 'lote-402',
    id_producto: 'prod-04',
    id_sucursal: 'suc-03',
    numero_lote: 'L-LAN103',
    fecha_vencimiento: getOffsetDateString(25), // Expires in 25 days!
    stock: 45,
    stock_inicial: 100,
    precio_compra: 0.88,
    precio_venta: 2.40
  },

  // Atorvastatina (prod-05)
  {
    id: 'lote-501',
    id_producto: 'prod-05',
    id_sucursal: 'suc-01',
    numero_lote: 'L-ATV002',
    fecha_vencimiento: getOffsetDateString(600),
    stock: 150,
    stock_inicial: 200,
    precio_compra: 1.10,
    precio_venta: 3.00
  },

  // Bepanthen (prod-06)
  {
    id: 'lote-601',
    id_producto: 'prod-06',
    id_sucursal: 'suc-01',
    numero_lote: 'L-BEP403',
    fecha_vencimiento: getOffsetDateString(900),
    stock: 35,
    stock_inicial: 50,
    precio_compra: 18.00,
    precio_venta: 28.50
  },

  // Azitromicina (prod-07)
  {
    id: 'lote-701',
    id_producto: 'prod-07',
    id_sucursal: 'suc-02',
    numero_lote: 'L-AZI984',
    fecha_vencimiento: getOffsetDateString(85), // Expires in 85 days! (Alert < 90)
    stock: 90,
    stock_inicial: 150,
    precio_compra: 1.80,
    precio_venta: 4.80
  }
];

export const INITIAL_CLIENTES: Cliente[] = [
  {
    id: 'cli-default',
    tipo_documento: 'DNI',
    numero_documento: '00000000',
    nombre_razon_social: 'Clientes Varios (Anónimo)',
    direccion: 'Venta Rápida al por menor, Lima',
    email: '',
    es_socio: false
  },
  {
    id: 'cli-01',
    tipo_documento: 'DNI',
    numero_documento: '45802145',
    nombre_razon_social: 'Alberto García Vargas',
    direccion: 'Jr. Libertad 421, Magdalena del Mar, Lima',
    email: 'alberto.gv@gmail.com',
    es_socio: true
  },
  {
    id: 'cli-02',
    tipo_documento: 'RUC',
    numero_documento: '20601234567',
    nombre_razon_social: 'Clínica San Borja S.A.C.',
    direccion: 'Av. Guardia Civil 382, San Borja, Lima',
    email: 'compras@clinicasanborja.com.pe',
    es_socio: false
  },
  {
    id: 'cli-03',
    tipo_documento: 'DNI',
    numero_documento: '09845129',
    nombre_razon_social: 'María Elena Quispe Cárdenas',
    direccion: 'Calle Los Jazmines 104, Yanahuara, Arequipa',
    email: 'maria.quispe@outlook.com',
    es_socio: true
  },
  {
    id: 'cli-04',
    tipo_documento: 'DNI',
    numero_documento: '41209845',
    nombre_razon_social: 'Juan Carlos Torres Paz',
    direccion: 'Av. Brasil 1420, Jesús María, Lima',
    email: 'jupaz@gmail.com',
    es_socio: false
  }
];

export const INITIAL_PROVEEDORES: Proveedor[] = [
  {
    id: 'prov-01',
    ruc: '20100120191',
    razon_social: 'Química Suiza S.A.C.',
    direccion: 'Av. República de Panamá 2577, La Victoria, Lima',
    telefono: '(01) 2114000',
    email: 'contacto@quimicasuiza.com.pe',
    contacto: 'Ing. Héctor Alva'
  },
  {
    id: 'prov-02',
    ruc: '20100345620',
    razon_social: 'Distribuidora Droguería Albis S.A.',
    direccion: 'Av. Industrial 1040, Cercado de Lima',
    telefono: '(01) 3154800',
    email: 'ventas@albis.com.pe',
    contacto: 'Lic. Gladys Sotelo'
  },
  {
    id: 'prov-03',
    ruc: '20501815920',
    razon_social: 'Alfafarma Droguería Mayorista S.A.C.',
    direccion: 'Jr. Dante 345, Surquillo, Lima',
    telefono: '(01) 4458914',
    email: 'pedidos@alfafarma.pe',
    contacto: 'Dr. Manuel Sayan'
  }
];

export const INITIAL_USUARIOS: Usuario[] = [
  {
    id: 'usr-01',
    username: 'admin',
    nombre: 'Arq. Luis Alejandro (Admin)',
    rol: 'Administrador',
    id_sucursal: 'suc-01',
    activo: true,
    password: 'admin',
    requiere_cambio_password: true,
    email: 'admin@sigifar.pe'
  },
  {
    id: 'usr-02',
    username: 'quimico.mendoza',
    nombre: 'Dra. Patricia Mendoza Cruz (Química Regente)',
    rol: 'FarmaceuticoRegente',
    id_sucursal: 'suc-01',
    activo: true,
    password: 'MendozaPassword1!',
    requiere_cambio_password: true,
    email: 'regente.mendoza@sigifar.pe'
  },
  {
    id: 'usr-03',
    username: 'cajero.sofia',
    nombre: 'Sofía Quispe Pineda (Cajera)',
    rol: 'Cajero',
    id_sucursal: 'suc-01',
    activo: true,
    password: 'SofiaPassword1!',
    requiere_cambio_password: true,
    email: 'cajero.sofia@sigifar.pe'
  },
  {
    id: 'usr-04',
    username: 'almacen.carlos',
    nombre: 'Carlos Gonzales (Almacenero / Logística)',
    rol: 'Almacenero',
    id_sucursal: 'suc-01',
    activo: true,
    password: 'CarlosPassword1!',
    requiere_cambio_password: true,
    email: 'almacen.carlos@sigifar.pe'
  }
];
