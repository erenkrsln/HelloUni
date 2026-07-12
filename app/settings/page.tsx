"use client";

import { useState } from "react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Header } from "@/components/header";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Trash2, Shield, Palette, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme-selector";
import { SpeechAssistanceToggle } from "@/components/speech-assistance-toggle";

export default function SettingsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { currentUser, session } = useCurrentUser();
  const router = useRouter();

  const userEmail = session?.user?.email || currentUser?.email || "";

  if (!currentUser) {
    return null;
  }

  return (
    <main className="min-h-screen w-full max-w-[428px] md:max-w-3xl mx-auto pb-24 header-spacing overflow-x-hidden bg-background">
      <Header onMenuClick={() => setIsSidebarOpen(true)} title="Einstellungen" />
      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Inhalt */}
      <div className="px-4 sm:px-6 py-6 space-y-8">
        {/* Erscheinungsbild */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Erscheinungsbild
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Wähle, wie HelloUni für dich aussehen soll.
          </p>
          <ThemeSelector />
        </section>

        {/* Barrierefreiheit */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Barrierefreiheit
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Passe die Bedienungshilfen an deine Bedürfnisse an.
          </p>
          <SpeechAssistanceToggle />
        </section>

        {/* Account-Bereich */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Account
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Verwalte deinen Account und deine persönlichen Daten.
          </p>

          {/* Gefahrenbereich */}
          <div className="border border-red-200 dark:border-red-900/50 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 dark:bg-red-950/30 px-4 py-3 sm:px-5 sm:py-3 border-b border-red-200 dark:border-red-900/50">
              <h3 className="text-sm sm:text-base font-semibold text-red-700 dark:text-red-400">
                Gefahrenbereich
              </h3>
            </div>

            {/* Inhalt */}
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <h4 className="text-sm sm:text-base font-medium text-foreground mb-1">
                  Account löschen
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Lösche deinen Account und alle zugehörigen Daten dauerhaft. 
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle deine 
                  Posts, Kommentare, Chats, Dateien und persönlichen Daten werden 
                  unwiderruflich entfernt.
                </p>
              </div>

              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Account löschen
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Bestätigungsdialog */}
      <DeleteAccountDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        userEmail={userEmail}
      />

      <BottomNavigation />
    </main>
  );
}
