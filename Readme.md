# SQL to CQL Microservices 🚀

Sistema de microservicios para la traducción y ejecución de consultas SQL a CQL (Cassandra Query Language), con gestión completa de usuarios, permisos y bases de datos.

## 📋 Descripción

Este proyecto implementa una arquitectura de microservicios que permite:
- **Traducción automática** de consultas SQL a CQL
- **Gestión de usuarios** con autenticación y autorización
- **Control de permisos** granular por operaciones y keyspaces
- **Administración de bases de datos** Cassandra

## 🏗️ Arquitectura

El sistema está compuesto por 3 microservicios independientes:

### 🔄 Puerto 3000 - Servicio de Traducción (translator)
**Base URL:** `http://localhost:3000/api`

**Responsabilidades:**
- Traducción de SQL a CQL
- Ejecución de consultas en Cassandra
- Normalización de nombres de keyspaces

**Endpoints:**
- `POST /translator/translate` - Traduce consultas SQL a CQL
- `POST /translator/execute` - Ejecuta consultas SQL/CQL

### 🔐 Puerto 3001 - Servicio de Autenticación (auth)
**Base URL:** `http://localhost:3001/api`

**Responsabilidades:**
- Autenticación de usuarios
- Registro de nuevos usuarios
- Gestión de contraseñas
- Administración de usuarios (activar/desactivar/eliminar)

**Endpoints:**
- `POST /auth/login` - Inicio de sesión
- `POST /users` - Registro de usuarios
- `GET /users/find-by-cedula/{cedula}` - Búsqueda de usuarios
- `POST /users/admin/generate-temp-pin` - Generar PIN temporal
- `POST /users/verify-credentials` - Verificar credenciales
- `POST /users/change-password` - Cambiar contraseña
- `DELETE /admin/users` - Eliminar usuario
- `POST /admin/users/deactivate` - Desactivar usuario

### 🛡️ Puerto 3002 - Servicio de Permisos (permissions)
**Base URL:** `http://localhost:3002/api`

**Responsabilidades:**
- Gestión de permisos por operación
- Asignación de keyspaces a usuarios
- Control de roles (admin/usuario)
- Administración de keyspaces

**Endpoints:**
- `GET /admin/keyspaces` - Obtener todos los keyspaces
- `GET /admin/keyspaces/user?cedula={cedula}` - Keyspaces de usuario
- `POST /admin/keyspaces/updateuser-keyspaces` - Actualizar keyspaces de usuario
- `POST /admin/keyspaces/updatesingle-keyspace` - Añadir/quitar keyspace individual
- `GET /admin/keyspaces/search?keyspaceName={name}` - Buscar keyspace
- `GET /admin/keyspaces/{keyspace}/users` - Usuarios con acceso al keyspace
- `DELETE /admin/keyspaces` - Eliminar keyspace
- `GET /admin/keyspaces/tables?keyspace={keyspace}` - Obtener tablas de keyspace
- `DELETE /admin/keyspaces/cache/tables/{keyspace}` - Invalidar caché de tablas
- `POST /admin/permissions/search` - Buscar usuario para cambio de rol
- `POST /admin/permissions/change-role` - Cambiar rol de usuario
- `POST /admin/permissions/get-user-permissions` - Obtener permisos de usuario
- `POST /admin/permissions/update-user-permission` - Actualizar permisos

### Prerrequisitos
- Node.js 
- NPM 
- Cassandra
- Puertos 3000, 3001, 3002 disponibles


