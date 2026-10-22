
<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { supabase } from "../lib/supabase";

const { locale } = useI18n();

const businesses = ref([]);
const loading = ref(true);
const error = ref("");

const tr = (es, en) => locale.value === "es" ? es : en;

const categories = {
  beauty: { es: "Belleza", en: "Beauty" },
  wellness: { es: "Bienestar", en: "Wellness" },
  education: { es: "Educación", en: "Education" },
  fitness: { es: "Fitness", en: "Fitness" },
  other: { es: "Otro", en: "Other" }
};

function categoryName(category) {
  return categories[category]?.[locale.value] || category;
}

async function loadBusinesses() {
  loading.value = true;
  error.value = "";

  try {
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      throw new Error(
        tr("Debés iniciar sesión.", "You must log in.")
      );
    }

    const { data, error: fetchError } = await supabase
      .from("businesses")
      .select(`
        id,
        name,
        slug,
        category,
        description,
        image_url,
        image_type,
        city
      `)
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;

    businesses.value = data || [];

  } catch (err) {
    console.error("Error loading businesses:", err);
    error.value = tr(
      "No se pudieron cargar tus negocios.",
      "Could not load your businesses."
    );
  } finally {
    loading.value = false;
  }
}

onMounted(loadBusinesses);
</script>

<template>
  <main class="container py-5">

    <div
      class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4"
    >
      <div>
        <h1 class="fw-bold mb-2">
          {{ tr("Mis negocios", "My Businesses") }}
        </h1>

        <p class="text-secondary mb-0">
          {{ tr(
            "Administrá todos tus negocios desde un solo lugar.",
            "Manage all your businesses in one place."
          ) }}
        </p>
      </div>

      <RouterLink
        to="/dashboard/create-business"
        class="btn btn-brand"
      >
        <i class="bi bi-plus-circle me-2" aria-hidden="true"></i>
        {{ tr("Nuevo negocio", "New Business") }}
      </RouterLink>
    </div>

    <!-- LOADING -->
    <div
      v-if="loading"
      class="text-center py-5"
      role="status"
      aria-live="polite"
    >
      <div
        class="spinner-border text-info mb-3"
        aria-hidden="true"
      ></div>

      <p>{{ tr("Cargando negocios...", "Loading businesses...") }}</p>
    </div>

    <!-- ERROR -->
    <div
      v-else-if="error"
      class="alert alert-danger"
      role="alert"
    >
      <p>{{ error }}</p>

      <button
        type="button"
        class="btn btn-outline-danger"
        @click="loadBusinesses"
      >
        {{ tr("Reintentar", "Retry") }}
      </button>
    </div>

    <!-- EMPTY -->
    <div
      v-else-if="businesses.length === 0"
      class="card border-0 shadow-sm text-center p-5"
    >
      <i class="bi bi-shop fs-1 mb-3" aria-hidden="true"></i>

      <h2 class="h4 fw-bold">
        {{ tr(
          "Todavía no tenés negocios",
          "You don't have any businesses yet"
        ) }}
      </h2>

      <p class="text-secondary">
        {{ tr(
          "Creá tu primer negocio para comenzar.",
          "Create your first business to get started."
        ) }}
      </p>

      <RouterLink
        to="/dashboard/create-business"
        class="btn btn-brand align-self-center"
      >
        {{ tr("Crear negocio", "Create business") }}
      </RouterLink>
    </div>

    <!-- BUSINESS CARDS -->
    <div v-else class="row g-4">

      <div
        v-for="business in businesses"
        :key="business.id"
        class="col-12 col-md-6 col-xl-4"
      >
        <article class="card border-0 shadow-sm h-100 business-card">

          <!-- BUSINESS IMAGE -->
          <div class="business-image-container">

            
<img
  v-if="business.image_url"
  :src="business.image_url"
  :alt="locale === 'es'
    ? `Imagen de ${business.name}`
    : `Image of ${business.name}`"
  class="business-image"
  :class="business.image_type === 'cover'
    ? 'business-image-cover'
    : 'business-image-logo'"
/>
            <div
              v-else
              class="business-image-placeholder"
              aria-hidden="true"
            >
              <i class="bi bi-shop"></i>
            </div>

          </div>

          <div class="card-body p-4 d-flex flex-column">

            <h2 class="h5 fw-bold mb-2">
              {{ business.name }}
            </h2>

            <p class="text-secondary small mb-2">
              <i class="bi bi-tag me-2" aria-hidden="true"></i>
              {{ categoryName(business.category) }}
            </p>

            <p
              v-if="business.city"
              class="text-secondary small mb-2"
            >
              <i class="bi bi-geo-alt me-2" aria-hidden="true"></i>
              {{ business.city }}
            </p>

            <p class="text-secondary flex-grow-1 mt-2">
              {{ business.description ||
                tr("Sin descripción.", "No description.") }}
            </p>

            <div class="small text-secondary mb-3">
              <i class="bi bi-link-45deg me-1" aria-hidden="true"></i>
              /book/{{ business.slug }}
            </div>

            <RouterLink
              :to="`/dashboard/business/${business.id}`"
              class="btn btn-brand w-100"
              :aria-label="tr(
                `Administrar ${business.name}`,
                `Manage ${business.name}`
              )"
            >
              <i class="bi bi-gear me-2" aria-hidden="true"></i>
              {{ tr("Administrar negocio", "Manage business") }}
            </RouterLink>

          </div>
        </article>
      </div>
    </div>

  </main>
</template>

<style scoped>
.business-card {
  overflow: hidden;
  border-radius: 18px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.business-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08) !important;
}


.business-image-container {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #f4faf9;
  padding: 20px;
}

.business-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}


.business-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ts-primary-hover, #329d9d);
  font-size: 48px;
}

@media (prefers-reduced-motion: reduce) {
  .business-card {
    transition: none;
  }

  .business-card:hover {
    transform: none;
  }
}

.business-image-logo {
  object-fit: contain;
}

.business-image-cover {
  object-fit: cover;
}
.business-image-container:has(.business-image-cover) {
  padding: 0;
}
</style>
