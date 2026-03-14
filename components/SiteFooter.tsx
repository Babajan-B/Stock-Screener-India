import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="px-4 pb-6 pt-2 sm:px-6 lg:px-8">
      <div className="theme-panel mx-auto max-w-7xl rounded-[28px] px-6 py-4">
        <div className="flex flex-col gap-2 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
          <p>
            Developed and maintained by Dr Babajan.
          </p>
          <div className="flex flex-col gap-1 text-slate-400 md:items-end">
            <p>
              Email:{' '}
              <Link href="mailto:b.babajaan@gmail.com" className="text-orange-300 hover:text-orange-200">
                b.babajaan@gmail.com
              </Link>
            </p>
            <p>
              AI tools: Claude, OpenAI, and Gemini
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
