<script setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { supabase } from '../lib/supabase';

const route = useRoute();
const { locale } = useI18n();
const tr = (es, en) => locale.value === 'es' ? es : en;
const businessId = computed(() => route.params.id);
const business = ref(null);
const services = ref([]);
const employees = ref([]);
const assignments = ref([]);
const loading = ref(true);
const saving = ref(false);
const changingId = ref(null);
const error = ref('');
const success = ref('');
const showForm = ref(false);
const editingId = ref(null);
const editor = ref(null);
const form = ref(blankForm());
const noticeRef = ref(null);

function blankForm() {
  return { name: '', description: '', duration_minutes: 45, price: '0', currency: 'ARS', show_price: true, employee_ids: [] };
}
function assignedNames(serviceId) {
  const ids = assignments.value.filter(a => a.service_id === serviceId).map(a => a.employee_id);
  return employees.value.filter(e => ids.includes(e.id)).map(e => e.full_name).join(', ');
}
function money(service) {
  return new Intl.NumberFormat(locale.value === 'es' ? 'es-AR' : 'en-US', {
    style: 'currency', currency: service.currency
  }).format(Number(service.price));
}
function resetForm() { showForm.value = false; editingId.value = null; form.value = blankForm(); }
function openForm(service = null) {
  error.value = ''; success.value = '';
  editingId.value = service?.id || null;
  form.value = service ? {
    name: service.name, description: service.description || '', duration_minutes: service.duration_minutes,
    price: String(service.price), currency: service.currency, show_price: service.show_price,
    employee_ids: assignments.value.filter(a => a.service_id === service.id).map(a => a.employee_id)
  } : blankForm();
  showForm.value = true;
  nextTick(() => editor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
async function loadData() {
  loading.value = true; error.value = '';
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error(tr('Iniciá sesión.', 'Please sign in.'));
    const { data: b, error: be } = await supabase.from('businesses').select('id,name')
      .eq('id', businessId.value).eq('owner_id', auth.user.id).single();
    if (be) throw be;
    business.value = b;
    const [sr, er] = await Promise.all([
      supabase.from('services').select('*').eq('business_id', businessId.value).order('created_at', { ascending: false }),
      supabase.from('employees').select('id,full_name,is_active').eq('business_id', businessId.value).order('full_name')
    ]);
    if (sr.error) throw sr.error;
    if (er.error) throw er.error;
    services.value = sr.data || [];
    employees.value = er.data || [];
    if (services.value.length) {
      const { data: a, error: ae } = await supabase.from('employee_services')
        .select('service_id,employee_id').in('service_id', services.value.map(s => s.id));
      if (ae) throw ae;
      assignments.value = a || [];
    } else assignments.value = [];
  } catch (err) {
    console.error(err); error.value = tr('No se pudieron cargar los servicios: ', 'Could not load services: ') + err.message;
  } finally { loading.value = false; }
}
async function saveService() {
  error.value = ''; success.value = '';
  const f = form.value;
  const price = Number(f.price);
  const duration = Number(f.duration_minutes);
  if (f.name.trim().length < 2 || f.name.trim().length > 100) {
    error.value = tr('El nombre debe tener entre 2 y 100 caracteres.', 'Name must be between 2 and 100 characters.'); return;
  }
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
    error.value = tr('La duración debe ser entre 5 y 480 minutos.', 'Duration must be between 5 and 480 minutes.'); return;
  }
  if (f.price === '' || !Number.isFinite(price) || price < 0) {
    error.value = tr('Ingresá un precio válido.', 'Enter a valid price.'); return;
  }
  if (!f.employee_ids.length) {
    error.value = tr('Seleccioná al menos un empleado.', 'Select at least one employee.'); return;
  }
  if (f.employee_ids.some(id => !employees.value.some(e => e.id === id && e.is_active))) {
    error.value = tr('Los empleados seleccionados deben estar activos.', 'Selected employees must be active.'); return;
  }
  saving.value = true;
  try {
    const { error: se } = await supabase.rpc('save_service_with_employees', {
      p_business_id: businessId.value, p_service_id: editingId.value,
      p_name: f.name.trim(), p_description: f.description.trim(),
      p_duration_minutes: duration, p_price: price, p_currency: f.currency,
      p_show_price: f.show_price, p_employee_ids: f.employee_ids
    });
    if (se) throw se;
    resetForm(); await loadData();
    success.value = tr('Servicio guardado correctamente.', 'Service saved successfully.');
  } catch (err) {
    console.error(err); error.value = tr('No se pudo guardar el servicio: ', 'Could not save service: ') + err.message;
  } finally { saving.value = false; }
}
async function toggleService(service) {
  if (!window.confirm(tr(
    service.is_active ? `¿Desactivar ${service.name}? No aparecerá en futuras reservas.` : `¿Activar ${service.name}?`,
    service.is_active ? `Deactivate ${service.name}? It will not appear in future bookings.` : `Activate ${service.name}?`
  ))) return;
  changingId.value = service.id; error.value = ''; success.value = '';
  try {
    const { error: e } = await supabase.from('services').update({ is_active: !service.is_active })
      .eq('id', service.id).eq('business_id', businessId.value);
    if (e) throw e;
    await loadData(); success.value = tr('Estado actualizado.', 'Status updated.');
  } catch (err) { error.value = err.message; }
  finally { changingId.value = null; }
}
onMounted(loadData);
watch(businessId, () => { resetForm(); business.value = null; services.value = []; loadData(); });
</script>

<template>
  <main class="container py-5">

<!-- ALERTAS VISIBLES SIN SCROLL -->
<div
  v-if="error || success"
  ref="noticeRef"
  tabindex="-1"
  class="alert alert-dismissible shadow-sm ts-notice"
  :class="error ? 'alert-danger' : 'alert-success'"
  :role="error ? 'alert' : 'status'"
  :aria-live="error ? 'assertive' : 'polite'"
>
  <div class="d-flex align-items-start gap-2 pe-4">
    <i
      class="bi"
      :class="error
        ? 'bi-exclamation-circle-fill'
        : 'bi-check-circle-fill'"
      aria-hidden="true"
    ></i>

    <span>{{ error || success }}</span>
  </div>

  <button
    type="button"
    class="btn-close"
    :aria-label="tr('Cerrar alerta', 'Dismiss alert')"
    @click="error = ''; success = ''"
  ></button>
</div>


    <RouterLink :to="`/dashboard/business/${businessId}`" class="btn btn-outline-brand mb-4">
      <i class="bi bi-arrow-left me-2" aria-hidden="true"></i>{{ tr('Volver al negocio', 'Back to business') }}
    </RouterLink>
    <div v-if="error" class="alert alert-danger" role="alert" aria-live="assertive">{{ error }}</div>
    <div v-if="success" class="alert alert-success" role="status" aria-live="polite">{{ success }}</div>
    <div v-if="loading" class="text-center py-5" role="status">
      <div class="spinner-border text-info" aria-hidden="true"></div>
      <p class="mt-3">{{ tr('Cargando servicios...', 'Loading services...') }}</p>
    </div>
    <template v-else-if="business">
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 class="fw-bold">{{ tr('Servicios', 'Services') }}</h1>
          <p class="text-secondary mb-0">{{ business.name }} · {{ tr('Administrá los servicios de tu negocio.', 'Manage your business services.') }}</p>
        </div>
        <button class="btn btn-brand" type="button" @click="openForm()">
          <i class="bi bi-plus-circle me-2" aria-hidden="true"></i>{{ tr('Agregar servicio', 'Add service') }}
        </button>
      </div>
      <section v-if="showForm" ref="editor" class="card border-0 shadow-sm p-4 mb-4 service-editor" aria-labelledby="serviceFormTitle">
        <h2 id="serviceFormTitle" class="h4 fw-bold mb-3">{{ editingId ? tr('Editar servicio', 'Edit service') : tr('Nuevo servicio', 'New service') }}</h2>
        <form @submit.prevent="saveService">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label for="serviceName" class="form-label">{{ tr('Nombre del servicio', 'Service name') }} *</label>
              <input id="serviceName" v-model="form.name" class="form-control" maxlength="100" required :placeholder="tr('Ej.: Corte de pelo', 'E.g. Haircut')" />
            </div>
            <div class="col-12 col-md-6">
              <label for="serviceDuration" class="form-label">{{ tr('Duración (minutos)', 'Duration (minutes)') }} *</label>
              <input id="serviceDuration" v-model.number="form.duration_minutes" class="form-control" type="number" min="5" max="480" step="5" required aria-describedby="durationHelp" />
              <div id="durationHelp" class="form-text">{{ tr('Entre 5 y 480 minutos.', 'Between 5 and 480 minutes.') }}</div>
            </div>
            <div class="col-12">
              <label for="serviceDescription" class="form-label">{{ tr('Descripción (opcional)', 'Description (optional)') }}</label>
              <textarea id="serviceDescription" v-model="form.description" class="form-control" rows="2" maxlength="1000"></textarea>
            </div>
            <div class="col-12 col-md-6">
              <label for="servicePrice" class="form-label">{{ tr('Precio', 'Price') }} *</label>
              <input id="servicePrice" v-model="form.price" class="form-control" type="number" min="0" step="0.01" required aria-describedby="priceHelp" />
              <div id="priceHelp" class="form-text">{{ tr('Ingresá 0 para un servicio gratuito.', 'Enter 0 for a free service.') }}</div>
            </div>
            <div class="col-12 col-md-6">
              <label for="serviceCurrency" class="form-label">{{ tr('Moneda', 'Currency') }}</label>
              <select id="serviceCurrency" v-model="form.currency" class="form-select">
                <option value="ARS">ARS</option><option value="USD">USD</option><option value="UYU">UYU</option><option value="EUR">EUR</option>
              </select>
            </div>
            <div class="col-12">
              <div class="form-check">
                <input id="showPrice" v-model="form.show_price" type="checkbox" class="form-check-input" />
                <label for="showPrice" class="form-check-label">{{ tr('Mostrar el precio a los clientes', 'Show price to customers') }}</label>
              </div>
            </div>
            <fieldset class="col-12">
              <legend class="fs-6 fw-semibold">{{ tr('Empleados que realizan este servicio', 'Employees who provide this service') }} *</legend>
              <p class="small text-secondary">{{ tr('Seleccioná al menos uno. Solo se pueden asignar empleados activos.', 'Select at least one. Only active employees can be assigned.') }}</p>
              <div v-if="!employees.length" class="alert alert-warning">{{ tr('Primero agregá empleados al negocio.', 'Add employees to the business first.') }}</div>
              <div v-for="employee in employees" :key="employee.id" class="form-check mb-2">
                <input :id="`service-employee-${employee.id}`" v-model="form.employee_ids" :value="employee.id" :disabled="!employee.is_active" type="checkbox" class="form-check-input" />
                <label :for="`service-employee-${employee.id}`" class="form-check-label">{{ employee.full_name }} <span v-if="!employee.is_active" class="text-secondary">({{ tr('Inactivo', 'Inactive') }})</span></label>
              </div>
            </fieldset>
          </div>
          <div class="d-flex flex-wrap gap-2 mt-4">
            <button type="submit" class="btn btn-brand" :disabled="saving || !employees.some(e => e.is_active)" :aria-busy="saving">{{ saving ? tr('Guardando...', 'Saving...') : tr('Guardar servicio', 'Save service') }}</button>
            <button type="button" class="btn btn-outline-brand" :disabled="saving" @click="resetForm">{{ tr('Cancelar', 'Cancel') }}</button>
          </div>
        </form>
      </section>
      <div v-if="!services.length" class="card border-0 shadow-sm p-5 text-center">
        <i class="bi bi-card-checklist fs-1 mb-3" aria-hidden="true"></i>
        <h2 class="h4 fw-bold">{{ tr('Todavía no hay servicios', 'No services yet') }}</h2>
        <p class="text-secondary mb-0">{{ tr('Agregá el primero para comenzar.', 'Add your first service to get started.') }}</p>
      </div>
      <div v-else class="row g-4">
        <div v-for="service in services" :key="service.id" class="col-12 col-md-6 col-xl-4">
          <article class="card border-0 shadow-sm h-100">
            <div class="card-body p-4 d-flex flex-column">
              <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                <h2 class="h5 fw-bold mb-0">{{ service.name }}</h2>
                <span class="badge" :class="service.is_active ? 'text-bg-success' : 'text-bg-secondary'">{{ service.is_active ? tr('Activo', 'Active') : tr('Inactivo', 'Inactive') }}</span>
              </div>
              <p v-if="service.description" class="text-secondary small">{{ service.description }}</p>
              <p class="mb-2"><i class="bi bi-clock me-2" aria-hidden="true"></i>{{ service.duration_minutes }} min</p>
              <p class="fw-semibold mb-2">{{ Number(service.price) === 0 ? tr('Gratis', 'Free') : money(service) }} <span v-if="!service.show_price" class="small fw-normal text-secondary">· {{ tr('Precio oculto', 'Price hidden') }}</span></p>
              <p class="small text-secondary mb-3"><i class="bi bi-people me-2" aria-hidden="true"></i>{{ assignedNames(service.id) || tr('Sin empleados', 'No employees') }}</p>
              <div class="d-flex flex-wrap gap-2 mt-auto pt-2">
                <button type="button" class="btn btn-brand flex-grow-1" @click="openForm(service)"><i class="bi bi-pencil me-1" aria-hidden="true"></i>{{ tr('Editar', 'Edit') }}</button>
                <button type="button" class="btn btn-outline-secondary flex-grow-1" :disabled="changingId === service.id" @click="toggleService(service)">{{ service.is_active ? tr('Desactivar', 'Deactivate') : tr('Activar', 'Activate') }}</button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.service-editor { scroll-margin-top: 80px; border-radius: 16px; }
.card { border-radius: 16px; }

/* Alerta siempre visible, incluso al hacer scroll */
.ts-notice {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2050;

  width: calc(100% - 32px);
  max-width: 560px;

  padding: 16px 20px;
  border-radius: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* Adaptación a celulares */
@media (max-width: 576px) {
  .ts-notice {
    top: 12px;
    width: calc(100% - 24px);
    padding: 14px 16px;
  }
}

</style>
