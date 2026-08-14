# Formulario flotante de registro de simpatizantes

**Fecha:** 2026-08-06 · **Estado:** Aprobado por el usuario

## Objetivo

Permitir que cualquier visitante del landing se registre como simpatizante desde un
formulario flotante, capturando automáticamente las coordenadas GPS del dispositivo
como referencia de dónde se hizo cada registro.

## Alcance

### UI (landing)

- Botón flotante fijo en la esquina inferior **izquierda** (ScrollToTop ocupa la derecha),
  texto "Únete", color de campaña (#E90305).
- Al tocarlo se abre un panel flotante con el formulario:
  - Tipo de documento: selector — **DNI (por defecto)**, Carné de Extranjería, Pasaporte.
  - Número de documento (DNI: exactamente 8 dígitos; CE/Pasaporte: 6–12 alfanuméricos).
  - Nombre completo (2–120 caracteres).
  - Número de celular.
  - Distrito: selector con los 11 distritos de Madre de Dios.
- Al abrir el panel se pide la geolocalización en segundo plano
  (`navigator.geolocation`). La persona no ingresa ubicación manualmente.
- Si el permiso es rechazado o falla, el registro se envía **sin coordenadas** —
  nunca se bloquea el envío por falta de GPS.
- Mensajes de éxito y de error por campo. Al éxito, el panel se cierra tras confirmar.

### Base de datos (Prisma — modelo `Supporter` existente)

- Nuevo enum `DocumentType { dni, ce, passport }`.
- Campos nuevos en `Supporter`:
  - `docType DocumentType @default(dni)`
  - `docNumber String?` (opcional para no romper registros existentes)
  - `latitude Float?`, `longitude Float?`, `gpsAccuracy Float?` (precisión en metros)
- Restricción única `@@unique([docType, docNumber])`: un documento repetido recibe
  el mensaje "Este documento ya está registrado. ¡Gracias por tu apoyo!".

### API (`POST /api/apoyos` existente)

- Validar los campos nuevos (tipo/número de documento, coordenadas en rango
  lat −90..90, lng −180..180; fuera de rango se descartan sin bloquear).
- Conservar protecciones existentes: honeypot `website` y rate limit 3/hora/IP.
- Documento duplicado responde 409 con mensaje amable.

### Mapa de apoyos

Sin cambios: el formulario pide distrito, así que los nuevos registros siguen
apareciendo como puntos en el mapa por distrito.

### Admin

Referencia mínima: donde el admin ve el detalle del simpatizante se muestra el
documento y, si hay coordenadas, un enlace a Google Maps para ubicar el registro.

## Fuera de alcance

- Deducción automática de distrito desde coordenadas.
- Verificación del DNI contra RENIEC.
- Depuración de registros antiguos sin documento.
