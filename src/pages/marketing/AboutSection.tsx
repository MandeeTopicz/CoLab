export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-24 py-14 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">About CoLab</h2>
        <div className="mt-7 sm:mt-8">
          <div className="relative border border-border/70 bg-[#F1F7EE]/90 p-6 shadow-[0_14px_28px_rgba(0,0,0,0.28)] sm:ml-6 sm:mr-24 sm:-rotate-1">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-2 h-4 w-20 -translate-x-1/2 rounded-md bg-white/35 shadow-xs backdrop-blur-[1px] sm:w-24"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 h-10 w-10 bg-white/35 shadow-xs [clip-path:polygon(0_0,100%_0,100%_100%)]"
            />
            <p className="text-base text-text-secondary">
              CoLab is a collaborative board for turning rough ideas to real plans—fast. It combines a flexible
              whiteboard with smart, structured templates so teams can brainstorm, organize, and move forward without
              friction.
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-14 sm:mt-16 sm:grid-cols-2 sm:gap-20">
          <div className="relative border border-border/70 bg-[#E0EDC5]/90 p-5 shadow-[0_14px_28px_rgba(0,0,0,0.28)] sm:-rotate-1 sm:-translate-y-1">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-md bg-white/35 shadow-xs backdrop-blur-[1px]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 h-10 w-10 bg-white/35 shadow-xs [clip-path:polygon(0_0,100%_0,100%_100%)]"
            />
            <div className="text-sm font-semibold text-text-primary">What it’s for</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">
              <li>Project kickoffs and planning</li>
              <li>Kanban workflows</li>
              <li>Retrospectives</li>
              <li>Brainstorms and workshops</li>
            </ul>
          </div>
          <div className="relative border border-border/70 bg-[#B0BEA9]/90 p-5 shadow-[0_14px_28px_rgba(0,0,0,0.28)] sm:rotate-1 sm:translate-y-2">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-md bg-white/35 shadow-xs backdrop-blur-[1px]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 h-10 w-10 bg-white/35 shadow-xs [clip-path:polygon(0_0,100%_0,100%_100%)]"
            />
            <div className="text-sm font-semibold text-text-primary">How it helps</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">
              <li>Clean, organized templates generated from your prompt</li>
              <li>Fast editing with a focused tool layout</li>
              <li>Shareable structure that keeps teams aligned</li>
              <li>Stays lightweight and responsive</li>
            </ul>
          </div>
        </div>

        <div className="mt-20 sm:mt-24">
          <div className="text-2xl font-semibold tracking-tight text-text-primary">Who It’s For</div>
          <div className="mt-10 grid grid-cols-1 gap-14 sm:grid-cols-3 sm:gap-20">
            <div className="relative border border-border/70 bg-[#E0EDC5]/90 p-5 text-center shadow-[0_14px_28px_rgba(0,0,0,0.28)] sm:-rotate-1 sm:-translate-y-1">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-2 h-4 w-14 -translate-x-1/2 rounded-md bg-white/35 shadow-xs backdrop-blur-[1px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-0 h-10 w-10 bg-white/35 shadow-xs [clip-path:polygon(0_0,100%_0,100%_100%)]"
              />
              <div className="text-sm font-semibold text-text-primary">Teams &amp; Collaborators</div>
              <p className="mt-3 text-sm text-text-secondary">
                CoLab is built for teams who need to think, plan, and build together—without friction. Share boards
                instantly, collaborate in real time, and keep ideas, decisions, and action items in one organized
                workspace. Whether you’re brainstorming or executing, everyone stays aligned.
              </p>
            </div>

            <div className="relative border border-border/70 bg-[#92AA83]/80 p-5 text-center shadow-[0_14px_28px_rgba(0,0,0,0.28)] sm:rotate-1 sm:translate-y-3">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-2 h-4 w-14 -translate-x-1/2 rounded-md bg-white/35 shadow-xs backdrop-blur-[1px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-0 h-10 w-10 bg-white/35 shadow-xs [clip-path:polygon(0_0,100%_0,100%_100%)]"
              />
              <div className="text-sm font-semibold text-text-primary">Students</div>
              <p className="mt-3 text-sm text-text-secondary">
                Designed for group projects, study sessions, and presentations, CoLab helps students work together
                visually and efficiently. Guided templates make it easy to turn rough ideas into structured plans, while
                real-time collaboration keeps everyone contributing and accountable.
              </p>
            </div>

            <div className="relative border border-border/70 bg-[#B0BEA9]/90 p-5 text-center shadow-[0_14px_28px_rgba(0,0,0,0.28)] sm:-rotate-[0.5deg] sm:translate-y-1">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-2 h-4 w-14 -translate-x-1/2 rounded-md bg-white/35 shadow-xs backdrop-blur-[1px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-0 h-10 w-10 bg-white/35 shadow-xs [clip-path:polygon(0_0,100%_0,100%_100%)]"
              />
              <div className="text-sm font-semibold text-text-primary">Educators</div>
              <p className="mt-3 text-sm text-text-secondary">
                CoLab supports collaborative learning through shared boards for lessons, workshops, and group
                activities. Educators can guide students with structured layouts while still allowing creativity,
                participation, and discussion—whether in person or remote.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-20 sm:mt-24">
          <div className="relative mx-auto border border-border/70 bg-[#F1F7EE]/90 p-6 shadow-[0_14px_28px_rgba(0,0,0,0.28)] sm:max-w-xl sm:rotate-1">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-md bg-white/35 shadow-xs backdrop-blur-[1px]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 h-10 w-10 bg-white/35 shadow-xs [clip-path:polygon(0_0,100%_0,100%_100%)]"
            />
            <div className="text-sm font-semibold text-text-primary">The vision</div>
            <p className="mt-3 text-sm text-text-secondary">
              A whiteboard should feel like a workspace, not a blank void. CoLab’s goal is to guide people into the
              right structure at the right time—without getting in the way.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

