
<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <main class="container text-center py-5">
    <i class="bi bi-tools fs-1 text-secondary"></i>

    <h1 class="fw-bold mt-3">
      {{ t("common.comingSoon") }}
    </h1>

    <RouterLink to="/" class="btn btn-outline-primary mt-3">
      {{ t("common.backHome") }}
    </RouterLink>
  </main>
</template>
