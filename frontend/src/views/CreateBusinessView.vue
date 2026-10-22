
<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { supabase } from "../lib/supabase";

const router = useRouter();
const { locale } = useI18n();

const name = ref("");
const category = ref("");
const description = ref("");
const loading = ref(false);
const error = ref("");

const slug = computed(() =>
  name.value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
);

async function createBusiness() {
  error.value = "";
  loading.value = true;

  try {
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      throw new Error(
        locale.value === "es"
          ? "Debés iniciar sesión."
          : "You must log in."
      );
    }

    if (!slug.value) {
      throw new Error(
        locale.value === "es"
          ? "Ingresá un nombre válido."
          : "Enter a valid business name."
      );
    }

    const { error: insertError } = await supabase
      .from("businesses")
      .insert({
        owner_id: userData.user.id,
        name: name.value.trim(),
        slug: slug.value,
        category: category.value,
        description: description.value.trim()
      });

    if (insertError) {
      if (insertError.code === "23505") {
        throw new Error(
          locale.value === "es"
            ? "Ese nombre de URL ya está ocupado. Probá con otro nombre."
            : "That URL is already taken. Try another name."
        );
      }

      throw insertError;
    }

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
    <div
      class="card border-0 shadow-sm mx-auto"
      style="max-width: 600px;"
    >
      <div class="card-body p-4 p-md-5">

        <h2 class="fw-bold mb-2">
          {{ locale === "es"
            ? "Creá tu negocio"
            : "Create your business" }}
        </h2>

        <p class="text-secondary mb-4">
          {{ locale === "es"
            ? "Configurá tu negocio para comenzar a recibir reservas."
            : "Set up your business to start receiving bookings." }}
        </p>

        
<div
  v-if="error"
  class="alert alert-danger"
  role="alert"
>
  <i class="bi bi-exclamation-circle me-2"
     aria-hidden="true"></i>
  {{ error }}
</div>


        <form @submit.prevent="createBusiness">

          
<div class="mb-3">
  <label for="businessName" class="form-label">
    {{ locale === "es"
      ? "Nombre del negocio"
      : "Business name" }}
    <span aria-hidden="true">*</span>
  </label>

  <input
    id="businessName"
    v-model="name"
    class="form-control"
    type="text"
    autocomplete="organization"
    maxlength="100"
    required
    aria-required="true"
    aria-describedby="businessNameHelp"
    placeholder="Beauty Studio"
  />

  <small
    id="businessNameHelp"
    class="text-secondary"
  >
    {{ locale === "es"
      ? "Ingresá el nombre comercial de tu negocio."
      : "Enter your business name." }}
  </small>
</div>


          
<div class="mb-3">
  <p id="bookingLinkLabel" class="form-label mb-2">
    {{ locale === "es"
      ? "Enlace de reservas"
      : "Booking link" }}
  </p>

  <div
    class="form-control bg-light text-secondary"
    role="group"
    aria-labelledby="bookingLinkLabel"
    aria-describedby="bookingLinkHelp"
  >
    /book/{{ slug || "mi-negocio" }}
  </div>

  <small
    id="bookingLinkHelp"
    class="text-secondary"
  >
    {{ locale === "es"
      ? "Este será el enlace público de tu negocio."
      : "This will be your public booking link." }}
  </small>
</div>


         
<div class="mb-3">
  <label for="businessCategory" class="form-label">
    {{ locale === "es" ? "Rubro" : "Category" }}
    <span aria-hidden="true">*</span>
  </label>

  <select
    id="businessCategory"
    v-model="category"
    class="form-select"
    required
    aria-required="true"
    aria-describedby="categoryHelp"
  >
    <option value="" disabled>
      {{ locale === "es"
        ? "Seleccioná un rubro"
        : "Select a category" }}
    </option>

    <option value="beauty">
      {{ locale === "es" ? "Belleza" : "Beauty" }}
    </option>

    <option value="wellness">
      {{ locale === "es" ? "Bienestar" : "Wellness" }}
    </option>

    <option value="education">
      {{ locale === "es" ? "Educación" : "Education" }}
    </option>

    <option value="fitness">Fitness</option>

    <option value="other">
      {{ locale === "es" ? "Otro" : "Other" }}
    </option>
  </select>

  <small id="categoryHelp" class="text-secondary">
    {{ locale === "es"
      ? "Seleccioná la actividad principal de tu negocio."
      : "Select your main business activity." }}
  </small>
</div>


         
<div class="mb-4">
  <label for="businessDescription" class="form-label">
    {{ locale === "es"
      ? "Descripción (opcional)"
      : "Description (optional)" }}
  </label>

  <textarea
    id="businessDescription"
    v-model="description"
    class="form-control"
    rows="3"
    maxlength="500"
    aria-describedby="descriptionHelp"
  ></textarea>

  <small id="descriptionHelp" class="text-secondary">
    {{ locale === "es"
      ? "Contá brevemente qué ofrece tu negocio. Máximo 500 caracteres."
      : "Briefly describe your business. Maximum 500 characters." }}
  </small>
</div>

          
<button
  type="submit"
  class="btn btn-brand w-100"
  :disabled="loading"
  :aria-busy="loading"
>
  <i
    class="bi bi-check-circle me-2"
    aria-hidden="true"
  ></i>

  {{ loading
    ? (locale === "es" ? "Creando..." : "Creating...")
    : (locale === "es" ? "Crear negocio" : "Create business") }}
</button>


        </form>
      </div>
    </div>
  </main>
</template>
