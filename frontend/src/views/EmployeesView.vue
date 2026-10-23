<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { supabase } from '../lib/supabase';

const route = useRoute();
const { locale } = useI18n();
const businessId = computed(() => route.params.id);
const tr = (es, en) => locale.value === 'es' ? es : en;
const days = [
  { id:1, es:'Lunes', en:'Monday' }, { id:2, es:'Martes', en:'Tuesday' },
  { id:3, es:'Miércoles', en:'Wednesday' }, { id:4, es:'Jueves', en:'Thursday' },
  { id:5, es:'Viernes', en:'Friday' }, { id:6, es:'Sábado', en:'Saturday' },
  { id:0, es:'Domingo', en:'Sunday' }
];
const dayName = n => days.find(d => d.id === Number(n))?.[locale.value] ?? String(n);
const business = ref(null), employees = ref([]), schedules = ref([]), businessHours = ref([]);
const loading = ref(true), saving = ref(false), error = ref(''), success = ref('');
const noticeRef = ref(null), editorRef = ref(null), editorTitleRef = ref(null);
const showForm = ref(false), editingId = ref(null);
const form = ref({ full_name:'', role:'', email:'', phone:'' });
const scheduleRows = ref([]);
const businessHoursDraft = ref([]), editingBusinessHours = ref(false), savingBusinessHours = ref(false);
const statusEmployee = ref(null), statusMode = ref('temporary');
const unavailableFrom = ref(''), unavailableUntil = ref(''), savingStatus = ref(false);
const businessHoursConfigured = computed(() => businessHours.value.length > 0);
const availableDays = computed(() => days.filter(d => businessHours.value.some(h => Number(h.day_of_week) === d.id)));
const uniqueWorkDays = computed(() => new Set(scheduleRows.value.map(s => Number(s.day_of_week))).size);
const activeEmployees = computed(() => employees.value.filter(e => e.is_active).length);

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function hasPlannedAbsence(e) {
  return Boolean(e.unavailable_from && (!e.unavailable_until || e.unavailable_until >= todayLocal()));
}
function absentToday(e) {
  const today = todayLocal();
  return Boolean(e.is_active && e.unavailable_from && today >= e.unavailable_from && (!e.unavailable_until || today <= e.unavailable_until));
}
function statusText(e) {
  if (!e.is_active) return tr('Inactivo','Inactive');
  if (absentToday(e)) return tr('Ausente','Unavailable');
  if (hasPlannedAbsence(e)) return tr('Ausencia programada','Scheduled absence');
  return tr('Activo','Active');
}
function announce(message, isError=false) {
  error.value = isError ? message : '';
  success.value = isError ? '' : message;
  nextTick(() => noticeRef.value?.focus());
}
function scrollToEditor() {
  nextTick(() => {
    editorRef.value?.scrollIntoView({ behavior:'smooth', block:'start' });
    editorTitleRef.value?.focus({ preventScroll:true });
  });
}
function employeeSchedules(id) {
  return schedules.value.filter(s => s.employee_id === id).sort((a,b) =>
    ((Number(a.day_of_week)+6)%7)-((Number(b.day_of_week)+6)%7) || a.start_time.localeCompare(b.start_time));
}
function groupedEmployeeSchedules(id) {
  const byDay = new Map();
  for (const slot of employeeSchedules(id)) {
    const day = Number(slot.day_of_week);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(`${slot.start_time.slice(0,5)}–${slot.end_time.slice(0,5)}`);
  }
  const groups = [];
  for (const [day, slots] of byDay) {
    const signature = slots.join('|');
    let group = groups.find(g => g.signature === signature);
    if (!group) { group = { signature, days:[], slots }; groups.push(group); }
    group.days.push(day);
  }
  return groups;
}
function groupDaysLabel(group) {
  const ordered = group.days.slice().sort((a,b) => ((a+6)%7)-((b+6)%7));
  const labels = [];
  let start = ordered[0], last = ordered[0];
  function flush() { labels.push(start === last ? dayName(start) : `${dayName(start)} – ${dayName(last)}`); }
  for (const day of ordered.slice(1)) {
    if (((day+6)%7) === ((last+6)%7)+1) last = day;
    else { flush(); start = last = day; }
  }
  if (ordered.length) flush();
  return labels.join(', ');
}
async function loadData() {
  loading.value = true;
  try {
    const { data:auth, error:authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error(tr('Iniciá sesión.','Please sign in.'));
    const { data:b, error:be } = await supabase.from('businesses').select('id,name')
      .eq('id',businessId.value).eq('owner_id',auth.user.id).single();
    if (be) throw be;
    business.value = b;
    const { data:bh, error:bhe } = await supabase.from('business_hours')
      .select('day_of_week,start_time,end_time').eq('business_id',businessId.value);
    if (bhe) throw bhe;
    businessHours.value = bh || [];
    const { data:e, error:ee } = await supabase.from('employees').select('*')
      .eq('business_id',businessId.value).order('created_at',{ ascending:false });
    if (ee) throw ee;
    employees.value = e || [];
    if (employees.value.length) {
      const { data:s, error:se } = await supabase.from('employee_schedules')
        .select('id,employee_id,day_of_week,start_time,end_time')
        .in('employee_id',employees.value.map(x => x.id));
      if (se) throw se;
      schedules.value = s || [];
    } else schedules.value = [];
  } catch (err) {
    console.error(err);
    announce(tr('No se pudieron cargar los datos: ','Could not load data: ')+err.message,true);
  } finally { loading.value = false; }
}
function blankBusinessHours() {
  return days.map(d => ({ day_of_week:d.id, open:false, start_time:'09:00', end_time:'18:00' }));
}
function beginBusinessHours() {
  businessHoursDraft.value = blankBusinessHours().map(d => {
    const saved = businessHours.value.find(h => Number(h.day_of_week) === d.day_of_week);
    return saved ? { ...d, open:true, start_time:saved.start_time.slice(0,5), end_time:saved.end_time.slice(0,5) } : d;
  });
  editingBusinessHours.value = true;
}
async function saveBusinessHours() {
  const hours = businessHoursDraft.value.filter(d => d.open).map(d => ({
    day_of_week:d.day_of_week, start_time:d.start_time, end_time:d.end_time
  }));
  if (!hours.length || hours.length > 7 || hours.some(h => !h.start_time || !h.end_time || h.start_time >= h.end_time))
    return announce(tr('Revisá los días y horarios de apertura.','Check opening days and hours.'),true);
  savingBusinessHours.value = true;
  try {
    const { error:e } = await supabase.rpc('replace_business_hours',{ p_business_id:businessId.value, p_hours:hours });
    if (e) throw e;
    editingBusinessHours.value = false;
    await loadData();
    announce(tr('Apertura guardada.','Opening hours saved.'));
  } catch (err) { announce(err.message,true); }
  finally { savingBusinessHours.value = false; }
}
function resetForm() {
  showForm.value = false; editingId.value = null;
  form.value = { full_name:'', role:'', email:'', phone:'' };
  scheduleRows.value = [];
}
function newSlot(day) {
  const opening = businessHours.value.find(h => Number(h.day_of_week) === Number(day));
  if (!opening) return null;
  return { key:crypto.randomUUID(), day_of_week:Number(day),
    start_time:opening.start_time.slice(0,5), end_time:opening.end_time.slice(0,5) };
}
function openCreateForm() {
  if (!businessHoursConfigured.value) {
    beginBusinessHours();
    return announce(tr('Primero configurá la apertura del negocio.','Set business opening hours first.'),true);
  }
  resetForm();
  showForm.value = true;
  scheduleRows.value = availableDays.value.map(d => newSlot(d.id)).filter(Boolean);
  error.value = ''; success.value = '';
  scrollToEditor();
}
function editEmployee(e) {
  resetForm();
  editingId.value = e.id;
  form.value = { full_name:e.full_name || '', role:e.role || '', email:e.email || '', phone:e.phone || '' };
  scheduleRows.value = employeeSchedules(e.id).map(s => ({
    key:crypto.randomUUID(), day_of_week:Number(s.day_of_week),
    start_time:s.start_time.slice(0,5), end_time:s.end_time.slice(0,5)
  }));
  showForm.value = true;
  error.value = ''; success.value = '';
  scrollToEditor();
}
function addDay() {
  if (uniqueWorkDays.value >= 7) return announce(tr('Máximo siete días.','Maximum seven days.'),true);
  const day = availableDays.value.find(d => !scheduleRows.value.some(s => Number(s.day_of_week) === d.id));
  if (!day) return announce(tr('Ya agregaste todos los días disponibles.','All available days are included.'),true);
  if (scheduleRows.value.length >= 28) return;
  scheduleRows.value.push(newSlot(day.id));
}
function addShift(day) {
  if (scheduleRows.value.length >= 28) return announce(tr('Máximo 28 franjas.','Maximum 28 shifts.'),true);
  const opening = businessHours.value.find(h => Number(h.day_of_week) === Number(day));
  if (!opening) return;
  const rows = scheduleRows.value.filter(s => Number(s.day_of_week) === Number(day)).sort((a,b) => a.end_time.localeCompare(b.end_time));
  const start = rows.length ? rows[rows.length-1].end_time : opening.start_time.slice(0,5);
  const end = opening.end_time.slice(0,5);
  if (start >= end) return announce(tr('Ajustá las franjas existentes para dejar espacio.','Adjust existing shifts to make room.'),true);
  scheduleRows.value.push({ key:crypto.randomUUID(), day_of_week:Number(day), start_time:start, end_time:end });
}
function changeSlotDay(slot) {
  const opening = businessHours.value.find(h => Number(h.day_of_week) === Number(slot.day_of_week));
  if (opening) { slot.start_time = opening.start_time.slice(0,5); slot.end_time = opening.end_time.slice(0,5); }
}
function validateSchedule() {
  if (!scheduleRows.value.length) return tr('Agregá al menos una franja de trabajo.','Add at least one working shift.');
  if (scheduleRows.value.length > 28 || uniqueWorkDays.value > 7) return tr('Demasiadas franjas o días.','Too many shifts or days.');
  for (const row of scheduleRows.value) {
    const opening = businessHours.value.find(h => Number(h.day_of_week) === Number(row.day_of_week));
    if (!opening) return tr('Elegí un día en que el negocio abre.','Choose a business opening day.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.end_time) || row.start_time >= row.end_time)
      return tr('Revisá las horas de entrada y salida.','Check start and end times.');
    if (row.start_time < opening.start_time.slice(0,5) || row.end_time > opening.end_time.slice(0,5))
      return tr('Los turnos deben estar dentro de la apertura del negocio.','Shifts must be within business opening hours.');
  }
  for (const day of days) {
    const rows = scheduleRows.value.filter(r => Number(r.day_of_week) === day.id).sort((a,b) => a.start_time.localeCompare(b.start_time));
    for (let i=1;i<rows.length;i++) if (rows[i].start_time < rows[i-1].end_time)
      return tr(`Hay horarios superpuestos el ${day.es}.`,`There are overlapping shifts on ${day.en}.`);
  }
  return '';
}
async function saveEmployee() {
  const name = form.value.full_name.trim();
  const role = form.value.role.trim(), email = form.value.email.trim(), phone = form.value.phone.trim();
  if (name.length < 2 || name.length > 100) return announce(tr('Ingresá un nombre de 2 a 100 caracteres.','Enter a name of 2 to 100 characters.'),true);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return announce(tr('Email inválido.','Invalid email.'),true);
  const digits = phone.replace(/\D/g,'');
  if (phone && (digits.length < 8 || digits.length > 15)) return announce(tr('El teléfono debe tener de 8 a 15 dígitos.','Phone must contain 8 to 15 digits.'),true);
  const invalid = validateSchedule();
  if (invalid) return announce(invalid,true);
  saving.value = true;
  try {
    const { error:e } = await supabase.rpc('save_employee_with_schedule', {
      p_business_id:businessId.value, p_employee_id:editingId.value,
      p_full_name:name, p_role:role, p_email:email, p_phone:phone,
      p_schedules:scheduleRows.value.map(s => ({ day_of_week:Number(s.day_of_week), start_time:s.start_time, end_time:s.end_time }))
    });
    if (e) throw e;
    resetForm();
    await loadData();
    announce(tr('Empleado y horarios guardados correctamente.','Employee and schedule saved successfully.'));
  } catch (err) { console.error(err); announce(tr('No se pudo guardar: ','Could not save: ')+err.message,true); }
  finally { saving.value = false; }
}
function openStatusDialog(e) {
  statusEmployee.value = e;
  statusMode.value = e.unavailable_from && !e.unavailable_until ? 'indefinite' : 'temporary';
  unavailableFrom.value = e.unavailable_from && e.unavailable_from >= todayLocal() ? e.unavailable_from : todayLocal();
  unavailableUntil.value = e.unavailable_until && e.unavailable_until >= todayLocal() ? e.unavailable_until : '';
}
function closeStatusDialog() { if (!savingStatus.value) statusEmployee.value = null; }
async function confirmStatusChange() {
  const e = statusEmployee.value;
  if (!e) return;
  if (!unavailableFrom.value || unavailableFrom.value < todayLocal()) return announce(tr('Elegí una fecha de inicio válida.','Choose a valid start date.'),true);
  if (statusMode.value === 'temporary' && (!unavailableUntil.value || unavailableUntil.value < unavailableFrom.value))
    return announce(tr('Elegí una fecha de fin igual o posterior al inicio.','Choose an end date on or after the start.'),true);
  savingStatus.value = true;
  try {
    const { error:ue } = await supabase.from('employees').update({
      is_active:true, unavailable_from:unavailableFrom.value,
      unavailable_until:statusMode.value === 'temporary' ? unavailableUntil.value : null
    }).eq('id',e.id).eq('business_id',businessId.value);
    if (ue) throw ue;
    statusEmployee.value = null;
    await loadData();
    announce(tr('Ausencia guardada.','Absence saved.'));
  } catch (err) { announce(err.message,true); }
  finally { savingStatus.value = false; }
}
async function reactivateEmployee(e) {
  if (!window.confirm(tr(`¿Cancelar la ausencia o reactivar a ${e.full_name}?`,`Cancel absence or reactivate ${e.full_name}?`))) return;
  savingStatus.value = true;
  try {
    const { error:ue } = await supabase.from('employees').update({
      is_active:true, unavailable_from:null, unavailable_until:null
    }).eq('id',e.id).eq('business_id',businessId.value);
    if (ue) throw ue;
    await loadData();
    announce(tr('Disponibilidad restablecida.','Availability restored.'));
  } catch (err) { announce(err.message,true); }
  finally { savingStatus.value = false; }
}
onMounted(loadData);
watch(businessId, () => {
  resetForm(); editingBusinessHours.value = false; business.value = null;
  employees.value = []; schedules.value = []; businessHours.value = [];
  loadData();
});
</script>

<template>
  <main class="container py-5">
    <RouterLink :to="`/dashboard/business/${businessId}`" class="btn btn-outline-brand mb-4">
      <i class="bi bi-arrow-left me-2" aria-hidden="true"></i>{{ tr('Volver al negocio','Back to business') }}
    </RouterLink>

    <div v-if="error || success" ref="noticeRef" tabindex="-1" class="alert position-sticky top-0 shadow-sm notice"
      :class="error ? 'alert-danger' : 'alert-success'" :role="error ? 'alert' : 'status'" :aria-live="error ? 'assertive' : 'polite'">
      {{ error || success }}
      <button type="button" class="btn-close float-end" :aria-label="tr('Cerrar aviso','Dismiss notice')" @click="error='';success=''" />
    </div>

    <div v-if="loading" class="text-center py-5" role="status" aria-live="polite">
      <div class="spinner-border text-info" aria-hidden="true"></div>
      <p class="mt-3">{{ tr('Cargando empleados...','Loading employees...') }}</p>
    </div>

    <template v-else-if="business">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 class="fw-bold mb-2">{{ tr('Empleados','Employees') }}</h1>
          <p class="text-secondary mb-1">{{ business.name }}</p>
          <p class="text-secondary">{{ tr('Administrá tu equipo y sus horarios.','Manage your team and their schedules.') }}</p>
        </div>
        <button type="button" class="btn btn-brand" @click="openCreateForm">
          <i class="bi bi-person-plus me-2" aria-hidden="true"></i>{{ tr('Agregar empleado','Add employee') }}
        </button>
      </div>

      <!-- HORARIOS DE APERTURA DEL NEGOCIO -->
      <section class="card border-0 shadow-sm p-4 mb-4" aria-labelledby="businessHoursTitle">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h2 id="businessHoursTitle" class="h4 fw-bold mb-1">{{ tr('Días y horarios del negocio','Business opening hours') }}</h2>
            <p class="text-secondary small mb-0">{{ tr('Configurá primero la apertura. Los empleados solo pueden trabajar dentro de esos horarios.','Set opening hours first. Employee shifts must stay within them.') }}</p>
          </div>
          <button v-if="!editingBusinessHours" type="button" class="btn btn-outline-brand" @click="beginBusinessHours">
            <i class="bi bi-pencil me-1" aria-hidden="true"></i>{{ businessHoursConfigured ? tr('Editar apertura','Edit opening hours') : tr('Configurar apertura','Set opening hours') }}
          </button>
        </div>
        <p v-if="!businessHoursConfigured && !editingBusinessHours" class="alert alert-warning mb-0">{{ tr('Primero configurá los horarios del negocio.','Configure business opening hours first.') }}</p>
        <ul v-else-if="!editingBusinessHours" class="list-unstyled mb-0">
          <li v-for="h in businessHours.slice().sort((a,b)=>((a.day_of_week+6)%7)-((b.day_of_week+6)%7))" :key="h.day_of_week" class="py-1">
            <strong>{{ dayName(h.day_of_week) }}:</strong> {{ h.start_time.slice(0,5) }}–{{ h.end_time.slice(0,5) }}
          </li>
        </ul>
        <form v-if="editingBusinessHours" @submit.prevent="saveBusinessHours">
          <div v-for="day in businessHoursDraft" :key="day.day_of_week" class="row g-2 align-items-center py-2 border-bottom">
            <div class="col-12 col-sm-4 form-check ps-4">
              <input :id="`open-${day.day_of_week}`" v-model="day.open" class="form-check-input" type="checkbox" />
              <label :for="`open-${day.day_of_week}`" class="form-check-label">{{ dayName(day.day_of_week) }}</label>
            </div>
            <div class="col-6 col-sm-4">
              <label :for="`open-start-${day.day_of_week}`" class="form-label small">{{ tr('Abre','Opens') }}</label>
              <input :id="`open-start-${day.day_of_week}`" v-model="day.start_time" class="form-control" type="time" :disabled="!day.open" :required="day.open" />
            </div>
            <div class="col-6 col-sm-4">
              <label :for="`open-end-${day.day_of_week}`" class="form-label small">{{ tr('Cierra','Closes') }}</label>
              <input :id="`open-end-${day.day_of_week}`" v-model="day.end_time" class="form-control" type="time" :disabled="!day.open" :required="day.open" />
            </div>
          </div>
          <div class="d-flex flex-wrap gap-2 mt-3">
            <button type="submit" class="btn btn-brand" :disabled="savingBusinessHours">{{ savingBusinessHours ? tr('Guardando...','Saving...') : tr('Guardar apertura','Save opening hours') }}</button>
            <button type="button" class="btn btn-outline-brand" :disabled="savingBusinessHours" @click="editingBusinessHours=false">{{ tr('Cancelar','Cancel') }}</button>
          </div>
        </form>
      </section>

      <p class="text-secondary small">{{ tr('Empleados activos:','Active employees:') }} <strong>{{ activeEmployees }}</strong></p>

      <!-- ÚNICO FORMULARIO DE EMPLEADO + HORARIOS -->
      <section v-if="showForm" ref="editorRef" class="card border-0 shadow-sm p-4 mb-4 employee-editor" aria-labelledby="employeeFormTitle">
        <h2 id="employeeFormTitle" ref="editorTitleRef" tabindex="-1" class="h4 fw-bold mb-3">
          {{ editingId ? tr('Editar datos y horarios','Edit details & schedule') : tr('Nuevo empleado y horarios','New employee & schedule') }}
        </h2>
        <form @submit.prevent="saveEmployee">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label for="employeeName" class="form-label">{{ tr('Nombre completo','Full name') }} *</label>
              <input id="employeeName" v-model="form.full_name" class="form-control" type="text" maxlength="100" autocomplete="name" required aria-describedby="nameHelp" />
              <div id="nameHelp" class="form-text">{{ tr('Nombre y apellido del empleado.','Employee first and last name.') }}</div>
            </div>
            <div class="col-12 col-md-6">
              <label for="employeeRole" class="form-label">{{ tr('Puesto o especialidad','Role or specialty') }}</label>
              <input id="employeeRole" v-model="form.role" class="form-control" type="text" maxlength="100" :placeholder="tr('Ej.: Peluquera','E.g. Hair stylist')" />
            </div>
            <div class="col-12 col-md-6">
              <label for="employeeEmail" class="form-label">Email</label>
              <input id="employeeEmail" v-model="form.email" class="form-control" type="email" maxlength="254" placeholder="employee@example.com" />
            </div>
            <div class="col-12 col-md-6">
              <label for="employeePhone" class="form-label">{{ tr('Teléfono','Phone') }}</label>
              <input id="employeePhone" v-model="form.phone" class="form-control" type="tel" maxlength="25" inputmode="tel" placeholder="+54 11 1234-5678" />
            </div>
          </div>

          <div class="border-top mt-4 pt-4">
            <h3 class="h5 fw-bold mb-2"><i class="bi bi-calendar-week me-2" aria-hidden="true"></i>{{ tr('Días y horarios laborales','Working days and hours') }}</h3>
            <p class="text-secondary small">{{ tr('Seleccioná los días que trabaja y sus horarios. Podés agregar otra franja al mismo día para marcar descansos.','Select working days and hours. Add another shift on the same day for breaks.') }}</p>
            <p class="small text-secondary">{{ tr('Días seleccionados:','Selected days:') }} <strong>{{ uniqueWorkDays }}/7</strong></p>
            <div v-for="(slot,index) in scheduleRows" :key="slot.key" class="row g-2 align-items-end mb-3 schedule-edit-row">
              <div class="col-12 col-sm-4">
                <label :for="`day-${slot.key}`" class="form-label">{{ tr('Día','Day') }}</label>
                <select :id="`day-${slot.key}`" v-model.number="slot.day_of_week" class="form-select" @change="changeSlotDay(slot)">
                  <option v-for="day in availableDays" :key="day.id" :value="day.id" :disabled="uniqueWorkDays >= 7 && !scheduleRows.some(r => r !== slot && Number(r.day_of_week) === day.id) && Number(slot.day_of_week) !== day.id">{{ dayName(day.id) }}</option>
                </select>
              </div>
              <div class="col-5 col-sm-3">
                <label :for="`start-${slot.key}`" class="form-label">{{ tr('Desde','From') }}</label>
                <input :id="`start-${slot.key}`" v-model="slot.start_time" class="form-control" type="time" required />
              </div>
              <div class="col-5 col-sm-3">
                <label :for="`end-${slot.key}`" class="form-label">{{ tr('Hasta','To') }}</label>
                <input :id="`end-${slot.key}`" v-model="slot.end_time" class="form-control" type="time" required />
              </div>
              <div class="col-2 col-sm-2">
                <button type="button" class="btn btn-outline-danger w-100" :aria-label="tr(`Eliminar franja ${index+1}`,`Remove shift ${index+1}`)" @click="scheduleRows.splice(index,1)">
                  <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
              </div>
              <div class="col-12">
                <button type="button" class="btn btn-link btn-sm p-0" @click="addShift(slot.day_of_week)">
                  <i class="bi bi-plus-circle me-1" aria-hidden="true"></i>{{ tr('Agregar otra franja este día','Add another shift on this day') }}
                </button>
              </div>
            </div>
            <p v-if="!scheduleRows.length" class="text-secondary small">{{ tr('Agregá al menos un día laboral.','Add at least one working day.') }}</p>
            <button type="button" class="btn btn-outline-brand" :disabled="uniqueWorkDays >= availableDays.length || uniqueWorkDays >= 7 || scheduleRows.length >= 28" @click="addDay">
              <i class="bi bi-plus-circle me-2" aria-hidden="true"></i>{{ tr('Agregar día','Add day') }}
            </button>
          </div>
          <div class="d-flex flex-wrap gap-2 mt-4 pt-3 border-top">
            <button type="submit" class="btn btn-brand" :disabled="saving" :aria-busy="saving">
              <i class="bi bi-check-circle me-2" aria-hidden="true"></i>{{ saving ? tr('Guardando...','Saving...') : tr('Guardar empleado y horarios','Save employee & schedule') }}
            </button>
            <button type="button" class="btn btn-outline-brand" :disabled="saving" @click="resetForm">{{ tr('Cancelar','Cancel') }}</button>
          </div>
        </form>
      </section>

      <!-- TARJETAS DE EMPLEADOS -->
      <div v-if="!employees.length" class="card border-0 shadow-sm p-5 text-center">
        <i class="bi bi-people fs-1 mb-3" aria-hidden="true"></i>
        <h2 class="h4 fw-bold">{{ tr('Todavía no hay empleados','No employees yet') }}</h2>
        <p class="text-secondary mb-0">{{ tr('Agregá tu primer empleado para comenzar.','Add your first employee to get started.') }}</p>
      </div>
      <div v-else class="row g-4">
        <div v-for="employee in employees" :key="employee.id" class="col-12 col-md-6 col-xl-4">
          <article class="card border-0 shadow-sm h-100">
            <div class="card-body p-4 d-flex flex-column">
              <div class="d-flex align-items-center gap-3 mb-3">
                <div class="employee-avatar" aria-hidden="true"><i class="bi bi-person"></i></div>
                <div class="flex-grow-1">
                  <h2 class="h5 fw-bold mb-1">{{ employee.full_name }}</h2>
                  <span class="badge" :class="!employee.is_active ? 'text-bg-secondary' : absentToday(employee) ? 'text-bg-warning' : 'text-bg-success'">{{ statusText(employee) }}</span>
                </div>
              </div>
              <p class="text-secondary mb-2">{{ employee.role || tr('Sin especialidad','No specialty') }}</p>
              <p v-if="employee.email" class="small text-secondary mb-2 text-break"><i class="bi bi-envelope me-2" aria-hidden="true"></i>{{ employee.email }}</p>
              <p v-if="employee.phone" class="small text-secondary mb-2"><i class="bi bi-telephone me-2" aria-hidden="true"></i>{{ employee.phone }}</p>
              <p v-if="hasPlannedAbsence(employee)" class="small text-secondary mb-2">
                <i class="bi bi-calendar-x me-1" aria-hidden="true"></i>{{ tr('Sin reservas desde','No bookings from') }} <strong>{{ employee.unavailable_from }}</strong>
                <template v-if="employee.unavailable_until"> {{ tr('hasta','until') }} <strong>{{ employee.unavailable_until }}</strong></template>
              </p>
              <div class="mt-2 mb-3">
                <h3 class="h6 fw-bold">{{ tr('Días y horarios','Working hours') }}</h3>
                <div v-if="groupedEmployeeSchedules(employee.id).length" class="schedule-groups">
                  <div v-for="group in groupedEmployeeSchedules(employee.id)" :key="group.signature" class="schedule-group">
                    <div class="fw-semibold small mb-2">{{ groupDaysLabel(group) }}</div>
                    <div class="d-flex flex-wrap gap-2">
                      <span v-for="slot in group.slots" :key="slot" class="schedule-time"><i class="bi bi-clock me-1" aria-hidden="true"></i>{{ slot }}</span>
                    </div>
                    <div v-if="group.slots.length > 1" class="small text-secondary mt-2">{{ tr('Jornada dividida · descanso entre franjas','Split shift · break between shifts') }}</div>
                  </div>
                </div>
                <p v-else class="small text-secondary mb-0">{{ tr('Sin horarios configurados.','No hours configured.') }}</p>
              </div>
              <div class="d-flex flex-wrap gap-2 mt-auto pt-3">
                <button type="button" class="btn btn-brand flex-grow-1" @click="editEmployee(employee)">
                  <i class="bi bi-pencil-square me-1" aria-hidden="true"></i>{{ tr('Editar datos y horarios','Edit details & schedule') }}
                </button>
                <button v-if="employee.is_active" type="button" class="btn btn-outline-secondary flex-grow-1" @click="openStatusDialog(employee)">
                  {{ hasPlannedAbsence(employee) ? tr('Editar ausencia','Edit absence') : tr('Desactivar','Deactivate') }}
                </button>
                <button v-if="hasPlannedAbsence(employee) || !employee.is_active" type="button" class="btn btn-outline-brand flex-grow-1" :disabled="savingStatus" @click="reactivateEmployee(employee)">
                  {{ hasPlannedAbsence(employee) ? tr('Cancelar ausencia','Cancel absence') : tr('Reactivar','Reactivate') }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </template>

    <!-- CONFIRMACIÓN DE AUSENCIA -->
    <div v-if="statusEmployee" class="status-overlay" @click.self="closeStatusDialog">
      <section class="status-dialog bg-white shadow p-4" role="dialog" aria-modal="true" aria-labelledby="statusDialogTitle" aria-describedby="statusDialogHelp">
        <h2 id="statusDialogTitle" class="h5 fw-bold mb-3">{{ tr('Programar ausencia de','Schedule absence for') }} {{ statusEmployee.full_name }}</h2>
        <p id="statusDialogHelp" class="text-secondary small">{{ tr('Elegí desde cuándo deja de recibir reservas y si la ausencia tiene fecha de finalización.','Choose when bookings stop and whether the absence has an end date.') }}</p>
        <fieldset class="mb-3">
          <legend class="fs-6 fw-semibold">{{ tr('Tipo de ausencia','Absence type') }}</legend>
          <div class="form-check mb-2">
            <input id="temporaryAbsence" v-model="statusMode" type="radio" value="temporary" class="form-check-input" />
            <label for="temporaryAbsence" class="form-check-label">{{ tr('Temporal (enfermedad, vacaciones, licencia)','Temporary (illness, vacation, leave)') }}</label>
          </div>
          <div class="form-check">
            <input id="indefiniteAbsence" v-model="statusMode" type="radio" value="indefinite" class="form-check-input" />
            <label for="indefiniteAbsence" class="form-check-label">{{ tr('Indefinida (hasta reactivación manual)','Indefinite (until manually reactivated)') }}</label>
          </div>
        </fieldset>
        <div class="mb-3">
          <label for="absenceFrom" class="form-label fw-semibold">{{ tr('¿Desde qué día deja de recibir reservas?','From which date should bookings stop?') }} *</label>
          <input id="absenceFrom" v-model="unavailableFrom" type="date" class="form-control" :min="todayLocal()" required />
        </div>
        <div v-if="statusMode === 'temporary'" class="mb-3">
          <label for="absenceUntil" class="form-label fw-semibold">{{ tr('¿Hasta qué día estará ausente?','Until which date will they be absent?') }} *</label>
          <input id="absenceUntil" v-model="unavailableUntil" type="date" class="form-control" :min="unavailableFrom || todayLocal()" required />
          <p class="form-text">{{ tr('Retoma disponibilidad al día siguiente.','Availability resumes the following day.') }}</p>
        </div>
        <p v-else class="alert alert-info small">{{ tr('Permanecerá sin disponibilidad hasta que lo reactives manualmente.','Unavailable until manually reactivated.') }}</p>
        <div class="d-flex flex-wrap justify-content-end gap-2">
          <button type="button" class="btn btn-outline-brand" :disabled="savingStatus" @click="closeStatusDialog">{{ tr('Cancelar','Cancel') }}</button>
          <button type="button" class="btn btn-brand" :disabled="savingStatus" @click="confirmStatusChange">{{ savingStatus ? tr('Guardando...','Saving...') : tr('Confirmar ausencia','Confirm absence') }}</button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.employee-avatar { width:52px; height:52px; border-radius:14px; background:var(--ts-primary-light,#e8f8f7); color:var(--ts-primary-hover,#329d9d); display:flex; align-items:center; justify-content:center; font-size:25px; flex-shrink:0; }
.notice { z-index:1020; }
.employee-editor { scroll-margin-top:80px; }
.employee-editor h2:focus { outline:none; }
.schedule-groups { display:flex; flex-direction:column; gap:10px; }
.schedule-group { background:#f5f9f9; border:1px solid #e1eeee; border-radius:12px; padding:12px; }
.schedule-time { display:inline-flex; align-items:center; padding:5px 9px; background:#fff; border:1px solid #dceceb; border-radius:8px; font-size:.85rem; font-weight:600; }
.schedule-edit-row { background:#f8fbfb; border:1px solid #e1eeee; border-radius:12px; padding:10px; }
.status-overlay { position:fixed; inset:0; background:rgba(15,23,42,.55); z-index:2000; display:flex; align-items:center; justify-content:center; padding:16px; }
.status-dialog { border-radius:16px; width:100%; max-width:520px; max-height:90vh; overflow:auto; }
</style>
