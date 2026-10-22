
<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <main>
    <section class="hero py-5">
      <div class="container py-lg-5">
        <div class="row align-items-center g-5">

          <div class="col-lg-6">
            <span class="badge rounded-pill hero-badge mb-4">
              <i class="bi bi-stars me-1"></i>
              {{ t("home.badge") }}
            </span>

            <h1 class="display-4 fw-bold mb-4">
              {{ t("home.title") }}
              <span class="accent">
                {{ t("home.highlight") }}
              </span>
            </h1>

            <p class="lead text-secondary mb-4">
              {{ t("home.description") }}
            </p>

            <div class="d-flex gap-3 flex-wrap">
              <RouterLink
                to="/register"
                class="btn btn-brand btn-lg"
              >
                {{ t("home.start") }}
                <i class="bi bi-arrow-right ms-2"></i>
              </RouterLink>

              <RouterLink
                to="/demo"
                class="btn btn-outline-brand btn-lg"
              >
                <i class="bi bi-play-circle me-2"></i>
                {{ t("home.demo") }}
              </RouterLink>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="preview-card shadow-lg">
              <div class="d-flex justify-content-between mb-4">
                <h5 class="fw-bold mb-0">
                  <i class="bi bi-calendar-check accent me-2"></i>
                  TurnoSimple
                </h5>
                <span class="badge text-bg-success">
                  Demo
                </span>
              </div>

              <div class="row g-3 mb-4">
                <div class="col-6">
                  <div class="stat-card">
                    <i class="bi bi-calendar2-check accent"></i>
                    <h3 class="fw-bold mt-2">24</h3>
                    <small class="text-secondary">
                      Bookings
                    </small>
                  </div>
                </div>

                <div class="col-6">
                  <div class="stat-card">
                    <i class="bi bi-people accent"></i>
                    <h3 class="fw-bold mt-2">5</h3>
                    <small class="text-secondary">
                      Employees
                    </small>
                  </div>
                </div>
              </div>

              <div class="appointment-item">
                <div>
                  <strong>Sofia Martinez</strong>
                  <div class="text-secondary small">
                    Manicure
                  </div>
                </div>
                <span class="time-pill">10:00</span>
              </div>

              <div class="appointment-item">
                <div>
                  <strong>Valentina Lopez</strong>
                  <div class="text-secondary small">
                    Hair styling
                  </div>
                </div>
                <span class="time-pill">11:30</span>
              </div>

              <div class="appointment-item">
                <div>
                  <strong>Camila Rodriguez</strong>
                  <div class="text-secondary small">
                    Facial treatment
                  </div>
                </div>
                <span class="time-pill">14:00</span>
              </div>

              <p class="small text-secondary mt-3 mb-0">
                * Preview with sample data
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>

    <section class="features py-5">
      <div class="container py-4">
        <h2 class="fw-bold text-center mb-5">
          {{ t("home.featuresTitle") }}
        </h2>

        <div class="row g-4">
          <div
            v-for="feature in [
              {
                icon: 'bi-people',
                title: 'home.employees',
                desc: 'home.employeesDesc'
              },
              {
                icon: 'bi-calendar-check',
                title: 'home.bookings',
                desc: 'home.bookingsDesc'
              },
              {
                icon: 'bi-code-slash',
                title: 'home.integration',
                desc: 'home.integrationDesc'
              }
            ]"
            :key="feature.title"
            class="col-md-4"
          >
            <div class="feature-card h-100">
              <div class="feature-icon">
                <i :class="['bi', feature.icon]"></i>
              </div>
              <h5 class="fw-bold mt-3">
                {{ t(feature.title) }}
              </h5>
              <p class="text-secondary mb-0">
                {{ t(feature.desc) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.hero {
  background: linear-gradient(
    135deg,
    #f0fffc 0%,
    #ffffff 60%,
    #f4f0ff 100%
  );
}

.accent {
  color: #50bdbd;
}

.hero-badge {
  background: #e2f8f5;
  color: #248b89;
  padding: 10px 16px;
}


.preview-card {
  background: white;
  border-radius: 22px;
  padding: 30px;
}

.stat-card {
  background: #f4faf9;
  border-radius: 14px;
  padding: 18px;
}

.appointment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 0;
  border-bottom: 1px solid #edf0f0;
}

.time-pill {
  background: #e2f8f5;
  color: #248b89;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
}

.features {
  background: white;
}

.feature-card {
  padding: 30px;
  border-radius: 18px;
  border: 1px solid #e9eeee;
  transition: 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.06);
}

.feature-icon {
  background: #e2f8f5;
  color: #399f9f;
  width: 55px;
  height: 55px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
</style>
