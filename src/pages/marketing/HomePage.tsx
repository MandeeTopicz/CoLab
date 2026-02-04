export function HomePage() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-6xl leading-tight">
          From rough ideas to real plans.
        </h1>
        <div className="mt-8 flex items-center justify-center">
          <a
            href="/signup"
            className="rounded-lg bg-primary px-5 py-3 text-base font-semibold text-text-inverse shadow-sm hover:bg-primary-hover active:bg-primary-active transition-colors duration-fast"
          >
            Get Started
          </a>
        </div>
        <p className="mt-6 text-sm text-text-muted">
          Canvas-first planning with a clean, collaborative experience.
        </p>
      </div>
    </section>
  )
}

