
<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  nextTick
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { supabase } from "../lib/supabase";

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();

const business = ref(null);
const loading = ref(true);
const saving = ref(false);
const loadError = ref("");

const name = ref("");
const category = ref("");
const description = ref("");
const address = ref("");
const city = ref("");
const phone = ref("");
const contactEmail = ref("");
const website = ref("");
const imageUrl = ref("");
const imageType = ref("logo");

const selectedImage = ref(null);
const previewUrl = ref("");
const imageInput = ref(null);

const errors = ref({});
const attemptedSubmit = ref(false);

const notification = ref({
  show: false,
  type: "error",
  message: ""
});

const categories = [
  { value: "beauty", es: "Belleza", en: "Beauty" },
  { value: "wellness", es: "Bienestar", en: "Wellness" },
  { value: "education", es: "Educación", en: "Education" },
  { value: "fitness", es: "Fitness", en: "Fitness" },
  { value: "other", es: "Otro", en: "Other" }
];

const tr = (es, en) => locale.value === "es" ? es : en;

const phoneError = computed(() => {
  const value = phone.value.trim();
  if (!value) return "";

  if (!/^\+?[0-9\s().-]+$/.test(value)) {
    return tr(
      "Usá solamente números y símbolos telefónicos válidos.",
      "Use only numbers and valid phone symbols."
    );
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length < 8 || digits.length > 15) {
    return tr(
      "Ingresá entre 8 y 15 dígitos.",
      "Enter between 8 and 15 digits."
    );
  }

  return "";
});

const emailError = computed(() => {
  const value = contactEmail.value.trim();
  if (!value) return "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return tr(
      "Ingresá un email válido.",
      "Enter a valid email address."
    );
  }

  return "";
});

const websiteError = computed(() => {
  const value = website.value.trim();
  if (!value) return "";

  try {
    const url = new URL(value);

    if (
      !["https:", "http:"].includes(url.protocol) ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password
    ) {
      throw new Error("Invalid URL");
    }

    return "";
  } catch {
    return tr(
      "Ingresá una URL válida que comience con https://",
      "Enter a valid URL starting with https://"
    );
  }
});

function notify(message, type = "error") {
  notification.value = {
    show: true,
    type,
    message
  };
}

function closeNotification() {
  notification.value.show = false;
}

function clearPreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }
}

onUnmounted(clearPreview);

async function loadBusiness() {
  loading.value = true;
  loadError.value = "";

  try {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      throw new Error(
        tr("Debés iniciar sesión.", "You must log in.")
      );
    }

    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", route.params.id)
      .eq("owner_id", authData.user.id)
      .single();

    if (error) throw error;

    business.value = data;

    name.value = data.name || "";
    category.value = data.category || "";
    description.value = data.description || "";
    address.value = data.address || "";
    city.value = data.city || "";
    phone.value = data.phone || "";
    contactEmail.value = data.contact_email || "";
    website.value = data.website || "";
    imageUrl.value = data.image_url || "";
    imageType.value = data.image_type || "logo";

  } catch (err) {
    console.error("Business load error:", err);
    loadError.value = err.message;
  } finally {
    loading.value = false;
  }
}

function handleImageChange(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowed.includes(file.type)) {
    notify(tr(
      "Seleccioná una imagen JPG, PNG o WebP.",
      "Select a JPG, PNG or WebP image."
    ));
    event.target.value = "";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    notify(tr(
      "La imagen no puede superar los 2 MB.",
      "The image must not exceed 2 MB."
    ));
    event.target.value = "";
    return;
  }

  selectedImage.value = file;
  clearPreview();
  previewUrl.value = URL.createObjectURL(file);

  delete errors.value.image;
  closeNotification();
}

function validateForm() {
  const nextErrors = {};

  if (!name.value.trim()) {
    nextErrors.name = tr(
      "El nombre es obligatorio.",
      "Business name is required."
    );
  }

  if (!categories.some(c => c.value === category.value)) {
    nextErrors.category = tr(
      "Seleccioná un rubro válido.",
      "Select a valid category."
    );
  }

  if (name.value.trim().length > 100) {
    nextErrors.name = tr(
      "Máximo 100 caracteres.",
      "Maximum 100 characters."
    );
  }

  if (description.value.length > 500) {
    nextErrors.description = tr(
      "Máximo 500 caracteres.",
      "Maximum 500 characters."
    );
  }

  if (city.value.trim() && !/^[\p{L}\p{M}\s.'-]{2,100}$/u.test(city.value.trim())) {
    nextErrors.city = tr(
      "Ingresá un nombre de ciudad válido.",
      "Enter a valid city name."
    );
  }

  if (address.value.length > 200) {
    nextErrors.address = tr(
      "Máximo 200 caracteres.",
      "Maximum 200 characters."
    );
  }

  if (phoneError.value) nextErrors.phone = phoneError.value;
  if (emailError.value) nextErrors.email = emailError.value;
  if (websiteError.value) nextErrors.website = websiteError.value;

  errors.value = nextErrors;

  return Object.keys(nextErrors).length === 0;
}

async function focusFirstError() {
  await nextTick();

  const first = Object.keys(errors.value)[0];

  const ids = {
    name: "editName",
    category: "editCategory",
    description: "editDescription",
    address: "editAddress",
    city: "editCity",
    phone: "editPhone",
    email: "editEmail",
    website: "editWebsite"
  };

  document.getElementById(ids[first])?.focus();
}

async function uploadImage() {
  if (!selectedImage.value) {
    return { url: imageUrl.value, path: null };
  }

  const file = selectedImage.value;

  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  }[file.type];

  const filePath =
    `${business.value.id}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("business-images")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(
      tr(
        `No se pudo subir la imagen: ${error.message}`,
        `Could not upload image: ${error.message}`
      )
    );
  }

  const { data } = supabase.storage
    .from("business-images")
    .getPublicUrl(filePath);

  return {
    url: data.publicUrl,
    path: filePath
  };
}

async function saveBusiness() {
  if (saving.value || !business.value) return;

  attemptedSubmit.value = true;

  if (!validateForm()) {
    notify(tr(
      "Revisá los campos marcados antes de guardar.",
      "Review the highlighted fields before saving."
    ));
    await focusFirstError();
    return;
  }

  saving.value = true;
  closeNotification();

  let uploadedPath = null;

  try {
    const uploaded = await uploadImage();
    uploadedPath = uploaded.path;

    const { data, error } = await supabase
      .from("businesses")
      .update({
        name: name.value.trim(),
        category: category.value,
        description: description.value.trim(),
        address: address.value.trim(),
        city: city.value.trim(),
        phone: phone.value.trim(),
        contact_email: contactEmail.value.trim(),
        website: website.value.trim(),
        image_url: uploaded.url,
        image_type: imageType.value
      })
      .eq("id", business.value.id)
      .eq("owner_id", business.value.owner_id)
      .select("id")
      .single();

    if (error) {
      console.error("Business update error:", error);
      throw new Error(
        tr(
          `No se pudo actualizar el negocio: ${error.message}`,
          `Could not update business: ${error.message}`
        )
      );
    }

    if (!data) {
      throw new Error(
        tr(
          "No se confirmó la actualización.",
          "The update could not be confirmed."
        )
      );
    }

    await router.push(
      `/dashboard/business/${business.value.id}`
    );

  } catch (err) {
    console.error("Save business failed:", err);

    // Si la base de datos falla después de subir una imagen,
    // intentamos eliminar el archivo recién creado.
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage
        .from("business-images")
        .remove([uploadedPath]);

      if (cleanupError) {
        console.warn("Image cleanup failed:", cleanupError);
      }
    }

    notify(err.message || tr(
      "Ocurrió un error al guardar.",
      "An error occurred while saving."
    ));
  } finally {
    saving.value = false;
  }
}

onMounted(loadBusiness);
</script>

<template>
  <main class="container py-5">

    <RouterLink
      :to="`/dashboard/business/${route.params.id}`"
      class="btn btn-outline-brand mb-4"
    >
      <i class="bi bi-arrow-left me-2" aria-hidden="true"></i>
      {{ tr("Volver", "Back") }}
    </RouterLink>

    <div
      v-if="loading"
      class="text-center py-5"
      role="status"
      aria-live="polite"
    >
      <div class="spinner-border text-info" aria-hidden="true"></div>
      <p class="mt-3">{{ tr("Cargando negocio...", "Loading business...") }}</p>
    </div>

    <div
      v-else-if="loadError"
      class="alert alert-danger"
      role="alert"
    >
      {{ loadError }}
    </div>

    <div
      v-else
      class="card border-0 shadow-sm mx-auto"
      style="max-width: 750px;"
    >
      <div class="card-body p-4 p-md-5">

        <h1 class="fw-bold mb-2">
          {{ tr("Editar negocio", "Edit business") }}
        </h1>

        <p class="text-secondary mb-4">
          {{ tr(
            "Actualizá la información que verán tus clientes.",
            "Update the information your customers will see."
          ) }}
        </p>

        <p class="small text-secondary">
          {{ tr(
            "Los campos marcados con * son obligatorios.",
            "Fields marked with * are required."
          ) }}
        </p>

        <form novalidate @submit.prevent="saveBusiness">

          <!-- IMAGE -->

          <div class="mb-4">
            <label for="businessImage" class="form-label fw-medium">
              {{ tr("Foto o logo del negocio", "Business photo or logo") }}
            </label>

            <div v-if="previewUrl || imageUrl" class="mb-3">
              <img
                :src="previewUrl || imageUrl"
                :alt="tr(`Imagen de ${name}`, `Image of ${name}`)"
                class="business-preview"
              />
            </div>

            <input
              id="businessImage"
              ref="imageInput"
              type="file"
              class="form-control"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby="imageHelp"
              @change="handleImageChange"
            />

            <small id="imageHelp" class="form-text">
              {{ tr(
                "Subí una imagen JPG, PNG o WebP. Máximo 2 MB.",
                "Upload a JPG, PNG or WebP image. Maximum 2 MB."
              ) }}
            </small>
          </div>
            
<fieldset class="mb-4">
  <legend class="form-label fw-medium">
    {{ tr("Tipo de imagen", "Image type") }}
  </legend>

  <p id="imageTypeHelp" class="text-secondary small">
    {{ tr(
      "Elegí cómo querés mostrar la imagen de tu negocio.",
      "Choose how your business image should appear."
    ) }}
  </p>

  <div class="form-check mb-2">
    <input
      id="imageLogo"
      v-model="imageType"
      class="form-check-input"
      type="radio"
      value="logo"
      name="imageType"
      aria-describedby="imageTypeHelp"
    />

    <label class="form-check-label" for="imageLogo">
      {{ tr("Logo (imagen completa)", "Logo (full image)") }}
    </label>
  </div>

  <div class="form-check">
    <input
      id="imageCover"
      v-model="imageType"
      class="form-check-input"
      type="radio"
      value="cover"
      name="imageType"
      aria-describedby="imageTypeHelp"
    />

    <label class="form-check-label" for="imageCover">
      {{ tr("Foto de portada", "Cover photo") }}
    </label>
  </div>
</fieldset>

          <div class="row g-4">
            
            <!-- NAME -->

            <div class="col-md-6">
              <label for="editName" class="form-label">
                {{ tr("Nombre del negocio", "Business name") }}
                <span aria-hidden="true">*</span>
              </label>

              <input
                id="editName"
                v-model="name"
                class="form-control"
                :class="{ 'is-invalid': errors.name }"
                type="text"
                autocomplete="organization"
                placeholder="Beauty Studio"
                maxlength="100"
                required
                aria-required="true"
                aria-describedby="nameHelp nameError"
                :aria-invalid="!!errors.name"
              />

              <small id="nameHelp" class="form-text">
                {{ tr(
                  "Escribí el nombre comercial de tu negocio.",
                  "Enter your business's commercial name."
                ) }}
              </small>

              <div
                v-if="errors.name"
                id="nameError"
                class="invalid-feedback d-block"
              >
                {{ errors.name }}
              </div>
            </div>

            <!-- CATEGORY -->

            <div class="col-md-6">
              <label for="editCategory" class="form-label">
                {{ tr("Rubro", "Category") }}
                <span aria-hidden="true">*</span>
              </label>

              <select
                id="editCategory"
                v-model="category"
                class="form-select"
                :class="{ 'is-invalid': errors.category }"
                required
                aria-required="true"
                aria-describedby="categoryHelp categoryError"
                :aria-invalid="!!errors.category"
              >
                <option value="" disabled>
                  {{ tr("Seleccioná un rubro", "Select a category") }}
                </option>

                <option
                  v-for="item in categories"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item[locale] }}
                </option>
              </select>

              <small id="categoryHelp" class="form-text">
                {{ tr(
                  "Seleccioná la actividad principal del negocio.",
                  "Select the main business activity."
                ) }}
              </small>

              <div
                v-if="errors.category"
                id="categoryError"
                class="invalid-feedback d-block"
              >
                {{ errors.category }}
              </div>
            </div>

            <!-- DESCRIPTION -->

            <div class="col-12">
              <label for="editDescription" class="form-label">
                {{ tr("Descripción", "Description") }}
              </label>

              <textarea
                id="editDescription"
                v-model="description"
                class="form-control"
                :class="{ 'is-invalid': errors.description }"
                rows="3"
                maxlength="500"
                :placeholder="tr(
                  'Ofrecemos servicios de belleza personalizados...',
                  'We offer personalized beauty services...'
                )"
                aria-describedby="descriptionHelp descriptionError"
                :aria-invalid="!!errors.description"
              ></textarea>

              <small id="descriptionHelp" class="form-text">
                {{ tr(
                  `Describí tus servicios. ${description.length}/500 caracteres.`,
                  `Describe your services. ${description.length}/500 characters.`
                ) }}
              </small>

              <div
                v-if="errors.description"
                id="descriptionError"
                class="invalid-feedback d-block"
              >
                {{ errors.description }}
              </div>
            </div>

            <!-- ADDRESS -->

            <div class="col-md-6">
              <label for="editAddress" class="form-label">
                {{ tr("Dirección", "Address") }}
              </label>

              <input
                id="editAddress"
                v-model="address"
                class="form-control"
                :class="{ 'is-invalid': errors.address }"
                type="text"
                autocomplete="street-address"
                placeholder="Av. Santa Fe 1234"
                maxlength="200"
                aria-describedby="addressHelp addressError"
                :aria-invalid="!!errors.address"
              />

              <small id="addressHelp" class="form-text">
                {{ tr(
                  "Ingresá calle y número. Dejalo vacío si atendés online.",
                  "Enter street and number. Leave blank if online only."
                ) }}
              </small>

              <div
                v-if="errors.address"
                id="addressError"
                class="invalid-feedback d-block"
              >
                {{ errors.address }}
              </div>
            </div>

            <!-- CITY -->

            <div class="col-md-6">
              <label for="editCity" class="form-label">
                {{ tr("Ciudad", "City") }}
              </label>

              <input
                id="editCity"
                v-model="city"
                class="form-control"
                :class="{ 'is-invalid': errors.city }"
                type="text"
                autocomplete="address-level2"
                :placeholder="tr('Buenos Aires', 'Buenos Aires')"
                maxlength="100"
                aria-describedby="cityHelp cityError"
                :aria-invalid="!!errors.city"
              />

              <small id="cityHelp" class="form-text">
                {{ tr(
                  "Ingresá tu ciudad. Próximamente habrá autocompletado.",
                  "Enter your city. Autocomplete will be added soon."
                ) }}
              </small>

              <div
                v-if="errors.city"
                id="cityError"
                class="invalid-feedback d-block"
              >
                {{ errors.city }}
              </div>
            </div>

            <!-- PHONE -->

            <div class="col-md-6">
              <label for="editPhone" class="form-label">
                {{ tr("Teléfono / WhatsApp", "Phone / WhatsApp") }}
              </label>

              <input
                id="editPhone"
                v-model="phone"
                class="form-control"
                :class="{ 'is-invalid': errors.phone || (attemptedSubmit && phoneError) }"
                type="tel"
                autocomplete="tel"
                inputmode="tel"
                placeholder="+54 11 1234-5678"
                aria-describedby="phoneHelp phoneError"
                :aria-invalid="!!(errors.phone || (attemptedSubmit && phoneError))"
              />

              <small id="phoneHelp" class="form-text">
                {{ tr(
                  "Incluí código de país y área. Entre 8 y 15 dígitos.",
                  "Include country and area code. Between 8 and 15 digits."
                ) }}
              </small>

              <div
                v-if="errors.phone || (attemptedSubmit && phoneError)"
                id="phoneError"
                class="invalid-feedback d-block"
              >
                {{ phoneError || errors.phone }}
              </div>
            </div>

            <!-- EMAIL -->

            <div class="col-md-6">
              <label for="editEmail" class="form-label">
                {{ tr("Email de contacto", "Contact email") }}
              </label>

              <input
                id="editEmail"
                v-model="contactEmail"
                class="form-control"
                :class="{ 'is-invalid': errors.email || (attemptedSubmit && emailError) }"
                type="email"
                autocomplete="email"
                placeholder="contacto@negocio.com"
                aria-describedby="emailHelp emailError"
                :aria-invalid="!!(errors.email || (attemptedSubmit && emailError))"
              />

              <small id="emailHelp" class="form-text">
                {{ tr(
                  "Ingresá un email comercial válido.",
                  "Enter a valid business email."
                ) }}
              </small>

              <div
                v-if="errors.email || (attemptedSubmit && emailError)"
                id="emailError"
                class="invalid-feedback d-block"
              >
                {{ emailError || errors.email }}
              </div>
            </div>

            <!-- WEBSITE -->

            <div class="col-12">
              <label for="editWebsite" class="form-label">
                {{ tr("Sitio web", "Website") }}
              </label>

              <input
                id="editWebsite"
                v-model="website"
                class="form-control"
                :class="{ 'is-invalid': errors.website || (attemptedSubmit && websiteError) }"
                type="url"
                inputmode="url"
                autocomplete="url"
                placeholder="https://example.com"
                aria-describedby="websiteHelp websiteError"
                :aria-invalid="!!(errors.website || (attemptedSubmit && websiteError))"
              />

              <small id="websiteHelp" class="form-text">
                {{ tr(
                  "Pegá la dirección completa, comenzando con https://",
                  "Enter the full address, starting with https://"
                ) }}
              </small>

              <div
                v-if="errors.website || (attemptedSubmit && websiteError)"
                id="websiteError"
                class="invalid-feedback d-block"
              >
                {{ websiteError || errors.website }}
              </div>
            </div>

          </div>

          <button
            type="submit"
            class="btn btn-brand w-100 mt-4"
            :disabled="saving"
            :aria-busy="saving"
          >
            <span
              v-if="saving"
              class="spinner-border spinner-border-sm me-2"
              aria-hidden="true"
            ></span>

            <i
              v-else
              class="bi bi-check-circle me-2"
              aria-hidden="true"
            ></i>

            {{ saving
              ? tr("Guardando...", "Saving...")
              : tr("Guardar cambios", "Save changes") }}
          </button>

        </form>
      </div>
    </div>

    <!-- FLOATING NOTIFICATION -->

    <div
      v-if="notification.show"
      class="ts-toast shadow-lg"
      :class="notification.type === 'error'
        ? 'ts-toast-error'
        : 'ts-toast-success'"
      :role="notification.type === 'error' ? 'alert' : 'status'"
    >
      <i
        class="bi bi-exclamation-circle-fill"
        aria-hidden="true"
      ></i>

      <span class="flex-grow-1">
        {{ notification.message }}
      </span>

      <button
        type="button"
        class="btn-close"
        :aria-label="tr('Cerrar notificación', 'Close notification')"
        @click="closeNotification"
      ></button>
    </div>

  </main>
</template>

<style scoped>
.business-preview {
  width: 160px;
  height: 160px;
  object-fit: cover;
  border-radius: 16px;
  border: 1px solid var(--ts-border, #dee2e6);
}
</style>
