# 🏢 Company Sector Migration

## 📋 Resumen

Sector y subsector ahora se almacenan a nivel de **Company** en lugar de Assessment (Project), lo que es más lógico ya que:
- Una empresa tiene un sector principal que no cambia
- Permite filtros más eficientes
- Reduce redundancia (no preguntar en cada assessment)
- Mejora consistencia de datos

---

## 🗄️ Cambios en Base de Datos

### Schema Changes

**Tabla:** `companies`

```sql
-- Nuevas columnas
ALTER TABLE companies 
ADD COLUMN sector VARCHAR(50) NOT NULL,
ADD COLUMN subsector VARCHAR(100) NOT NULL;

-- Índice para filtros
CREATE INDEX ix_companies_sector ON companies(sector);
```

### Valores Permitidos

**Sector:**
- `commercial` - Comercial (restaurants, hotels, malls)
- `industrial` - Industrial (manufacturing, processing)
- `residential` - Residencial (homes, apartments)
- `municipal` - Municipal (government, utilities)
- `other` - Otros

**Subsector:** (ejemplos)
- `food_processing` - Procesamiento de alimentos
- `hotel` - Hoteles
- `automotive_manufacturing` - Manufactura automotriz
- `restaurant` - Restaurantes
- `water_utility` - Servicios de agua
- etc.

---

## 🔧 Archivos Modificados

### Backend (Python)

1. **app/models/company.py**
   - ✅ Agregado `sector` column
   - ✅ Agregado `subsector` column
   - ✅ Índice en sector

2. **app/schemas/company.py**
   - ✅ `CompanyBase`: sector/subsector required
   - ✅ `CompanyCreate`: hereda campos
   - ✅ `CompanyUpdate`: sector/subsector optional

3. **alembic/versions/20251106_0740-d5e6f7g8h9i0_add_sector_to_company.py**
   - ✅ Migration nueva
   - ✅ Backfill automático con 'other'
   - ✅ Índice creado

4. **scripts/verify_company_sector.py**
   - ✅ Script de verificación
   - ✅ Checks de integridad
   - ✅ Test de CRUD

### API (No cambios necesarios)

- ✅ `app/api/v1/companies.py` - Funciona automáticamente con `model_dump()`
- ✅ GET /api/v1/companies - Retorna sector/subsector
- ✅ POST /api/v1/companies - Requiere sector/subsector
- ✅ PUT /api/v1/companies/{id} - Permite actualizar sector/subsector

---

## 🚀 Pasos de Implementación

### 1. Aplicar Migration

```bash
cd backend

# Verificar migration pendiente
alembic current
alembic heads

# Aplicar migration
alembic upgrade head

# Verificar
alembic current
# Debería mostrar: d5e6f7g8h9i0 (head)
```

### 2. Verificar Integridad

```bash
# Correr script de verificación
python -m scripts.verify_company_sector

# Debería mostrar:
# ✅ All companies have sector
# ✅ All companies have subsector
# ✅ Successfully created test company
# ✅ ALL CHECKS PASSED
```

### 3. Probar API Manualmente

```bash
# Crear company con nuevo schema
curl -X POST http://localhost:8000/api/v1/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Honda Manufacturing",
    "industry": "Automotive",
    "sector": "industrial",
    "subsector": "automotive_manufacturing",
    "contact_name": "Juan Pérez",
    "contact_email": "[email protected]"
  }'

# Listar companies (debe incluir sector/subsector)
curl http://localhost:8000/api/v1/companies \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Validación

### Checklist Backend

- [ ] Migration aplicada sin errores
- [ ] Todas las companies tienen sector/subsector
- [ ] POST /companies requiere sector/subsector (400 si falta)
- [ ] GET /companies retorna sector/subsector
- [ ] PUT /companies puede actualizar sector/subsector
- [ ] Script de verificación pasa todos los checks

### Datos de Prueba

Si necesitas datos de prueba:

```sql
-- Actualizar companies existentes con sectores reales
UPDATE companies 
SET sector = 'industrial', subsector = 'automotive_manufacturing'
WHERE name LIKE '%Honda%' OR name LIKE '%Toyota%';

UPDATE companies 
SET sector = 'commercial', subsector = 'restaurant'
WHERE name LIKE '%Restaurant%' OR name LIKE '%Food%';

UPDATE companies 
SET sector = 'industrial', subsector = 'food_processing'
WHERE industry LIKE '%Food%' AND name NOT LIKE '%Restaurant%';
```

---

## 🔄 Rollback (Si es necesario)

```bash
# Revertir migration
alembic downgrade -1

# Verificar
alembic current
# Debería mostrar: c1d2e3f4g5h6
```

**Nota:** El rollback elimina las columnas sector/subsector. Los datos se perderán.

---

## 📊 Próximos Pasos (Frontend)

Una vez que backend esté funcionando:

1. **Actualizar Types** (`frontend/lib/types/company.ts`)
   - Agregar `sector: Sector`
   - Agregar `subsector: Subsector`

2. **Actualizar CreateCompanyDialog**
   - Agregar SectorSelector component
   - UI de 2 pasos (Basic Info → Sector)

3. **Simplificar PremiumProjectWizard**
   - Remover Step 2 (sector selection)
   - 3 pasos en lugar de 4

4. **Actualizar Filtros**
   - Dashboard: filtro por sector
   - ProjectCard: mostrar sector de company

---

## 🐛 Troubleshooting

### Error: "column sector does not exist"
- Migration no aplicada correctamente
- Solución: `alembic upgrade head`

### Error: "null value in column sector violates not-null constraint"
- Backfill no se ejecutó
- Solución: Ejecutar manualmente:
  ```sql
  UPDATE companies SET sector = 'other', subsector = 'other' WHERE sector IS NULL;
  ```

### Error: "validation error for CompanyCreate"
- Frontend enviando data sin sector/subsector
- Solución: Actualizar frontend primero o enviar valores temporales

---

## 📝 Notas

- ✅ **Backward Compatibility**: El campo `industry` se mantiene para compatibilidad
- ✅ **Data Integrity**: Backfill automático asegura que todas las companies tengan sector
- ✅ **Performance**: Índice en sector optimiza filtros
- ✅ **Fail Fast**: NOT NULL constraint previene datos incompletos

---

## ✨ Resultado Final

**Antes:**
```python
Company(name="Honda", industry="Automotive")
Assessment(sector="industrial", subsector="automotive")  # ❌ Redundante
```

**Después:**
```python
Company(
    name="Honda", 
    industry="Automotive",
    sector="industrial",              # ✅ Una vez
    subsector="automotive_manufacturing"  # ✅ En company
)
Assessment(name="Waste Audit 2024")  # ✅ Sin sector
```

---

**Status:** ✅ Backend Implementation Complete - Ready for Frontend Integration
