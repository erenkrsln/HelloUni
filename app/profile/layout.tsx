import { Viewport } from "next";

export const viewport: Viewport = {
    themeColor: "#0a0a0a",
    viewportFit: "cover",
};

export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
