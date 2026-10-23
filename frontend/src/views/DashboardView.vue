
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
