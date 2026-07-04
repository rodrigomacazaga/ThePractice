import { requireClient } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

export const dynamic = "force-dynamic";

export default async function ClientSettingsPage() {
  const { session } = await requireClient();

  return (
    <>
      <PageHeader title="Perfil" description="Datos de tu cuenta." />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Cuenta</CardTitle>
          <CardDescription>
            Para cambios de datos escríbenos a hola@thepractice.mx (edición
            directa llega en la siguiente iteración).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Nombre" htmlFor="c-name">
            <Input id="c-name" value={session.user.name ?? ""} disabled />
          </Field>
          <Field label="Email" htmlFor="c-email">
            <Input id="c-email" value={session.user.email ?? ""} disabled />
          </Field>
        </CardContent>
      </Card>
    </>
  );
}
