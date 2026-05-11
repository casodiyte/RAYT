import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { PWARegistration } from "@/components/PWARegistration";
import { PermissionBanner } from "@/components/ui/PermissionBanner";

import { ModalProvider } from "@/context/ModalContext";

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "RAYT",
  description: "Tu viaje, tu precio. Negocia y viaja seguro.",
  manifest: "/manifest.json",
  icons: {
    icon: "/car-logo.png",
    apple: "/car-logo.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={poppins.className}>
        <AuthProvider>
          <NotificationProvider>
            <ModalProvider>
              <PWARegistration />
              <PermissionBanner />
              {children}
            </ModalProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
