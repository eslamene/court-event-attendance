import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "مسح حضور الفعاليات",
  slug: "court-event-attendance",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "court-event-attendance",
  owner: "eslamene",
  extra: {
    eas: {
      projectId: "e4876420-b761-48a7-bf33-e98624497538",
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.courtcassation.eventattendance",
    infoPlist: {
      NSCameraUsageDescription:
        "الكاميرا مطلوبة لمسح رموز QR وتسجيل الحضور",
    },
  },
  android: {
    package: "com.courtcassation.eventattendance",
    adaptiveIcon: {
      backgroundColor: "#5c3d1e",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    permissions: ["CAMERA", "VIBRATE"],
  },
  plugins: [
    "expo-secure-store",
    [
      "expo-camera",
      {
        cameraPermission:
          "الكاميرا مطلوبة لمسح رموز QR وتسجيل الحضور",
      },
    ],
  ],
};

export default config;
