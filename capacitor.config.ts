import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "pet.vili.snappit",
  appName: "Filmit",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
};

export default config;
