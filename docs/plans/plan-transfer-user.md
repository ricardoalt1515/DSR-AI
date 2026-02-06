Plan simplificado y endurecido: Transfer user entre organizaciones
Complejidad: Baja-Media
Objetivo: reemplazar SQL manual por flujo admin seguro, auditable y facil de operar.

Principio rector
- Minimizar superficie: mover solo `users.organization_id` y, si aplica, `projects.user_id`.
- Guardrails duros en backend; frontend solo orquesta UX.
- 1 endpoint, 1 transaccion, 1 log de auditoria por intento.

Sprint 1 - Backend minimo seguro (API demoable)
- Crear endpoint superadmin-only:
  - `POST /api/v1/admin/users/{user_id}/transfer-organization`
- Definir contrato minimo (ver seccion Contrato API).
- Implementar validaciones criticas previas + revalidacion dentro de TX.
- Ejecutar operacion atomica:
  - lock de usuario objetivo (`FOR UPDATE`)
  - lock/logica para proteger regla de ultimo org_admin (evitar carrera entre transfers concurrentes)
  - reasignar proyectos activos (si corresponde)
  - transferir usuario de org
- Emitir auditoria estructurada en success/error.

Sprint 2 - Tests de guardrails (CI demoable)
- Agregar `backend/tests/test_admin_users_transfer.py`.
- Cubrir happy paths minimos:
  - success sin proyectos activos
  - success con proyectos activos + reasignacion valida
- Cubrir rechazos criticos:
  - actor no superadmin
  - user/org destino inexistente
  - destino igual origen
  - user superuser
  - ultimo org_admin
  - proyectos activos sin `reassign_to_user_id`
  - `reassign_to_user_id` invalido (otra org, inactivo, no org_admin)
  - `reassign_to_user_id == user_id` (bloqueado)
  - concurrencia: 2 transfers simultaneos no deben romper regla de ultimo org_admin

Sprint 3 - Frontend minimo operativo + rollout controlado
- Integrar cliente API admin users.
- En detalle de org, accion `Move member` con modal minimo:
  - org destino (required)
  - reason (required)
  - reassign admin (required solo si backend lo exige por proyectos activos)
- Mostrar errores backend por mensaje accionable.
- Refetch lista de miembros al success.
- Runbook corto en `docs/agents/workflows.md`: usar API como camino estandar; SQL solo break-glass.

---

Que quitar o posponer (fuera de v1)
- Dry-run endpoint/respuesta simulada.
- Bulk transfer (multiples usuarios en una llamada).
- Idempotency keys (util, pero no bloqueante para v1 interno).
- Historial UI avanzado de transferencias (tabla/filtros/export).
- Alertas automaticas complejas; dejar solo revision de logs inicial.
- Cualquier migracion de entidades extra (feedback/files/history). No mover en v1.

Razon: reduce complejidad operativa y de testing sin perder seguridad core.

---

Contrato API minimo recomendado

Endpoint
- `POST /api/v1/admin/users/{user_id}/transfer-organization`
- Auth: `CurrentSuperUser` obligatorio.

Request
```json
{
  "target_organization_id": "uuid",
  "reason": "string min 10, max 500",
  "reassign_to_user_id": "uuid | null"
}
```

Regla de request
- `reassign_to_user_id` puede omitirse/null, pero se vuelve obligatorio si el usuario tiene proyectos activos en org origen.
- `reassign_to_user_id` no puede ser igual al `user_id` transferido.

Response success (200)
```json
{
  "user_id": "uuid",
  "from_organization_id": "uuid",
  "to_organization_id": "uuid",
  "reassigned_projects_count": 0,
  "transferred_at": "ISO-8601"
}
```

Errores minimos
- `403 FORBIDDEN`
  - `code`: `FORBIDDEN_SUPERADMIN_REQUIRED`
- `404 NOT_FOUND`
  - `code`: `USER_NOT_FOUND` | `TARGET_ORG_NOT_FOUND` | `REASSIGN_USER_NOT_FOUND`
- `400 BAD_REQUEST`
  - `code`: `TARGET_ORG_INACTIVE` | `SAME_ORGANIZATION` | `SUPERUSER_TRANSFER_BLOCKED` | `LAST_ORG_ADMIN_BLOCKED` | `REASSIGN_REQUIRED` | `REASSIGN_INVALID`
- `409 CONFLICT` (opcional, solo si separan conflictos de estado concurrente)
  - `code`: `TRANSFER_STATE_CONFLICT`

Formato error recomendado
```json
{
  "error": {
    "code": "REASSIGN_REQUIRED",
    "message": "User has active projects; provide reassign_to_user_id"
  }
}
```

---

Reglas de negocio minimas imprescindibles
- Solo superadmin puede ejecutar transferencia.
- Usuario objetivo debe existir y no ser superuser.
- Usuario objetivo debe tener org origen asignada.
- Org destino debe existir, estar activa y ser distinta del origen.
- Si usuario es ultimo `org_admin` activo del origen, bloquear.
- Definicion de proyecto activo: `projects.organization_id = from_org_id AND projects.user_id = user_id AND projects.archived_at IS NULL`.
- Si tiene proyectos activos en origen, exigir `reassign_to_user_id` valido.
- `reassign_to_user_id` debe pertenecer a org origen, estar activo y tener rol `org_admin`.
- `reassign_to_user_id` no puede ser el mismo usuario transferido.
- Transferencia + reasignacion ocurren en una sola transaccion atomica.
- Validacion de ultimo `org_admin` debe quedar protegida contra concurrencia en la misma TX.
- No mover otras entidades fuera de `projects.user_id`.
- Registrar auditoria estructurada por intento (ok/error).

---

Checklist super concreta

Backend
- [ ] Schema request/response en `backend/app/schemas/`.
- [ ] Ruta admin en `backend/app/api/v1/admin_users.py`.
- [ ] Servicio transaccional en `backend/app/services/`.
- [ ] Locks + revalidacion in-TX implementados.
- [ ] Error codes estables y mensajes accionables.
- [ ] Audit log estructurado con actor/target/from/to/reason/result/request_id.

Frontend
- [ ] Cliente `transferOrganization(...)` en `frontend/lib/api/admin-users.ts`.
- [ ] Accion `Move member` en `frontend/app/admin/organizations/[id]/page.tsx`.
- [ ] Modal con 3 campos minimos (destino, reason, reasignacion condicional).
- [ ] Mapeo de error code -> copy accionable.
- [ ] Refetch miembros tras success.

Tests
- [ ] Backend: casos success y rechazos criticos (lista Sprint 2).
- [ ] Backend: assert de atomicidad (sin estados parciales ante error).
- [ ] Backend: assert de concurrencia (no dejar org origen sin org_admin por carrera).
- [ ] Frontend: smoke de submit success y error renderizado.
- [ ] Ejecutar `cd backend && make check`.
- [ ] Ejecutar `cd frontend && bun run check:ci`.

Rollout
- [ ] Staging: 1 transferencia controlada con proyectos activos.
- [ ] Verificar logs de auditoria y conteo reasignado.
- [ ] Habilitar uso solo a superadmins internos.
- [ ] Primera semana: revisar fallos recurrentes por `error.code`.
- [ ] Mantener SQL manual como break-glass documentado.
