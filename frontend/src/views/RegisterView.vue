
<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { supabase } from "../lib/supabase";

const router = useRouter();
const { locale } = useI18n();

const name = ref("");
const email = ref("");
const password = ref("");

const showPassword = ref(false);

const loading = ref(false);
const error = ref("");
const success = ref("");

async function handleRegister() {
  error.value = "";
  success.value = "";
  loading.value = true;

  try {
    const { data, error: authError } =
      await supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: {
          data: {
            full_name: name.value.trim()
          },
          emailRedirectTo: window.location.origin + "/login"
        }
      });

    if (authError) throw authError;

    if (data.session) {
      router.push("/dashboard");
    } else {
      success.value = locale.value === "es"
        ? "¡Cuenta creada! Revisá tu email para confirmarla."
        : "Account created! Check your email to confirm it.";
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="container py-5">
    <div class="card border-0 shadow-sm mx-auto"
         style="max-width: 480px;">
      <div class="card-body p-4 p-md-5">

        <h2 class="fw-bold mb-2">
          {{ locale === "es"
            ? "Crear una cuenta"
            : "Create an account" }}
        </h2>

        <p class="text-secondary mb-4">
          {{ locale === "es"
            ? "Empezá a gestionar tu negocio con TurnoSimple."
            : "Start managing your business with TurnoSimple." }}
        </p>

        <div v-if="error" class="alert alert-danger">
          {{ error }}
        </div>

        <div v-if="success" class="alert alert-success">
          {{ success }}
        </div>

        <form @submit.prevent="handleRegister">
          <div class="mb-3">
            <label for="registerName" class="form-label">
              {{ locale === "es" ? "Nombre completo" : "Full name" }}
            </label>
            <input
              id="registerName"
              v-model="name"
              type="text"
              class="form-control"
              autocomplete="name"
              required
            />
          </div>

          <div class="mb-3">
            <label for="registerEmail" class="form-label">
              Email
            </label>
            <input
              id="registerEmail"
              v-model="email"
              type="email"
              class="form-control"
              autocomplete="email"
              required
            />
          </div>

          
<div class="mb-4">
  <label for="registerPassword" class="form-label">
    {{ locale === "es" ? "Contraseña" : "Password" }}
  </label>

  <div class="input-group">
    <input
      id="registerPassword"
      v-model="password"
      :type="showPassword ? 'text' : 'password'"
      class="form-control"
      autocomplete="new-password"
      minlength="8"
      required
    />

    <button
      type="button"
      class="btn btn-outline-brand"
      :aria-label="showPassword
        ? 'Hide password'
        : 'Show password'"
      :aria-pressed="showPassword"
      @click="showPassword = !showPassword"
    >
      <i
        :class="showPassword
          ? 'bi bi-eye-slash'
          : 'bi bi-eye'"
      ></i>
    </button>
  </div>

  <small class="text-secondary">
    {{ locale === "es"
      ? "Mínimo 8 caracteres."
      : "At least 8 characters." }}
  </small>
</div>


          <button
            type="submit"
            class="btn btn-brand w-100 py-2"
            :disabled="loading"
          >
            {{ loading
              ? (locale === "es" ? "Creando..." : "Creating...")
              : (locale === "es" ? "Registrarme" : "Sign up") }}
          </button>
        </form>

        <p class="text-center mt-4 mb-0">
          {{ locale === "es"
            ? "¿Ya tenés una cuenta?"
            : "Already have an account?" }}

          <RouterLink to="/login" class="text-decoration-none">
            {{ locale === "es" ? "Iniciar sesión" : "Log in" }}
          </RouterLink>
        </p>

      </div>
    </div>
  </main>
</template>
