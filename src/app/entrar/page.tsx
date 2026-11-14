import Link from "next/link";
import { Logo } from "@/components/ui";
import { FormularioEntrar } from "./formulario";

export const metadata = { title: "Entrar" };

export default async function Entrar(props: PageProps<"/entrar">) {
  const { modo } = await props.searchParams;
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 no-underline">
        <Logo />
        <b className="font-display text-xl font-extrabold text-ink">Field Shift</b>
      </Link>
      <FormularioEntrar modoInicial={modo === "criar" ? "criar" : "entrar"} />
    </main>
  );
}
