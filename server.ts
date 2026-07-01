import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./src/db/index.ts";
import { usuarios, auditorias, roles, sucursales } from "./src/db/schema.ts";
import { eq, sql } from "drizzle-orm";

// JWT Secret Key for Session Authentication (CRITICAL SHUTDOWN CHECK)
if (!process.env.JWT_SECRET) {
  console.error("================================================================");
  console.error("CRITICAL ERROR: JWT_SECRET environment variable is not defined!");
  console.error("The application cannot start securely without a valid JWT_SECRET.");
  console.error("Shutting down process to prevent insecure credentials fallbacks.");
  console.error("================================================================");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// In-memory rate limiting map for login endpoint: max 5 attempts per minute per IP
const loginAttemptsMap = new Map<string, { count: number; resetTime: number }>();
function loginRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();
  const limit = 5;
  const windowMs = 60000; // 1 minute

  const record = loginAttemptsMap.get(ip);
  if (!record) {
    loginAttemptsMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return next();
  }

  if (record.count >= limit) {
    return res.status(429).json({
      error: "TOO_MANY_REQUESTS",
      message: "Límite de seguridad de 5 intentos por minuto excedido para esta dirección IP. Por favor espere antes de reintentar."
    });
  }

  record.count += 1;
  next();
}

// Exponential backoff database retry utility
async function executeWithRetry<T>(operation: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    console.warn(`[DATABASE RETRY] Connection failed. Retrying in ${delay}ms... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return executeWithRetry(operation, retries - 1, delay * 2);
  }
}

// In-memory user store for synchronization and DB-offline resilience fallback
const fallbackUsers = [
  {
    id: 1,
    username: "admin",
    nombre: "Arq. Luis Alejandro (Admin)",
    rol: "Administrador",
    id_sucursal: "SUC-CENTRAL",
    activo: true,
    password: bcrypt.hashSync("admin", 10),
    requiere_cambio_password: true,
    must_change_password: true,
    password_changed: false,
    email: "admin@sigifar.pe"
  },
  {
    id: 2,
    username: "quimico.mendoza",
    nombre: "Dra. Patricia Mendoza Cruz (Química Regente)",
    rol: "FarmaceuticoRegente",
    id_sucursal: "SUC-CENTRAL",
    activo: true,
    password: bcrypt.hashSync("MendozaPassword1!", 10),
    requiere_cambio_password: true,
    must_change_password: true,
    password_changed: false,
    email: "regente.mendoza@sigifar.pe"
  },
  {
    id: 3,
    username: "cajero.sofia",
    nombre: "Sofía Quispe Pineda (Cajera)",
    rol: "Cajero",
    id_sucursal: "SUC-CENTRAL",
    activo: true,
    password: bcrypt.hashSync("SofiaPassword1!", 10),
    requiere_cambio_password: true,
    must_change_password: true,
    password_changed: false,
    email: "cajero.sofia@sigifar.pe"
  },
  {
    id: 4,
    username: "almacen.carlos",
    nombre: "Carlos Gonzales (Almacenero / Logística)",
    rol: "Almacenero",
    id_sucursal: "SUC-CENTRAL",
    activo: true,
    password: bcrypt.hashSync("CarlosPassword1!", 10),
    requiere_cambio_password: true,
    must_change_password: true,
    password_changed: false,
    email: "almacen.carlos@sigifar.pe"
  }
];

// Helper to find a user securely in either database or fallback
async function findUserByUsername(username: string) {
  const cleanUsername = username.trim().toLowerCase();
  const isProduction = process.env.NODE_ENV === "production";

  const dbQuery = () => db.select().from(usuarios).where(eq(usuarios.username, cleanUsername)).limit(1);

  try {
    const results = isProduction
      ? await executeWithRetry(dbQuery, 3, 500)
      : await dbQuery();

    if (results && results.length > 0) {
      const dbUser = results[0];
      // Map to frontend user format
      return {
        id: dbUser.id,
        username: dbUser.username,
        nombre: dbUser.nombre,
        rol: dbUser.rolId === 1 ? "Administrador" : dbUser.rolId === 2 ? "FarmaceuticoRegente" : dbUser.rolId === 3 ? "Almacenero" : "Cajero",
        id_sucursal: dbUser.id_sucursal || "SUC-CENTRAL",
        activo: dbUser.activo,
        password: dbUser.password || "admin",
        requiere_cambio_password: dbUser.requiere_cambio_password,
        must_change_password: dbUser.requiere_cambio_password,
        password_changed: !dbUser.requiere_cambio_password,
        email: dbUser.email || `${dbUser.username}@sigifar.pe`
      };
    }
  } catch (error: any) {
    console.error("[DATABASE QUERY ERROR] Failed to consult central SQL Database:", error.message || error);
    if (isProduction) {
      throw new Error("El motor central de base de datos se encuentra fuera de línea o inaccesible. Reintentos con exponencial backoff agotados.");
    }
  }

  // Strict prohibition of transient in-memory memory fallback in production
  if (isProduction) {
    return null;
  }

  // Fallback to offline registry ONLY in development mode
  const matched = fallbackUsers.find(u => u.username.toLowerCase() === cleanUsername);
  return matched ? { ...matched } : null;
}

// Helper to verify passwords securely via bcrypt only
function checkPassword(entered: string, stored: string): boolean {
  if (!stored) return false;
  try {
    return bcrypt.compareSync(entered, stored);
  } catch (err) {
    console.error("[BCRYPT ERROR] Failed to compare password:", err);
    return false;
  }
}

// Helper to verify if password is weak or temporary
function isTemporaryPassword(password: string, username: string): boolean {
  const lower = password.toLowerCase();
  const genericWeaks = [
    "admin",
    "admin123",
    "password",
    "12345678",
    "contraseña",
    "mendozapassword1!",
    "sofiapassword1!",
    "carlospassword1!",
    "sigifar",
    "sigifar123"
  ];
  if (genericWeaks.includes(lower)) return true;
  if (lower.includes(username.toLowerCase())) return true;
  return false;
}

async function seedUsersInDb() {
  try {
    // 1. Ensure default roles exist in the database (resolving foreign key dependency)
    const existingRoles = await db.select().from(roles).limit(1);
    if (!existingRoles || existingRoles.length === 0) {
      console.log("[DATABASE SEED] Seeding default system roles...");
      await db.insert(roles).values([
        { id: 1, nombre: "Administrador", descripcion: "Control absoluto del sistema ERP, configuraciones corporativas y reportes de auditoría global." },
        { id: 2, nombre: "FarmaceuticoRegente", descripcion: "Encargado de la regencia de medicamentos, control de registros sanitarios y recetas médicas." },
        { id: 3, nombre: "Almacenero", descripcion: "Gestión de almacenes, recepción de lotes de proveedores, movimientos de inventario y Kardex." },
        { id: 4, nombre: "Cajero", descripcion: "Apertura, cuadre de caja, y procesamiento de boletas y facturas de venta al público." }
      ]);
      try {
        await db.execute(sql`SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles))`);
      } catch (seqErr: any) {
        console.warn("[DATABASE SEED WARNING] Could not reset roles sequence id:", seqErr.message || seqErr);
      }
    }

    // 2. Ensure default sucursal "SUC-CENTRAL" exists in the database
    const existingBranches = await db.select().from(sucursales).where(eq(sucursales.id, "SUC-CENTRAL")).limit(1);
    if (!existingBranches || existingBranches.length === 0) {
      console.log("[DATABASE SEED] Seeding default branch SUC-CENTRAL...");
      await db.insert(sucursales).values({
        id: "SUC-CENTRAL",
        nombre: "Sucursal Central - Lima Centro",
        direccion: "Av. Tacna 420, Cercado de Lima",
        ubigeo: "150101",
        ciudad: "Lima",
        telefono: "01-4283921"
      });
    }

    // 3. Seed default users
    const results = await db.select().from(usuarios).where(eq(usuarios.username, "admin")).limit(1);
    if (!results || results.length === 0) {
      console.log("[DATABASE SEED] Seeding default users into SQL Database...");
      
      await db.insert(usuarios).values({
        username: "admin",
        nombre: "Arq. Luis Alejandro (Admin)",
        email: "admin@sigifar.pe",
        rolId: 1, // Administrador
        id_sucursal: "SUC-CENTRAL",
        activo: true,
        requiere_cambio_password: true,
        password: bcrypt.hashSync("admin", 10),
        estado_registro: "activo"
      });

      await db.insert(usuarios).values({
        username: "quimico.mendoza",
        nombre: "Dra. Patricia Mendoza Cruz (Química Regente)",
        email: "regente.mendoza@sigifar.pe",
        rolId: 2, // FarmaceuticoRegente
        id_sucursal: "SUC-CENTRAL",
        activo: true,
        requiere_cambio_password: true,
        password: bcrypt.hashSync("MendozaPassword1!", 10),
        estado_registro: "activo"
      });

      await db.insert(usuarios).values({
        username: "almacen.carlos",
        nombre: "Carlos Gonzales (Almacenero / Logística)",
        email: "almacen.carlos@sigifar.pe",
        rolId: 3, // Almacenero
        id_sucursal: "SUC-CENTRAL",
        activo: true,
        requiere_cambio_password: true,
        password: bcrypt.hashSync("CarlosPassword1!", 10),
        estado_registro: "activo"
      });

      await db.insert(usuarios).values({
        username: "cajero.sofia",
        nombre: "Sofía Quispe Pineda (Cajera)",
        email: "cajero.sofia@sigifar.pe",
        rolId: 4, // Cajero
        id_sucursal: "SUC-CENTRAL",
        activo: true,
        requiere_cambio_password: true,
        password: bcrypt.hashSync("SofiaPassword1!", 10),
        estado_registro: "activo"
      });

      console.log("[DATABASE SEED] Seeding completed successfully. All users seeded with bcrypt-hashed credentials.");
    } else {
      console.log("[DATABASE SEED] Admin user already exists. Skipping SQL database seeding.");
    }
  } catch (err: any) {
    console.error("[DATABASE SEED ERROR] Could not seed users or dependencies into SQL database:", err.message || err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Run the seeding logic on start
  await seedUsersInDb();

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Global Auth Middleware to enforce restricted scope on mustChangePassword status
  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Acceso no autorizado. Firma digital ausente." });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Load fresh state of user from database or fallback to verify permissions and active status
      const user = await findUserByUsername(decoded.username);
      if (!user) {
        return res.status(401).json({ error: "USER_NOT_FOUND", message: "Usuario inexistente en el padrón laboral." });
      }

      if (!user.activo) {
        return res.status(403).json({ error: "USER_SUSPENDED", message: "Su cuenta se encuentra inactiva o suspendida." });
      }

      // Check mandatory password change status (RESTRICTED MIDDLEWARE SCOPE)
      const requiresChange = user.requiere_cambio_password || decoded.requiresPasswordChange || isTemporaryPassword(user.password || "", user.username);
      
      if (requiresChange) {
        // Enforce restriction: if mustChangePassword is true, only allow /api/auth/change-password and /api/auth/logout
        const allowedPaths = ["/api/auth/change-password", "/api/auth/logout", "/api/auth/me"];
        const normalizedPath = req.path.toLowerCase();
        
        const isAllowed = allowedPaths.some(p => normalizedPath.endsWith(p));
        if (!isAllowed) {
          console.warn(`[SECURITY INTERCEPTED] User "${user.username}" attempted to query "${req.path}" without completing mandatory password update.`);
          return res.status(403).json({
            error: "PASSWORD_CHANGE_REQUIRED",
            code: "PASSWORD_CHANGE_REQUIRED",
            message: "Acceso Bloqueado. Debe cambiar su contraseña obligatoria de primer ingreso antes de consultar APIs."
          });
        }
      }

      // Attach decoded user and model context to request object
      (req as any).user = user;
      (req as any).tokenPayload = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "INVALID_TOKEN", message: "Firma digital inválida o expirada. Reinicie sesión." });
    }
  };

  // --- API ROUTING LAYOUT ---

  // 1. Auth Login Endpoint (secured with IP-based rate limiting)
  app.post("/api/auth/login", loginRateLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "MISSING_FIELDS", message: "Debe ingresar usuario y contraseña." });
    }

    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Las credenciales proporcionadas no corresponden a un colaborador activo." });
    }

    if (!user.activo) {
      return res.status(403).json({ error: "USER_SUSPENDED", message: "Su cuenta laboral se encuentra inactiva o suspendida." });
    }

    // Verify password
    const isValid = checkPassword(password, user.password || "");
    if (!isValid) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Contraseña incorrecta." });
    }

    // Determine password change status
    const isTemp = isTemporaryPassword(password, user.username) || user.requiere_cambio_password;
    
    // Issue token with RESTRICTED flag if they must change password
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        rol: user.rol,
        requiresPasswordChange: isTemp
      },
      JWT_SECRET,
      { expiresIn: isTemp ? "15m" : "8h" } // Short-lived restricted token for security
    );

    console.log(`[AUTH LOGIN] User "${user.username}" logged in. requiresPasswordChange=${isTemp}`);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        rol: user.rol,
        id_sucursal: user.id_sucursal,
        activo: user.activo,
        requiere_cambio_password: isTemp,
        must_change_password: isTemp,
        password_changed: !isTemp,
        email: user.email
      }
    });
  });

  // 2. Auth Change Password Endpoint
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const currentUserContext = (req as any).user;
    const isProduction = process.env.NODE_ENV === "production";

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "MISSING_FIELDS", message: "Debe proveer su contraseña actual y su nueva clave." });
    }

    // Double-verify current password
    const isCurrentValid = checkPassword(currentPassword, currentUserContext.password || "");
    if (!isCurrentValid) {
      return res.status(400).json({ error: "INVALID_CURRENT_PASSWORD", message: "La contraseña actual es incorrecta." });
    }

    // Validate strength of new password
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "WEAK_PASSWORD", message: "La nueva contraseña debe tener al menos 8 caracteres." });
    }

    if (isTemporaryPassword(newPassword, currentUserContext.username)) {
      return res.status(400).json({ error: "WEAK_PASSWORD", message: "La contraseña elegida es demasiado común o insegura." });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "REUSED_PASSWORD", message: "No puede reutilizar su contraseña temporal o actual." });
    }

    // Hash password with secure bcrypt algorithm
    const hashed = bcrypt.hashSync(newPassword, 10);

    // Update in database with optional exponential backoff
    let databaseUpdated = false;
    try {
      const dbUpdateOperation = async () => {
        await db.update(usuarios)
          .set({
            password: hashed,
            requiere_cambio_password: false,
            fecha_cambio_password: new Date()
          })
          .where(eq(usuarios.id, currentUserContext.id));

        // Log successful password change to database audit
        await db.insert(auditorias).values({
          id_usuario: currentUserContext.id,
          usuario_nombre: `${currentUserContext.nombre} (${currentUserContext.rol})`,
          modulo: "USUARIOS",
          accion: "CAMBIO_CONTRASENA",
          detalle: `Cambio obligatorio de contraseña de primer inicio de sesión completado con éxito. IP: ${req.ip || "127.0.0.1"}`,
          fecha: new Date(),
          ip_dispositivo: req.ip || "127.0.0.1"
        });
      };

      if (isProduction) {
        await executeWithRetry(dbUpdateOperation, 3, 500);
      } else {
        await dbUpdateOperation();
      }
      databaseUpdated = true;
      console.log(`[DATABASE PASSWORD UPDATE & AUDIT] Success for user id=${currentUserContext.id}`);
    } catch (err: any) {
      console.error("[DATABASE UPDATE / AUDIT FAILED] Cloud SQL offline or unreachable. Error:", err.message || err);
      if (isProduction) {
        return res.status(503).json({
          error: "DATABASE_UNAVAILABLE",
          message: "No se pudo actualizar la contraseña. La base de datos central no está disponible y los reintentos con exponential backoff fueron agotados."
        });
      }
    }

    // Update offline fallback registry to stay synchronized ONLY if not in production
    if (!isProduction) {
      const fallbackUserIdx = fallbackUsers.findIndex(u => u.username.toLowerCase() === currentUserContext.username.toLowerCase());
      if (fallbackUserIdx !== -1) {
        fallbackUsers[fallbackUserIdx].password = hashed;
        fallbackUsers[fallbackUserIdx].requiere_cambio_password = false;
        fallbackUsers[fallbackUserIdx].must_change_password = false;
        fallbackUsers[fallbackUserIdx].password_changed = true;
      }
    }

    // Issue NEW, unrestricted, full-access JWT session token
    const unrestrictedToken = jwt.sign(
      {
        id: currentUserContext.id,
        username: currentUserContext.username,
        rol: currentUserContext.rol,
        requiresPasswordChange: false
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    console.log(`[AUTH PASSWORD CHANGE COMPLETE] User "${currentUserContext.username}" successfully established a secure bcrypt password. Fully authenticated JWT session generated.`);

    return res.json({
      success: true,
      token: unrestrictedToken,
      user: {
        ...currentUserContext,
        password: hashed,
        requiere_cambio_password: false,
        must_change_password: false,
        password_changed: true
      }
    });
  });

  // 3. Get Active Session details (Self-Check validation)
  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = (req as any).user;
    const tokenPayload = (req as any).tokenPayload;

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        rol: user.rol,
        id_sucursal: user.id_sucursal,
        activo: user.activo,
        requiere_cambio_password: tokenPayload.requiresPasswordChange || user.requiere_cambio_password,
        must_change_password: tokenPayload.requiresPasswordChange || user.requiere_cambio_password,
        password_changed: !(tokenPayload.requiresPasswordChange || user.requiere_cambio_password),
        email: user.email
      }
    });
  });

  // 4. Sample protected backend resource to demonstrate middleware interception
  app.get("/api/dashboard/stats", requireAuth, (req, res) => {
    return res.json({
      status: "SECURE_ACCESS_GRANTED",
      data: {
        dailySales: 1850.40,
        transactionsCount: 34,
        activeSocioPercentage: 42,
        systemAuditorState: "Secured"
      }
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    return res.json({ success: true, message: "Sesión cerrada correctamente." });
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve SPA index.html for all non-matched paths
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SIGIFAR SERVER] Full-stack architecture live on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
  });
}

startServer().catch((error) => {
  console.error("Critical server startup failure:", error);
});
