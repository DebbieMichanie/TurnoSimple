
import { createI18n } from "vue-i18n";

const messages = {
  es: {
    nav: {
      home: "Inicio",
      demo: "Ver demo",
      login: "Iniciar sesión",
      register: "Registrarse"
    },
    home: {
      badge: "Sistema de reservas para negocios",
      title: "Tus turnos,",
      highlight: "más simples.",
      description:
        "Organizá empleados, servicios y horarios desde un solo lugar. Permití que tus clientes reserven online, sin llamadas ni mensajes.",
      start: "Crear mi negocio",
      demo: "Probar demo",
      featuresTitle: "Todo lo que tu negocio necesita",
      employees: "Gestioná tu equipo",
      employeesDesc:
        "Agregá empleados y configurá horarios individuales.",
      bookings: "Reservas online",
      bookingsDesc:
        "Tus clientes reservan turnos sin registrarse.",
      integration: "Integración sencilla",
      integrationDesc:
        "Compartí tu enlace de reservas o incorporalo a tu web."
    },
    common: {
      comingSoon: "Próximamente",
      backHome: "Volver al inicio"
    }
  },

  en: {
    nav: {
      home: "Home",
      demo: "Try Demo",
      login: "Log in",
      register: "Sign up"
    },
    home: {
      badge: "Appointment scheduling for businesses",
      title: "Your bookings,",
      highlight: "made simple.",
      description:
        "Manage employees, services and schedules in one place. Let your customers book appointments online without calls or messages.",
      start: "Create my business",
      demo: "Try Demo",
      featuresTitle: "Everything your business needs",
      employees: "Manage your team",
      employeesDesc:
        "Add employees and configure individual schedules.",
      bookings: "Online bookings",
      bookingsDesc:
        "Customers can book appointments without registering.",
      integration: "Easy integration",
      integrationDesc:
        "Share your booking link or embed it on your website."
    },
    common: {
      comingSoon: "Coming soon",
      backHome: "Back to home"
    }
  }
};

const i18n = createI18n({
  legacy: false,
  locale: "es",
  fallbackLocale: "en",
  messages
});

export default i18n;
