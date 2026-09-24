import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    { path: "/login", method: "POST" },
    { path: "/signup", method: "POST" },
    { path: "/account/password", method: "POST" },
    { path: "/markets/*", method: "POST" },
    { path: "/vendors/*", method: "POST" },
  ],
});
