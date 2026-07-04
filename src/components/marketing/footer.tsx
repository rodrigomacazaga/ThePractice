import Link from "next/link";
import { footerNav, site } from "@/config/site";
import { LogoMark, Wordmark } from "@/components/brand/logo";

export function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="container-page py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark tone="paper" />
              <Wordmark tone="paper" withTagline />
            </div>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-paper/60">
              Espacios privados premium e infraestructura digital para
              profesionales de terapia, wellness y coaching.
            </p>
            <p className="mt-6 text-sm text-paper/60">{site.email}</p>
          </div>

          <FooterColumn title="Producto" links={footerNav.producto} />
          <FooterColumn title="Profesionales" links={footerNav.profesionales} />
          <div className="space-y-10">
            <FooterColumn title="Empresa" links={footerNav.empresa} />
            <FooterColumn title="Legal" links={footerNav.legal} />
          </div>
        </div>

        <div className="mt-16 border-t border-paper/10 pt-8">
          <p className="max-w-3xl text-xs leading-relaxed text-paper/40">
            The Practice provee espacios, tecnología y directorio. No presta
            servicios médicos, terapéuticos ni clínicos. Cada practitioner es
            responsable de sus servicios, credenciales, permisos y cumplimiento
            regulatorio.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="font-display text-xs font-semibold tracking-widest text-paper/50 uppercase">
              © {new Date().getFullYear()} The Practice · {site.domain}
            </p>
            <p className="font-display text-xs font-semibold tracking-widest text-paper/50 uppercase">
              Querétaro · México
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="font-display text-[11px] font-semibold tracking-[0.2em] text-paper/40 uppercase">
        {title}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-paper/70 transition-colors hover:text-paper"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
