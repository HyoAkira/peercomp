import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("pages/homepage/index.tsx"),
  layout("./pages/navbarPages/layout.tsx", [
    route("services", "./pages/navbarPages/services.tsx"),
    route("whyus", "./pages/navbarPages/whyus.tsx"),
    route("faq", "./pages/navbarPages/faq.tsx"),
  ]),
  route("login", "./pages/login/login.tsx"),
  route("register", "./pages/login/signup.tsx"),
  layout("./pages/panel/layout.tsx", [
    route("panel", "./pages/panel/index.tsx"),
    route("panel/profile", "./pages/panel/profile.tsx"),
    route("panel/functions", "./pages/panel/functions.tsx"),
    route("panel/kv", "./pages/panel/kv.tsx"),
    route("panel/settings", "./pages/panel/settings.tsx"),
  ]),
  route("sandbox", "./pages/sandbox/test.tsx"),
] satisfies RouteConfig;
