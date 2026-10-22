
<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { supabase } from "../lib/supabase";

const router = useRouter();
const { locale } = useI18n();

const showLogoutModal = ref(false);
const loading = ref(false);
const error = ref("");

async function logout() {
  loading.value = true;
  error.value = "";

  try {
    const { error: authError } =
      await supabase.auth.signOut();

    if (authError) throw authError;

    showLogoutModal.value = false;
    router.push("/login");
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="container py-5">
    <div class="card shadow-sm border-0 p-4">

      <h1 class="fw-bold">
        {{ locale === "es"
          ? "Panel de administración"
          : "Business Dashboard" }}
      </h1>

      <p class="text-secondary">
        {{ locale === "es"
          ? "Administrá tu negocio, empleados y reservas."
          : "Manage your business, employees and bookings." }}
      </p>

<RouterLink
  to="/dashboard/businesses"
  class="btn btn-outline-brand align-self-start mb-3"
>
  <i class="bi bi-shop me-2" aria-hidden="true"></i>
  {{ locale === "es"
    ? "Ver mis negocios"
    : "View my businesses" }}
</RouterLink>

      
<RouterLink
  to="/dashboard/create-business"
  class="btn btn-brand align-self-start mb-3"
>
  <i class="bi bi-plus-circle me-2"></i>
  {{ locale === "es"
    ? "Crear mi negocio"
    : "Create my business" }}
</RouterLink>


      <button
        class="btn btn-outline-danger align-self-start"
        @click="showLogoutModal = true"
      >
        <i class="bi bi-box-arrow-right me-2"></i>
        {{ locale === "es" ? "Cerrar sesión" : "Log out" }}
      </button>
    </div>

    <div
      v-if="showLogoutModal"
      class="modal-backdrop-custom"
      @click.self="showLogoutModal = false"
    >
      <div
        class="card shadow-lg p-4 logout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logoutTitle"
      >
        <div class="text-center mb-3">
          <i class="bi bi-box-arrow-right fs-1 text-danger"></i>
        </div>

        <h4 id="logoutTitle" class="fw-bold text-center">
          {{ locale === "es"
            ? "¿Cerrar sesión?"
            : "Log out?" }}
        </h4>

        <p class="text-secondary text-center">
          {{ locale === "es"
            ? "¿Estás seguro de que querés cerrar tu sesión?"
            : "Are you sure you want to log out?" }}
        </p>

        <div v-if="error" class="alert alert-danger">
          {{ error }}
        </div>

        <div class="d-flex justify-content-center gap-2 mt-3">
          <button
            class="btn btn-outline-brand"
            :disabled="loading"
            @click="showLogoutModal = false"
          >
            {{ locale === "es" ? "Cancelar" : "Cancel" }}
          </button>

          <button
            class="btn btn-brand"
            :disabled="loading"
            @click="logout"
          >
            {{ loading
              ? (locale === "es" ? "Saliendo..." : "Logging out...")
              : (locale === "es" ? "Cerrar sesión" : "Log out") }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(20, 30, 40, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1050;
}

.logout-modal {
  
  width: 40%;
  border-radius: 20px;
}
</style>
