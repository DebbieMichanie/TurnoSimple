
import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../lib/supabase";

import HomeView from "../views/HomeView.vue";
import DemoView from "../views/DemoView.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import DashboardView from "../views/DashboardView.vue";
import CreateBusinessView from "../views/CreateBusinessView.vue";
import MyBusinessesView from "../views/MyBusinessesView.vue";
import BusinessDetailView from "../views/BusinessDetailView.vue";
import EditBusinessView from "../views/EditBusinessView.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView
  },
  {
    path: "/demo",
    name: "demo",
    component: DemoView
  },
  {
    path: "/login",
    name: "login",
    component: LoginView
  },
  {
    path: "/register",
    name: "register",
    component: RegisterView
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  
{
  path: "/dashboard/create-business",
  name: "create-business",
  component: CreateBusinessView,
  meta: { requiresAuth: true }
},

{
  path: "/dashboard/businesses",
  name: "my-businesses",
  component: MyBusinessesView,
  meta: { requiresAuth: true }
},
{
  path: "/dashboard/business/:id",
  name: "business-detail",
  component: BusinessDetailView,
  meta: { requiresAuth: true }
},

{
  path: "/dashboard/business/:id/edit",
  name: "edit-business",
  component: EditBusinessView,
  meta: { requiresAuth: true }
}
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return {
        path: "/login",
        query: { redirect: to.fullPath }
      };
    }
  }
});

export default router;
