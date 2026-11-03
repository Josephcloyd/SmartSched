import { brand } from "@/lib/brand";
import { seoFaqs, seoFeatures, supportedSchoolNames } from "@/lib/seo";

/**
 * Server-rendered "about" + FAQ below the app. It gives search engines (and anyone who
 * scrolls down) real text about SmartSched, since the app itself renders on the client.
 * Copy lives in src/lib/seo.ts so it always matches the JSON-LD.
 */
export function AboutSection() {
  return (
    <footer className="border-t border-border bg-surface/40 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-12">
      <div className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6">
        <section aria-labelledby="about-heading">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">About {brand.appName}</p>
          <h2 id="about-heading" className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Free class schedule maker and wallpaper for students
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {brand.appName} by {brand.company} helps college and senior high students plan their week,
            turn their class schedule into a phone wallpaper in their school&apos;s colors, and get
            reminders before every class. It&apos;s free, needs no account, and your schedule stays on
            your device.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {seoFeatures.map((feature) => (
              <li key={feature.title} className="rounded-2xl border border-border bg-surface p-4">
                <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{feature.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-heading" className="mt-10">
          <h2 id="faq-heading" className="text-lg font-bold tracking-tight text-foreground">
            Frequently asked questions
          </h2>
          <div className="mt-3 grid gap-2">
            {seoFaqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-border bg-surface px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-foreground marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {faq.question}
                    <span aria-hidden="true" className="text-muted transition group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="schools-heading" className="mt-10">
          <h2 id="schools-heading" className="text-sm font-semibold text-foreground">
            School colors included
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">{supportedSchoolNames.join(" · ")}</p>
        </section>

        <p className="mt-10 text-xs text-muted">
          © {new Date().getFullYear()} {brand.company}. Made for students in the Philippines.
        </p>
      </div>
    </footer>
  );
}
