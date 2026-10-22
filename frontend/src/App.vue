
<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { supabase } from "./lib/supabase";

const router = useRouter();
const { t, locale } = useI18n();

const user = ref(null);
const authLoading = ref(true);
const showLogoutModal = ref(false);
const logoutLoading = ref(false);
const logoutError = ref("");

let authSubscription = null;

function changeLanguage(event) {
  locale.value = event.target.value;
  localStorage.setItem("turnosimple-lang", locale.value);
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

    <nav class="navbar navbar-expand-lg bg-white shadow-sm">
      <div class="container">

        <RouterLink to="/" class="navbar-brand fw-bold">
          <i
            class="bi bi-calendar-check me-2"
            aria-hidden="true"
          ></i>
          TurnoSimple
        </RouterLink>

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
            <RouterLink to="/" class="nav-link">
              {{ t("nav.home") }}
            </RouterLink>

            <RouterLink to="/demo" class="nav-link">
              {{ t("nav.demo") }}
            </RouterLink>

            <RouterLink
              v-if="user"
              to="/dashboard"
              class="nav-link"
            >
              {{ locale === "es"
                ? "Panel"
                : "Dashboard" }}
            </RouterLink>

            <RouterLink
              v-if="user"
              to="/dashboard/businesses"
              class="nav-link"
            >
              {{ locale === "es"
                ? "Mis negocios"
                : "My Businesses" }}
            </RouterLink>

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

            <button
              v-if="!authLoading && user"
              type="button"
              class="btn btn-outline-danger btn-sm"
              @click="showLogoutModal = true"
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

    <div class="flex-grow-1">
      <RouterView />
    </div>

    <footer
      class="border-top py-4 text-center text-secondary small"
    >
      © {{ new Date().getFullYear() }} TurnoSimple
    </footer>

    <div
      v-if="showLogoutModal"
      class="ts-modal-overlay"
    >
      <div
        class="card shadow-lg p-4 ts-logout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logoutTitle"
        aria-describedby="logoutDescription"
        @keydown.esc="!logoutLoading && (showLogoutModal = false)"
      >
        <h2 id="logoutTitle" class="h4 fw-bold text-center">
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
            type="button"
            class="btn btn-outline-brand"
            :disabled="logoutLoading"
            @click="showLogoutModal = false"
          >
            {{ locale === "es" ? "Cancelar" : "Cancel" }}
          </button>

          <button
            type="button"
            class="btn btn-brand"
            :disabled="logoutLoading"
            @click="logout"
          >
            {{ logoutLoading
              ? (locale === "es" ? "Saliendo..." : "Logging out...")
              : (locale === "es" ? "Cerrar sesión" : "Log out") }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
