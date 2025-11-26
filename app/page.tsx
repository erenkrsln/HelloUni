import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/feed");
  }

  return <LoginForm />;
}

