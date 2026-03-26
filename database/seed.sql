-- ============================================
-- Encuestas Zener Chile - Datos Iniciales
-- ============================================

-- Hash de contraseña para admin (RUT: 11111111-1, Password: admin123)
-- Generado con: bcrypt.hash('admin123', 10)
INSERT INTO usuarios (rut, password_hash, nombre, apellido, email, rol)
VALUES (
  '11111111-1',
  '$2a$10$VrhGEx2KGVguIaEjQD1yZeCX7H8aNHJyghB9IovyPAok7rQEItLaa',
  'Administrador',
  'Zener',
  'admin@zener-austral.cl',
  'admin'
);

-- NOTA: Ejecutar este comando para generar el hash real de la contraseña:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(h => console.log(h))"
