# Sistema Odontológico · Frontend

Interfaz web del Sistema Odontológico integrado a DoctorKyn (Vue 3 + TypeScript + Vite). Consume el backend
`sistema-odontologico-backend` únicamente a través del API Gateway.

| Módulo | Requisito | Pantallas |
| --- | --- | --- |
| Acceso | RF-14 | Inicio de sesión, renovación automática del token, cierre por sesión expirada |
| Pacientes | RF-01 | Listado con búsqueda, registro/edición con validación de cédula y aviso de duplicados, ficha con alerta de alergias, antecedentes (incl. DoctorKyn), consentimientos y bitácora |
| Personal clínico | RF-07 | Listado con filtros, registro/edición (especialidad, registro ACESS/SENESCYT, consultorios, usuario vinculado), horario semanal |
| Consultorios | RF-07 | Alta, edición y activación |
| Usuarios y roles | RF-08 | Usuarios, creación con rol y contraseña temporal, cambio de roles, activación, matriz rol × permiso, bitácora de cambios |
| Dentigrama | RF-03 | Dentigrama FDI (permanente, temporal y mixta) con simbología del formulario 033 del MSP, consulta clínica, hallazgos por pieza y cara, resolución/anulación, historial por pieza y comparación entre consultas; también como pestaña de la ficha del paciente |

Agenda, tratamientos, presupuestos y reportes aparecen en el menú como "Pronto" (siguientes sprints).

## Requisitos

- Node.js 24 LTS.
- Backend levantado (identity, dental-records, dental-practice y gateway). Ver `local-runtime/iniciar.ps1`.

## Configuración

```sh
cp .env.example .env.local   # completar VITE_CLIENT_TOKEN con GATEWAY_CLIENT_TOKEN del backend
npm install
npm run dev                  # http://localhost:5173 (origen permitido por el CORS del gateway)
```

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequeo de tipos (`vue-tsc`) y build de producción en `dist/` |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run e2e` | Pruebas de sistema en navegador (Playwright) contra el backend real; requiere `npm run dev` y `npx playwright install chromium` la primera vez |

## Decisiones

- **Permisos:** el menú, los botones y las rutas se muestran según `GET /identity/api/users/me`. Es solo comodidad visual: cada servicio vuelve a validar el permiso.
- **Sesión:** tokens en `sessionStorage` (se borran al cerrar la pestaña, útil en equipos compartidos del consultorio). Un 401 intenta renovar el token una vez y, si no puede, vuelve al login.
- **Errores:** todos los servicios responden `{ error: { errorMessage, errors[{field, message}] } }`; los formularios muestran el mensaje general y el error de cada campo.
- **UI:** PrimeVue 4 (licencia MIT). PrimeVue 5 cambió a licencia comercial con clave, por eso no se usa.
- **DoctorKyn:** la integración como módulo federado dentro del portal (Module Federation) queda para cuando el shell de DoctorKyn esté disponible; la app está organizada para exponerse como remoto sin reescribir pantallas.
