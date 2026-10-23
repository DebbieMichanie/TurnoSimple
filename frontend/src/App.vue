
<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { supabase } from "./lib/supabase";

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();

const user = ref(null);
const authLoading = ref(true);
const showLogoutModal = ref(false);
const logoutLoading = ref(false);
const logoutError = ref("");

const logoutDialog = ref(null);
const cancelLogoutButton = ref(null);
const logoutTrigger = ref(null);

let authSubscription = null;

// Detectar la sección activa
const activeSection = computed(() => {
  const path = route.path;

  if (path === "/") return "home";
  if (path.startsWith("/demo")) return "demo";

  if (
    path.startsWith("/dashboard/business") ||
    path === "/dashboard/create-business"
  ) {
    return "businesses";
  }

  if (path.startsWith("/dashboard")) {
    return "dashboard";
  }

  return "";
});

function changeLanguage(event) {
  locale.value = event.target.value;
  localStorage.setItem("turnosimple-lang", locale.value);
}

// Abrir modal de cierre de sesión
async function openLogoutModal(event) {
  logoutTrigger.value = event.currentTarget;
  logoutError.value = "";
  showLogoutModal.value = true;

  await nextTick();
  cancelLogoutButton.value?.focus();
}

// Cerrar modal y devolver el foco
async function closeLogoutModal() {
  if (logoutLoading.value) return;

  showLogoutModal.value = false;
  await nextTick();
  logoutTrigger.value?.focus();
}

// Mantener el foco dentro del modal
function handleModalKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeLogoutModal();
    return;
  }

  if (event.key !== "Tab") return;

  const elements = Array.from(
    logoutDialog.value?.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || []
  );

  if (!elements.length) return;

  const first = elements[0];
  const last = elements[elements.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    document.activeElement === last
  ) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(async () => {
  const { data } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      user.value = session?.user ?? null;
      authLoading.value = false;
    }
  );

  authSubscription = data.subscription;

  const { data: sessionData, error } =
    await supabase.auth.getSession();

  if (error) {
    console.error(error);
  } else {
    user.value = sessionData.session?.user ?? null;
  }

  authLoading.value = false;
});

onUnmounted(() => {
  authSubscription?.unsubscribe();
});

async function logout() {
  logoutLoading.value = true;
  logoutError.value = "";

  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    showLogoutModal.value = false;
    await router.push("/");
  } catch (err) {
    logoutError.value = err.message;
  } finally {
    logoutLoading.value = false;
  }
}
</script>

<template>
  <div class="min-vh-100 d-flex flex-column">

    <!-- NAVBAR -->
    <nav
      class="navbar navbar-expand-lg bg-white shadow-sm"
      :aria-label="locale === 'es'
        ? 'Navegación principal'
        : 'Main navigation'"
    >
      <div class="container">

        <!-- BRAND -->
        <RouterLink
          to="/"
          class="navbar-brand fw-bold"
        >
          <i
            class="bi bi-calendar-check me-2"
            aria-hidden="true"
          ></i>
          TurnoSimple
        </RouterLink>

        <!-- MOBILE MENU -->
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          :aria-label="locale === 'es'
            ? 'Abrir menú de navegación'
            : 'Open navigation menu'"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div
          id="mainNavbar"
          class="collapse navbar-collapse"
        >
          <div
            class="navbar-nav ms-auto
                   align-items-lg-center gap-lg-2"
          >

            <!-- HOME -->
            <RouterLink
              to="/"
              class="nav-link"
              :class="{
                'ts-nav-active': activeSection === 'home'
              }"
              :aria-current="
                activeSection === 'home' ? 'page' : undefined
              "
            >
              {{ t("nav.home") }}
            </RouterLink>

            <!-- DEMO -->
            <RouterLink
              to="/demo"
              class="nav-link"
              :class="{
                'ts-nav-active': activeSection === 'demo'
              }"
              :aria-current="
                activeSection === 'demo' ? 'page' : undefined
              "
            >
              {{ t("nav.demo") }}
            </RouterLink>

            <!-- DASHBOARD -->
            <RouterLink
              v-if="user"
              to="/dashboard"
              class="nav-link"
              :class="{
                'ts-nav-active': activeSection === 'dashboard'
              }"
              :aria-current="
                activeSection === 'dashboard' ? 'page' : undefined
              "
            >
              {{ locale === "es"
                ? "Panel"
                : "Dashboard" }}
            </RouterLink>

            <!-- MY BUSINESSES -->
            <RouterLink
              v-if="user"
              to="/dashboard/businesses"
              class="nav-link"
              :class="{
                'ts-nav-active': activeSection === 'businesses'
              }"
              :aria-current="
                activeSection === 'businesses' ? 'page' : undefined
              "
            >
              {{ locale === "es"
                ? "Mis negocios"
                : "My Businesses" }}
            </RouterLink>

            <!-- LANGUAGE -->
            <select
              class="form-select form-select-sm lang-select"
              :value="locale"
              :aria-label="locale === 'es'
                ? 'Seleccionar idioma'
                : 'Select language'"
              @change="changeLanguage"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>

            <!-- LOGIN / REGISTER -->
            <template v-if="!authLoading && !user">
              <RouterLink
                to="/login"
                class="btn btn-outline-brand btn-sm"
              >
                {{ t("nav.login") }}
              </RouterLink>

              <RouterLink
                to="/register"
                class="btn btn-brand btn-sm"
              >
                {{ t("nav.register") }}
              </RouterLink>
            </template>

            <!-- LOGOUT -->
            <button
              v-if="!authLoading && user"
              type="button"
              class="btn btn-outline-danger btn-sm"
              @click="openLogoutModal"
            >
              <i
                class="bi bi-box-arrow-right me-1"
                aria-hidden="true"
              ></i>
              {{ locale === "es"
                ? "Cerrar sesión"
                : "Log out" }}
            </button>

          </div>
        </div>
      </div>
    </nav>

    <!-- CONTENT -->
    <div class="flex-grow-1">
      <RouterView />
    </div>

    <!-- FOOTER -->
    <footer
      class="border-top py-4 text-center text-secondary small"
    >
      © {{ new Date().getFullYear() }} TurnoSimple
    </footer>

    <!-- LOGOUT MODAL -->
    <div
      v-if="showLogoutModal"
      class="ts-modal-overlay"
    >
      <div
        ref="logoutDialog"
        class="card shadow-lg p-4 ts-logout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logoutTitle"
        aria-describedby="logoutDescription"
        @keydown="handleModalKeydown"
      >
        <h2
          id="logoutTitle"
          class="h4 fw-bold text-center"
        >
          {{ locale === "es"
            ? "¿Cerrar sesión?"
            : "Log out?" }}
        </h2>

        <p
          id="logoutDescription"
          class="text-secondary text-center"
        >
          {{ locale === "es"
            ? "¿Estás seguro de que querés cerrar tu sesión?"
            : "Are you sure you want to log out?" }}
        </p>

        <div
          v-if="logoutError"
          class="alert alert-danger"
          role="alert"
        >
          {{ logoutError }}
        </div>

        <div class="d-flex justify-content-center gap-2">

          <button
            ref="cancelLogoutButton"
            type="button"
            class="btn btn-outline-brand"
            :disabled="logoutLoading"
            @click="closeLogoutModal"
          >
            {{ locale === "es" ? "Cancelar" : "Cancel" }}
          </button>

          <button
            type="button"
            class="btn btn-brand"
            :disabled="logoutLoading"
            :aria-busy="logoutLoading"
            @click="logout"
          >
            {{ logoutLoading
              ? (locale === "es"
                  ? "Saliendo..."
                  : "Logging out...")
              : (locale === "es"
                  ? "Cerrar sesión"
                  : "Log out") }}
          </button>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* NAVBAR LINKS */
.navbar .nav-link {
  position: relative;
  color: #344054;
  font-weight: 400;
  padding: 10px 12px;
  transition: color 0.2s ease;
}

/* HOVER */
.navbar .nav-link:hover {
  color: var(--ts-primary-hover, #329d9d);
  font-weight: 550;
}

/* ACTIVE SECTION */
.navbar .nav-link.ts-nav-active {
  color: var(--ts-primary-hover, #329d9d);
  font-weight: 650;
}

/* ACTIVE UNDERLINE */
.navbar .nav-link.ts-nav-active::after {
  content: "";
  position: absolute;
  bottom: 2px;
  left: 12px;
  right: 12px;
  height: 3px;
  background: var(--ts-primary, #50bdbd);
  border-radius: 4px;
}

/* KEYBOARD ACCESSIBILITY */
.navbar .nav-link:focus-visible,
.lang-select:focus-visible,
.navbar .btn:focus-visible {
  outline: 3px solid var(--ts-primary, #50bdbd);
  outline-offset: 3px;
}

/* COMPACT LANGUAGE SELECTOR */
.lang-select {
  width: auto;
  min-width: 105px;
  max-width: 120px;
  height: 36px;
  padding: 4px 28px 4px 10px;
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
}

/* MOBILE NAVBAR */
@media (max-width: 991.98px) {
  .navbar .nav-link {
    padding: 12px 10px;
  }

  .navbar .nav-link.ts-nav-active {
    background: #e8f8f7;
    border-radius: 8px;
  }

  .navbar .nav-link.ts-nav-active::after {
    display: none;
  }

  .lang-select {
    margin: 12px 0;
  }
}

/* REDUCED MOTION */
@media (prefers-reduced-motion: reduce) {
  .navbar .nav-link {
    transition: none;
  }
}
</style>
