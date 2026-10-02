import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    { path: "/", method: "POST" },
    { path: "/login", method: "POST" },
    { path: "/signup", method: "POST" },
    { path: "/contact", method: "POST" },
    { path: "/feed", method: "POST" },
    { path: "/account", method: "POST" },
    { path: "/account/*", method: "POST" },
    { path: "/account/password", method: "POST" },
    { path: "/markets/*", method: "POST" },
    { path: "/vendors/*", method: "POST" },
  ],
});
