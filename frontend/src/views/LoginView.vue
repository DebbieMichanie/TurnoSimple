
<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { supabase } from "../lib/supabase";

const router = useRouter();
const { locale } = useI18n();

const email = ref("");
const password = ref("");

const showPassword = ref(false);

const loading = ref(false);
const error = ref("");

async function handleLogin() {
  loading.value = true;
  error.value = "";

  try {
    const { error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      });

    if (authError) throw authError;

    router.push("/dashboard");
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
         style="max-width: 450px;">
      <div class="card-body p-4 p-md-5">

        <h2 class="fw-bold mb-2">
          {{ locale === "es"
            ? "Bienvenido de nuevo"
            : "Welcome back" }}
        </h2>

        <p class="text-secondary mb-4">
          {{ locale === "es"
            ? "Ingresá para administrar tu negocio."
            : "Log in to manage your business." }}
        </p>

        <div v-if="error" class="alert alert-danger">
          {{ error }}
        </div>

        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <label for="loginEmail" class="form-label">
              Email
            </label>
            <input
              id="loginEmail"
              v-model="email"
              type="email"
              class="form-control"
              autocomplete="email"
              required
            />
          </div>

          
<div class="mb-4">
  <label for="loginPassword" class="form-label">
    {{ locale === "es" ? "Contraseña" : "Password" }}
  </label>

  <div class="input-group">
    <input
      id="loginPassword"
      v-model="password"
      :type="showPassword ? 'text' : 'password'"
      class="form-control"
      autocomplete="current-password"
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
</div>

          <button
            type="submit"
            class="btn btn-brand w-100 py-2"
            :disabled="loading"
          >
            {{ loading
              ? (locale === "es" ? "Ingresando..." : "Logging in...")
              : (locale === "es" ? "Iniciar sesión" : "Log in") }}
          </button>
        </form>

        <p class="text-center mt-4 mb-0">
          {{ locale === "es"
            ? "¿No tenés una cuenta?"
            : "Don't have an account?" }}

          <RouterLink to="/register" class="text-decoration-none">
            {{ locale === "es" ? "Registrate" : "Sign up" }}
          </RouterLink>
        </p>

      </div>
    </div>
  </main>
</template>
