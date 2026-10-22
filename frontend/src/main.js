
import { createApp } from "vue";
import App from "./App.vue";

import router from "./router";
import i18n from "./i18n";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";

import "./styles/global.css";

const savedLanguage = localStorage.getItem(
  "turnosimple-lang"
);

if (
  savedLanguage === "es" ||
  savedLanguage === "en"
) {
  i18n.global.locale.value = savedLanguage;
}

const app = createApp(App);

app.use(router);
app.use(i18n);

app.mount("#app");
