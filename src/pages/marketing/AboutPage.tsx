export function AboutPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-full w-screen -translate-x-1/2 bg-board-grid opacity-35"
      />
      <div className="relative mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">About CoLab</h1>
        <p className="mt-4 text-base text-text-secondary">
          CoLab is a collaborative board for turning rough ideas into real plans—fast. It combines a flexible whiteboard
          with smart, structured templates so teams can brainstorm, organize, and move forward without friction.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="text-sm font-semibold text-text-primary">What it’s for</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">
              <li>Project kickoffs and planning</li>
              <li>Kanban workflows</li>
              <li>Retrospectives</li>
              <li>Brainstorms and workshops</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="text-sm font-semibold text-text-primary">How it helps</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">
              <li>Clean, organized templates generated from your prompt</li>
              <li>Fast editing with a focused tool layout</li>
              <li>Shareable structure that keeps teams aligned</li>
              <li>Stays lightweight and responsive</li>
            </ul>
          </div>
        </div>

        <div className="mt-10">
          <div className="text-2xl font-semibold tracking-tight text-text-primary">Who It’s For</div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface p-5 text-center shadow-sm">
              <div className="text-sm font-semibold text-text-primary">Teams &amp; Collaborators</div>
              <p className="mt-3 text-sm text-text-secondary">
                CoLab is built for teams who need to think, plan, and build together—without friction. Share boards
                instantly, collaborate in real time, and keep ideas, decisions, and action items in one organized
                workspace. Whether you’re brainstorming or executing, everyone stays aligned.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 text-center shadow-sm">
              <div className="text-sm font-semibold text-text-primary">Students</div>
              <p className="mt-3 text-sm text-text-secondary">
                Designed for group projects, study sessions, and presentations, CoLab helps students work together
                visually and efficiently. Guided templates make it easy to turn rough ideas into structured plans, while
                real-time collaboration keeps everyone contributing and accountable.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 text-center shadow-sm">
              <div className="text-sm font-semibold text-text-primary">Educators</div>
              <p className="mt-3 text-sm text-text-secondary">
                CoLab supports collaborative learning through shared boards for lessons, workshops, and group
                activities. Educators can guide students with structured layouts while still allowing creativity,
                participation, and discussion—whether in person or remote.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="text-sm font-semibold text-text-primary">The vision</div>
          <p className="mt-3 text-sm text-text-secondary">
            A whiteboard should feel like a workspace, not a blank void. CoLab’s goal is to guide people into the right
            structure at the right time—without getting in the way.
          </p>
        </div>
      </div>
    </div>
  )
}

