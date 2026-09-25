// The signed-out home: "Who should you call today?"
import type { ReactNode } from "react";
import Link from "next/link";
import Backdrop from "@/components/ui/Backdrop";
import BrandMark from "@/components/ui/BrandMark";
import CategoryChip from "@/components/ui/CategoryChip";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";
import { Glow } from "@/components/today/ListMode";

const NEXT_CALL = [
  "Settling into the new apartment in Florentine",
  "Did she get the UX job?",
  "Has she hosted the dinner yet?",
];

function Bullets({ items, small = false }: { items: string[]; small?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className={`flex items-baseline gap-2.5 font-semibold leading-snug ${small ? "text-sm" : "text-[15px]"}`}>
          <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 -translate-y-0.5 rounded-full bg-brand" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Progress({ done, total = 3, label }: { done: number; total?: number; label: string }) {
  return (
    <div className="inline-flex h-12 items-center gap-3 whitespace-nowrap rounded-full bg-white px-[18px] text-sm font-bold shadow-float">
      <span className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-2 w-5 rounded-full ${i < done ? "bg-brand" : "bg-[#dcddf0]"}`} />
        ))}
      </span>
      {label}
    </div>
  );
}

/** The hero's picture of Today: Noa in focus, the next two peeking behind. */
function TodayGlimpse() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-14 h-[520px] w-full max-w-[440px] scale-[0.82] sm:scale-100 lg:mt-20">
      <div className="absolute inset-x-9 top-0 flex h-[260px] items-baseline justify-between rounded-[30px] bg-white px-6 py-5 shadow-card">
        <span className="text-[30px] font-extrabold tracking-[-0.045em]">Maya</span>
        <span className="text-sm text-muted">Work, last talked 2 April</span>
      </div>
      <div className="absolute inset-x-[18px] top-[70px] flex h-[260px] items-baseline justify-between rounded-[30px] bg-ice px-6 py-5 shadow-card">
        <span className="text-[30px] font-extrabold tracking-[-0.045em]">Daniel</span>
        <span className="text-sm text-muted">Friend, last talked 31 March</span>
      </div>
      <div className="absolute inset-x-0 top-[140px] h-[300px] overflow-hidden rounded-[32px] bg-brand text-white shadow-[0_40px_70px_-34px_rgba(53,71,209,0.85)]">
        <Glow className="-right-16 -top-32 h-72 w-72" />
        <div className="relative flex h-full flex-col gap-3.5 px-[26px] py-6">
          <span className="flex h-8 items-center gap-1.5 self-start rounded-full bg-white/15 px-3 text-[13px] font-bold">
            <Icon name="family" size={15} />
            Family, every 3 days
          </span>
          <span className="flex-1" />
          <span className="text-[76px] font-extrabold leading-[0.9] tracking-[-0.06em]">Noa</span>
          <span className="text-[15px] text-brand-soft">Last talked on 27 March</span>
          <div className="flex gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
              <Icon name="phone" size={18} />
            </span>
            <span className="flex h-12 flex-1 items-center justify-center rounded-full bg-white text-[15px] font-bold text-ink">
              We talked
            </span>
          </div>
        </div>
      </div>
      <div className="absolute -left-4 top-[440px] flex w-[290px] flex-col gap-2.5 rounded-3xl bg-white px-5 py-[18px] shadow-[0_30px_60px_-28px_rgba(30,40,120,0.45)] sm:-left-10">
        <span className="text-[13px] font-bold text-muted">For your next call</span>
        <Bullets items={NEXT_CALL} small />
      </div>
      <div className="absolute -right-2.5 -top-14">
        <Progress done={1} label="1 of 3 done today" />
      </div>
    </div>
  );
}

function Step({ n, title, text, children }: { n: number; title: string; text: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-5">
      <div aria-hidden="true" className="glass flex h-[260px] items-center justify-center rounded-[30px] p-6">
        {children}
      </div>
      <div className="flex gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-extrabold text-white">
          {n}
        </span>
        <span className="flex flex-col gap-1.5">
          <h3 className="text-[22px] font-extrabold tracking-[-0.025em]">{title}</h3>
          <p className="text-base leading-normal text-muted">{text}</p>
        </span>
      </div>
    </li>
  );
}

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Backdrop />

      <header className="glass mx-4 mt-4 flex h-[68px] items-center justify-between rounded-full pl-5 pr-3 md:mx-10 md:mt-6">
        <Link href="/" className="flex items-center gap-3 text-lg font-extrabold tracking-tight">
          <BrandMark size={34} />
          KIT Friend
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <a href="#how" className="hidden h-11 items-center rounded-full px-4 text-[15px] font-bold hover:bg-white/80 md:flex">
            How it works
          </a>
          <Link href="/login" className="hidden h-11 items-center rounded-full px-4 text-[15px] font-bold hover:bg-white/80 sm:flex">
            Sign in
          </Link>
          <Link href="/register" className={buttonClass("brand", "sm")}>
            Create an account
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="grid items-center gap-10 px-5 pb-16 pt-14 md:px-12 lg:grid-cols-[1fr_520px] lg:px-24 lg:pb-[72px] lg:pt-24 xl:grid-cols-[1fr_560px]">
          <div className="flex flex-col gap-7">
            <h1 className="display text-[56px] leading-[0.94] tracking-[-0.06em] md:text-[84px] xl:text-[104px]">
              Who should you call today?
            </h1>
            <p className="max-w-[540px] text-lg leading-relaxed text-muted md:text-[21px]">
              KIT Friend picks a few people for you each day, reminds you what you talked about last time, and suggests what to
              ask next.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/register" className={buttonClass("brand", "lg", "h-[60px] px-[30px] text-[17px] shadow-[0_20px_40px_-20px_rgba(53,71,209,0.9)]")}>
                Create an account
              </Link>
              <Link href="/login" className={buttonClass("white", "lg", "h-[60px] px-[26px] text-[17px]")}>
                Sign in
              </Link>
            </div>
            <span className="flex items-center gap-2.5 text-[15px] text-muted">
              <Icon name="check" size={18} className="text-brand" />
              Sign in with Google in one click
            </span>
          </div>
          <TodayGlimpse />
        </section>

        {/* How it works */}
        <section id="how" className="flex scroll-mt-8 flex-col gap-11 px-5 pb-20 pt-12 md:px-12 lg:px-24 lg:pb-28">
          <h2 className="display text-[44px] md:text-[56px]">How it works</h2>
          <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
            <Step n={1} title="Add the people you care about" text="Family, friends, work. Pick how often you want to check in with each one.">
              <div className="flex w-full max-w-[300px] flex-col gap-3.5 rounded-3xl bg-white p-5 shadow-card">
                <div className="text-[22px] font-extrabold tracking-[-0.03em]">Daniel</div>
                <div className="flex flex-wrap gap-1.5">
                  <CategoryChip category="FAMILY" />
                  <CategoryChip category="FRIEND" />
                  <CategoryChip category="WORK" />
                </div>
                <div className="flex items-center justify-between text-sm font-bold">
                  Check in every
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ground">−</span>
                    <span className="w-6 text-center font-extrabold">20</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ground">+</span>
                    days
                  </span>
                </div>
              </div>
            </Step>
            <Step n={2} title="Each morning, see who’s due" text="Today suggests a few people to start with. A short email can remind you too.">
              <div className="flex w-full max-w-[300px] flex-col items-start gap-3">
                <Progress done={1} label="1 of 3 done today" />
                <div className="flex w-full flex-col gap-1 rounded-3xl bg-brand p-5 text-white shadow-brand">
                  <span className="text-[34px] font-extrabold leading-none tracking-[-0.05em]">Noa</span>
                  <span className="text-sm text-brand-soft">Family, last talked 27 March</span>
                </div>
                <div className="flex h-11 items-center gap-2 rounded-full bg-white pl-2 pr-4 text-sm font-bold shadow-float">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ground text-brand">
                    <Icon name="clock" size={15} />
                  </span>
                  Daily email at 08:00
                </div>
              </div>
            </Step>
            <Step n={3} title="After you talk, jot a note" text="Type or dictate a line. KIT Friend remembers it and suggests what to ask next time.">
              <div className="flex w-full max-w-[300px] flex-col gap-3">
                <div className="relative rounded-[20px] border-[1.5px] border-brand bg-white px-4 pb-12 pt-3.5 text-sm leading-normal">
                  She got the keys to the apartment in Florentine. Interviewing at two design studios.
                  <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white">
                    <Icon name="mic" size={16} />
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["New apartment", "Job search", "Cooking"].map((t) => (
                    <span key={t} className="flex h-[30px] items-center rounded-full bg-white px-3 text-[13px] font-bold">
                      {t}
                    </span>
                  ))}
                </div>
                <span className="flex h-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">Save note</span>
              </div>
            </Step>
          </ol>
        </section>

        {/* It remembers */}
        <section className="relative mx-4 grid items-center gap-10 overflow-hidden rounded-[36px] bg-brand px-6 py-14 text-white md:mx-10 md:rounded-[44px] md:px-20 md:py-[72px] lg:grid-cols-[1fr_1fr] lg:gap-[60px]">
          <Glow className="-left-32 -top-40 h-[480px] w-[480px]" />
          <div className="relative flex flex-col gap-5">
            <h2 className="display text-[44px] leading-[1.02] md:text-[60px]">It remembers, so you don’t have to.</h2>
            <p className="max-w-[520px] text-lg leading-relaxed text-brand-soft">
              Every note you save builds a short picture of each person: what’s going on in their life, and a few things to ask
              next time. You walk into every call already caught up.
            </p>
          </div>
          <div aria-hidden="true" className="relative flex flex-col gap-4 md:flex-row md:items-start">
            <section className="flex flex-1 flex-col gap-4 rounded-[28px] bg-white p-[22px] text-ink shadow-card">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl font-extrabold tracking-[-0.02em]">What you know</span>
                <span className="text-xs text-muted">Updated from your notes</span>
              </div>
              <p className="text-sm leading-relaxed">
                Noa moved into a new apartment in Florentine in March and was interviewing for UX roles. She has been cooking a
                lot and wants to host a dinner.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["New apartment", "Job search", "Cooking"].map((t) => (
                  <span key={t} className="flex h-[30px] items-center rounded-full bg-ground px-3 text-[13px] font-bold">
                    {t}
                  </span>
                ))}
              </div>
              <span className="text-[15px] font-extrabold">For your next call</span>
              <Bullets items={NEXT_CALL} small />
            </section>
            <section className="flex flex-col gap-3.5 rounded-[28px] border border-white/20 bg-white/10 p-[22px] md:w-[240px]">
              <span className="text-lg font-extrabold">Your notes</span>
              {[
                ["27 March", "She got the keys to the apartment in Florentine. Interviewing at two design studios."],
                ["14 March", "Helped her pick paint colours. A bit stressed about the move."],
                ["2 March", "Talked, no note"],
              ].map(([date, note]) => (
                <div key={date} className="flex flex-col gap-1 border-l-2 border-white/25 pl-3.5">
                  <span className="text-xs font-bold text-brand-soft">{date}</span>
                  <span className="text-sm leading-normal">{note}</span>
                </div>
              ))}
            </section>
          </div>
        </section>

        {/* Months behind */}
        <section className="grid items-center gap-12 px-5 py-20 md:px-12 lg:grid-cols-2 lg:gap-[60px] lg:px-24 lg:py-32">
          <div className="flex flex-col gap-5">
            <h2 className="display text-[44px] leading-[1.02] md:text-[56px]">Months behind? Start with three.</h2>
            <p className="max-w-[520px] text-lg leading-relaxed text-muted">
              No red badges and no guilt. KIT Friend just shows how long it’s been and picks a few people for today. Tomorrow it
              picks a few more.
            </p>
          </div>
          <div aria-hidden="true" className="flex flex-col items-start gap-4">
            <Progress done={3} label="3 of 3 done" />
            <div className="relative flex min-h-[260px] w-full max-w-[480px] flex-col gap-3.5 overflow-hidden rounded-[30px] bg-brand p-7 text-white shadow-brand">
              <Glow className="-right-20 -top-36 h-72 w-72" />
              <span className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-brand">
                <Icon name="check" size={26} strokeWidth={3} />
              </span>
              <span className="flex-1" />
              <span className="relative text-[44px] font-extrabold leading-none tracking-[-0.05em]">That’s your 3 for today.</span>
              <span className="relative text-base text-brand-soft">You caught up with Noa, Daniel and Maya.</span>
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section className="mx-4 flex flex-col items-center gap-7 rounded-[36px] bg-white px-6 py-16 text-center shadow-[0_30px_70px_-44px_rgba(30,40,120,0.45)] md:mx-10 md:rounded-[44px] md:px-20 md:py-[88px]">
          <h2 className="display max-w-[900px] text-[44px] tracking-[-0.055em] md:text-[72px]">Someone would love to hear from you.</h2>
          <p className="text-lg text-muted">Add your first few people in a couple of minutes.</p>
          <Link href="/register" className={buttonClass("brand", "lg", "h-[60px] px-[30px] text-[17px]")}>
            Create an account
          </Link>
        </section>
      </main>

      <footer className="flex flex-col items-center justify-between gap-4 px-5 pb-10 pt-8 text-sm text-muted sm:flex-row md:px-14">
        <span className="flex items-center gap-2.5">
          <BrandMark size={24} />
          <span>
            <b className="text-ink">KIT Friend</b>, keep in touch
          </span>
        </span>
        <span className="flex gap-5">
          <Link href="/login" className="font-bold hover:text-ink">
            Sign in
          </Link>
          <Link href="/register" className="font-bold hover:text-ink">
            Create an account
          </Link>
        </span>
      </footer>
    </div>
  );
}
