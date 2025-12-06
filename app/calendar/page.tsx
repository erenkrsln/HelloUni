import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";

export default function CalendarPage() {
    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
            <Header />
            <div className="flex items-center justify-center py-16">
                <h1 className="text-2xl" style={{ color: "var(--color-text-beige-light)" }}>
                    Calendar Page
                </h1>
            </div>
            <BottomNavigation />
        </main>
    );
}
