import { requirePractitioner } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { ActionForm } from "@/components/dashboard/action-form";
import { updateAccount } from "../actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { session, profile } = await requirePractitioner();

  return (
    <>
      <PageHeader title="Ajustes" description="Datos de tu cuenta." />

      <div className="grid gap-8 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cuenta</CardTitle>
            <CardDescription>Tu información básica.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={updateAccount} className="space-y-4">
              <Field label="Nombre" htmlFor="set-name">
                <Input id="set-name" name="name" defaultValue={session.user.name ?? ""} required />
              </Field>
              <Field label="Email" htmlFor="set-email" hint="El email no puede cambiarse en el MVP.">
                <Input id="set-email" value={session.user.email ?? ""} disabled />
              </Field>
              <Field label="Teléfono" htmlFor="set-phone">
                <Input id="set-phone" name="phone" type="tel" defaultValue={""} placeholder="442 000 0000" />
              </Field>
            </ActionForm>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Tu URL pública</CardTitle>
            <CardDescription>El slug de tu micrositio.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-xl bg-paper px-4 py-3 font-mono text-sm">
              thepractice.mx/p/<strong>{profile.slug}</strong>
            </p>
            <p className="mt-3 text-xs leading-relaxed text-stone">
              Para cambiar tu slug, escríbenos a soporte — así evitamos romper
              enlaces que ya compartiste.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
