
<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { supabase } from "../lib/supabase";

const route = useRoute();
const { locale } = useI18n();

const business = ref(null);
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

async function loadBusiness() {
  loading.value = true;
  error.value = "";
  business.value = null;

  try {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      throw new Error("Authentication required");
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
        address,
        city,
        phone,
        contact_email,
        website, 
        image_url, 
        image_type
      `)
      .eq("id", route.params.id)
      .eq("owner_id", authData.user.id)
      .single();

    if (fetchError) throw fetchError;

    business.value = data;

  } catch (err) {
    console.error("Business detail error:", err);

    error.value = tr(
      "No se pudo cargar el negocio.",
      "Could not load business."
    );
  } finally {
    loading.value = false;
  }
}

onMounted(loadBusiness);
watch(() => route.params.id, loadBusiness);

function websiteHref(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function phoneHref(value) {
  if (!value) return null;

  const cleaned = value.replace(/[^\d+]/g, "");
  return /^\+?\d{8,15}$/.test(cleaned)
    ? `tel:${cleaned}`
    : null;
}
</script>

<template>
  <main class="container py-5">

    <RouterLink
      to="/dashboard/businesses"
      class="btn btn-outline-brand mb-4"
    >
      <i class="bi bi-arrow-left me-2" aria-hidden="true"></i>
      {{ tr("Volver a mis negocios", "Back to my businesses") }}
    </RouterLink>

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
      <p>{{ tr("Cargando negocio...", "Loading business...") }}</p>
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
        @click="loadBusiness"
      >
        {{ tr("Reintentar", "Retry") }}
      </button>
    </div>

    <!-- BUSINESS DETAILS -->
    <article
      v-else-if="business"
      class="card border-0 shadow-sm business-detail"
    >

      <!-- IMAGE -->
     
<div
  v-if="business.image_url"
  class="detail-image-container"
  :class="{ 'detail-cover-container': business.image_type === 'cover' }"
>
  <img
    :src="business.image_url"
    :alt="locale === 'es'
      ? `Imagen de ${business.name}`
      : `Image of ${business.name}`"
    class="detail-image"
    :class="business.image_type === 'cover'
      ? 'detail-image-cover'
      : 'detail-image-logo'"
  />
</div>

          v-else
          class="detail-image-placeholder"
          aria-hidden="true"
        >
          <i class="bi bi-shop"></i>
        </div>

     

      <div class="card-body p-4 p-md-5">

        <div
          class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4"
        >
          <div>
            <h1 class="fw-bold mb-2">
              {{ business.name }}
            </h1>

            <span class="badge text-bg-light border">
              {{ categoryName(business.category) }}
            </span>
          </div>

          <RouterLink
            :to="`/dashboard/business/${business.id}/edit`"
            class="btn btn-outline-brand"
          >
            <i
              class="bi bi-pencil-square me-2"
              aria-hidden="true"
            ></i>
            {{ tr("Editar negocio", "Edit business") }}
          </RouterLink>
        </div>

        <!-- DESCRIPTION -->
        <section class="mb-4" aria-labelledby="descriptionTitle">
          <h2 id="descriptionTitle" class="h5 fw-bold mb-3">
            {{ tr("Sobre el negocio", "About the business") }}
          </h2>

          <p class="text-secondary">
            {{ business.description ||
              tr("Sin descripción.", "No description.") }}
          </p>
        </section>

        <hr />

        <!-- LOCATION -->
        <section
          v-if="business.address || business.city"
          class="my-4"
          aria-labelledby="locationTitle"
        >
          <h2 id="locationTitle" class="h5 fw-bold mb-3">
            <i class="bi bi-geo-alt me-2" aria-hidden="true"></i>
            {{ tr("Ubicación", "Location") }}
          </h2>

          <p v-if="business.address" class="mb-2">
            {{ business.address }}
          </p>

          <p v-if="business.city" class="text-secondary">
            {{ business.city }}
          </p>
        </section>

        <!-- CONTACT -->
        <section class="my-4" aria-labelledby="contactTitle">
          <h2 id="contactTitle" class="h5 fw-bold mb-3">
            <i class="bi bi-telephone me-2" aria-hidden="true"></i>
            {{ tr("Contacto", "Contact") }}
          </h2>

          <div v-if="business.phone" class="mb-3">
            <strong>{{ tr("Teléfono:", "Phone:") }}</strong>

            <a
              v-if="phoneHref(business.phone)"
              :href="phoneHref(business.phone)"
              class="ms-2"
            >
              {{ business.phone }}
            </a>

            <span v-else class="ms-2">
              {{ business.phone }}
            </span>
          </div>

          <div v-if="business.contact_email" class="mb-3">
            <strong>Email:</strong>

            <a
              :href="`mailto:${business.contact_email}`"
              class="ms-2 text-break"
            >
              {{ business.contact_email }}
            </a>
          </div>

          <div v-if="websiteHref(business.website)" class="mb-3">
            <strong>
              {{ tr("Sitio web:", "Website:") }}
            </strong>

            <a
              :href="websiteHref(business.website)"
              target="_blank"
              rel="noopener noreferrer"
              class="ms-2 text-break"
              :aria-label="tr(
                `Visitar el sitio web de ${business.name} (abre en una nueva pestaña)`,
                `Visit ${business.name}'s website (opens in a new tab)`
              )"
            >
              {{ business.website }}
              <i
                class="bi bi-box-arrow-up-right ms-1"
                aria-hidden="true"
              ></i>
            </a>
          </div>

          <p
            v-if="!business.phone &&
                  !business.contact_email &&
                  !business.website"
            class="text-secondary"
          >
            {{ tr(
              "Todavía no agregaste información de contacto.",
              "You haven't added contact information yet."
            ) }}
          </p>
        </section>

        <hr />

        <!-- BOOKING LINK -->
        <section class="my-4" aria-labelledby="bookingTitle">
          <h2 id="bookingTitle" class="h5 fw-bold mb-3">
            <i class="bi bi-calendar-check me-2" aria-hidden="true"></i>
            {{ tr("Enlace de reservas", "Booking link") }}
          </h2>

          <p class="text-secondary mb-2">
            {{ tr(
              "Este es el enlace que tus clientes podrán utilizar para reservar turnos.",
              "This is the link your customers will use to book appointments."
            ) }}
          </p>

          <div class="booking-link p-3">
            <code>/book/{{ business.slug }}</code>
          </div>
        </section>

        <!-- COMING SOON -->
        <div class="alert alert-info mt-4 mb-0" role="status">
          <i
            class="bi bi-info-circle me-2"
            aria-hidden="true"
          ></i>

          {{ tr(
            "Próximamente vas a poder administrar empleados, servicios, horarios y reservas desde esta página.",
            "Soon you'll be able to manage employees, services, schedules and bookings here."
          ) }}
        </div>

      </div>
    </article>

  </main>
</template>

<style scoped>
.business-detail {
  overflow: hidden;
  border-radius: 18px;
}


.detail-image-container {
  width: 100%;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4faf9;
  padding: 25px;
  overflow: hidden;
}

.detail-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}


.detail-image-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ts-primary-hover, #329d9d);
  font-size: 64px;
}

.booking-link {
  background: #f5f9f9;
  border: 1px solid #e1eeee;
  border-radius: 12px;
  overflow-wrap: anywhere;
}

.booking-link code {
  color: #268c8c;
}


.detail-image-logo {
  object-fit: contain;
}

.detail-image-cover {
  object-fit: cover;
}

.detail-cover-container {
  padding: 0;
}

@media (max-width: 576px) {
  .detail-image-container {
    height: 200px;
  }
}

</style>
