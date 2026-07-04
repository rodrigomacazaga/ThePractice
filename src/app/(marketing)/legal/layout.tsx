export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="container-page py-16 lg:py-20">
      <div className="mx-auto max-w-3xl [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:text-sm [&_ol]:leading-relaxed [&_ol]:text-ink-mute [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-ink-mute [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:leading-relaxed [&_ul]:text-ink-mute">
        {children}
      </div>
    </section>
  );
}
