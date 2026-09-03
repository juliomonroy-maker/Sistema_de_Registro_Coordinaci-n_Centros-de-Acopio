# Sistema de Registro y Coordinación de Centros de Acopio

Instrucciones y especificación del proyecto integrador (reto de hackatón universitario).

## 1. Contexto y problema

Cuando ocurre una contingencia (huracán, campaña, etc.), la universidad coordina, a través de su área de compromiso social, centros de acopio en distintos puntos (organizaciones de la sociedad civil, escuelas, centros comunitarios).

Hoy cada centro resguarda sus donativos y funciona con sus propias reglas, sin control centralizado: no se sabe en tiempo real qué tiene cada centro, no hay trazabilidad de entradas, entregas, merma ni transferencias, y la coordinación central no tiene visibilidad global para decidir dónde enviar recursos.

Todos los equipos del hackatón construyen esta misma plataforma y se evalúan con la misma rúbrica.

## 2. Objetivo

Construir una plataforma de coordinación de centros de acopio donde:

- Un Coordinador general registra todos los centros y las campañas.
- Cada centro de acopio tiene su propio sistema: un encargado con cuenta propia registra recepciones, entregas, merma y transferencias.
- El stock se calcula automáticamente por centro + campaña y puede corregirse a mano mediante un movimiento de ajuste.
- Existen dashboards global (coordinador) y por centro (encargado); el agregado por campaña corresponde al rol opcional Líder de campaña.

## 3. Roles y permisos (MVP)

| Rol | Permisos |
|---|---|
| Coordinador general | Registra y activa/desactiva centros y campañas; ve el dashboard global y de todos los centros; consulta todos los movimientos |
| Encargado de centro | Cuenta propia por centro; registra recepciones, entregas, merma y transferencias; ve el inventario y el dashboard de su centro |
| Voluntario de centro | Apoya el registro de recepciones (donaciones) y entregas en el centro; NO configura ni registra merma |
| Institución receptora | Ve las entregas que se le canalizan y las confirma como recibidas |

El donante **no tiene cuenta ni inicia sesión**: sus donaciones las registra el voluntario o el encargado al llegar al centro, y pueden ser anónimas o con datos del donante.

### Rol opcional

- **Líder de campaña**: gestiona una campaña (centros participantes, fechas, metas) y ve el dashboard agregado de esa campaña.

## 4. Modelo de datos

- **Campaña**: nombre, fechas de inicio y fin, descripción, activa.
- **Centro de acopio**: nombre, institución, ubicación, encargado, campañas en las que participa, activo.
- **Artículo**: categoría (no perecedero, perecedero, ropa, limpieza, medicamento, otro) y unidad (pieza, kg, l, bolsa, caja).
- **Movimiento**: tipo, centro, campaña, artículo, cantidad, fecha, actor y destino.
  - Tipos: recepción, entrega, merma, transferencia-entrada, transferencia-salida, ajuste.
  - Motivo (obligatorio en merma y ajuste): caducidad, daño, pérdida, corrección.
- **Donación**: se registra como una recepción; el donante puede quedar anónimo o con datos.

## 5. Regla de stock

El stock se calcula automáticamente sumando los movimientos, pero puede corregirse a mano registrando un movimiento de ajuste:

```
stock(centro, campaña) = recepciones + transferencias-entrada + ajustes(+)
                        - entregas - merma - transferencias-salida - ajustes(-)
```

Beneficios: robustez (las correcciones quedan como movimientos con motivo y actor), trazabilidad (todo movimiento tiene actor y fecha) y simplicidad de uso (el usuario registra movimientos, no edita números sueltos).

## 6. Flujos principales

### 6.1 Recepción de donación

1. El donante llega al centro y entrega sus artículos.
2. El voluntario o encargado registra la recepción: artículo, cantidad, campaña activa y, si el donante acepta, sus datos (puede ser anónima).
3. El stock del centro se incrementa con el movimiento de recepción.

### 6.2 Entrega / canalización

1. El encargado registra la salida de artículos hacia una institución receptora o beneficiario.
2. El stock del centro se reduce.
3. La institución receptora puede confirmar la entrega como recibida.

### 6.3 Merma

1. El encargado registra la salida por pérdida indicando motivo obligatorio (caducidad, daño, pérdida).
2. El stock se reduce y el dato queda registrado con trazabilidad (actor, fecha, motivo) para reportes de pérdidas.

### 6.4 Transferencia entre centros

1. El encargado de un centro registra una transferencia-salida hacia otro centro.
2. El centro destino registra la transferencia-entrada correspondiente.
3. Ambos movimientos deben quedar ligados (misma operación) para mantener la trazabilidad y evitar que el stock total del sistema se descuadre.

### 6.5 Ajuste manual

1. El encargado (o coordinador) registra un movimiento de ajuste positivo o negativo, indicando motivo obligatorio (corrección u otro).
2. El stock se recalcula automáticamente incluyendo este movimiento; no se edita el número de stock directamente.

## 7. Dashboards

- **Dashboard global (Coordinador general)**: visibilidad de todos los centros y campañas, consulta de todos los movimientos.
- **Dashboard por centro (Encargado)**: inventario y movimientos del propio centro.
- **Dashboard por campaña (Líder de campaña, rol opcional)**: agregado de todos los centros participantes en esa campaña.

## 8. Stack técnico

- **Frontend + Backend**: Next.js (React) con TypeScript — frontend y API en el mismo proyecto, deploy sencillo sin depender de localhost, escalable.
- **Base de datos**: PostgreSQL — integridad referencial fuerte, transacciones atómicas (clave para transferencias: salida + entrada como operación única).
- **ORM**: Prisma — modelo de datos legible, migraciones automáticas, tipos TypeScript generados automáticamente.
- **Autenticación**: NextAuth.js (Auth.js) o Clerk — autenticación real por rol, integración nativa con Next.js.
- **Hosting**:
  - Frontend/Backend: Vercel
  - PostgreSQL gestionado: Supabase o Neon
  - Planes gratuitos suficientes; permite acceso desde cualquier dispositivo (no localhost).

## 9. Puntos clave a no perder de vista

- Las transferencias entre centros deben registrarse como dos movimientos ligados (salida en un centro, entrada en otro) dentro de una transacción atómica.
- Merma y ajuste siempre requieren motivo obligatorio.
- El stock nunca se edita directamente: todo cambio pasa por un movimiento.
- Todo movimiento debe guardar actor (quién lo registró) y fecha, para trazabilidad completa.
- El voluntario tiene permisos limitados: puede registrar recepciones y entregas, pero no merma.
- El donante no requiere cuenta; sus datos son opcionales (puede ser anónimo).
