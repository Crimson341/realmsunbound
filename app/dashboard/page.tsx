'use client';

import { useState } from 'react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import Link from 'next/link';

type VaultCategory = 'logins' | 'notes' | 'cards' | 'identities';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<VaultCategory>('logins');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#050505] text-zinc-400">
      {/* Background Grid Effect (matches Hero) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#22c55e15_1px,transparent_1px),linear-gradient(to_bottom,#22c55e15_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-zinc-800/50 bg-[#050505]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-white text-lg tracking-tight">
               {/* Simple Logo Icon */}
               <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20 text-green-500">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                   <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                 </svg>
          </div>
               Valutrix
            </Link>
            <span className="hidden rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-zinc-500 sm:inline-block">
              Personal Vault
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-xs text-right hidden sm:block">
              <div className="text-zinc-300 font-medium">{user?.email}</div>
              <div className="text-zinc-600">Free Plan</div>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-black font-bold text-xs">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 gap-6 p-4 sm:p-6 lg:p-8">
        
        {/* Left Sidebar: Navigation */}
        <aside className="hidden w-64 flex-col gap-6 md:flex">
          <div className="flex flex-col gap-1">
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Vault</h3>
            <NavButton 
              active={activeCategory === 'logins'} 
              onClick={() => setActiveCategory('logins')}
              icon={<LockIcon />} 
              label="Logins" 
              count={142}
            />
            <NavButton 
              active={activeCategory === 'notes'} 
              onClick={() => setActiveCategory('notes')}
              icon={<FileTextIcon />} 
              label="Secure Notes" 
              count={12}
            />
            <NavButton 
              active={activeCategory === 'cards'} 
              onClick={() => setActiveCategory('cards')}
              icon={<CreditCardIcon />} 
              label="Credit Cards" 
              count={4}
            />
            <NavButton 
              active={activeCategory === 'identities'} 
              onClick={() => setActiveCategory('identities')}
              icon={<UserIcon />} 
              label="Identities" 
              count={8}
            />
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Folders</h3>
            <NavButton active={false} onClick={() => {}} icon={<FolderIcon />} label="Work" />
            <NavButton active={false} onClick={() => {}} icon={<FolderIcon />} label="Personal" />
            <NavButton active={false} onClick={() => {}} icon={<FolderIcon />} label="Finance" />
          </div>

          <div className="mt-auto rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
             <div className="mb-2 flex items-center gap-2 text-green-400">
               <ShieldCheckIcon className="h-4 w-4" />
               <span className="text-xs font-semibold">Vault Status: Secure</span>
             </div>
             <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
               <div className="h-full w-[92%] rounded-full bg-green-500" />
             </div>
             <p className="mt-2 text-[10px] text-zinc-500">Last sync: Just now</p>
          </div>
        </aside>

        {/* Center Panel: List View */}
        <section className="flex flex-1 flex-col rounded-2xl border border-zinc-800 bg-[#0a0a0a]/50 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-zinc-800/50 p-4">
            <h2 className="text-lg font-semibold text-white capitalize">{activeCategory}</h2>
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Search vault..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900/50 pl-9 pr-4 text-sm text-zinc-300 placeholder-zinc-600 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/50"
                />
              </div>
              <button className="flex h-9 items-center gap-2 rounded-md bg-green-500 px-3 text-sm font-semibold text-black transition hover:bg-green-400">
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">New Item</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
             {/* List Header */}
             <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-600">
               <div className="col-span-6 sm:col-span-4">Name</div>
               <div className="col-span-4 hidden sm:block">Owner</div>
               <div className="col-span-6 sm:col-span-4 text-right sm:text-left">Last Modified</div>
             </div>

             {/* Mock Items */}
             <div className="space-y-1">
               {MOCK_ITEMS[activeCategory].map((item, i) => (
                 <div key={i} className="group grid cursor-pointer grid-cols-12 gap-4 rounded-lg border border-transparent px-4 py-3 transition-all hover:border-zinc-800 hover:bg-zinc-900/50">
                   <div className="col-span-6 flex items-center gap-3 sm:col-span-4">
                     <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800 text-zinc-400 group-hover:text-white">
                       {item.icon}
                     </div>
                     <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-300 group-hover:text-white">{item.title}</span>
                        <span className="text-[11px] text-zinc-600">{item.subtitle}</span>
                     </div>
                   </div>
                   <div className="col-span-4 hidden items-center text-xs text-zinc-500 sm:flex">
                     Me
                   </div>
                   <div className="col-span-6 flex items-center justify-end gap-4 text-xs text-zinc-500 sm:col-span-4 sm:justify-between">
                     <span>{item.date}</span>
                     <button className="opacity-0 transition-opacity group-hover:opacity-100 text-zinc-400 hover:text-green-400">
                       Copy
                     </button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </section>

        {/* Right Sidebar: Security Audit */}
        <aside className="hidden w-72 flex-col gap-6 lg:flex">
           {/* Security Score Card */}
           <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
             <div className="mb-4 flex items-center justify-between">
               <h3 className="text-sm font-semibold text-white">Security Health</h3>
               <span className="text-xs text-green-500">Excellent</span>
             </div>
             <div className="relative flex items-center justify-center py-4">
                {/* Circular progress mock */}
                <div className="relative h-32 w-32">
                   <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                     <circle className="stroke-zinc-800" cx="50" cy="50" r="45" fill="none" strokeWidth="8" />
                     <circle className="stroke-green-500" cx="50" cy="50" r="45" fill="none" strokeWidth="8" strokeDasharray="283" strokeDashoffset="20" strokeLinecap="round" />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-3xl font-bold text-white">98</span>
                     <span className="text-[10px] uppercase tracking-widest text-zinc-500">Score</span>
                   </div>
                </div>
             </div>
             <button className="mt-4 w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white">
               View Security Report
              </button>
            </div>

           {/* Recent Activity */}
           <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
             <h3 className="mb-4 text-sm font-semibold text-white">Recent Activity</h3>
             <div className="space-y-6">
               {[
                 { title: "New login from Chrome", time: "2m ago", type: "warning" },
                 { title: "Password changed for Gmail", time: "1h ago", type: "success" },
                 { title: "Vault backup created", time: "5h ago", type: "neutral" },
                 { title: "New device added", time: "1d ago", type: "neutral" },
               ].map((activity, i) => (
                 <div key={i} className="flex gap-3">
                    <div className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      activity.type === 'warning' ? 'bg-yellow-500' : 
                      activity.type === 'success' ? 'bg-green-500' : 'bg-zinc-600'
                    }`} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-zinc-300">{activity.title}</span>
                      <span className="text-[10px] text-zinc-600">{activity.time}</span>
                    </div>
                 </div>
               ))}
          </div>
          </div>
        </aside>

      </div>
    </main>
  );
}

// --- Components ---

function NavButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
        active
          ? 'bg-green-500/10 text-green-400 font-medium' 
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <span className={`text-xs ${active ? 'text-green-500' : 'text-zinc-600'}`}>{count}</span>
      )}
    </button>
  );
}

// --- Icons (Simple SVGs) ---

const LockIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const FileTextIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const CreditCardIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const UserIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const FolderIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const ShieldCheckIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const SearchIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PlusIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// --- Mock Data ---

const MOCK_ITEMS: Record<VaultCategory, Array<{ title: string; subtitle: string; date: string; icon: React.ReactNode }>> = {
  logins: [
    { title: "Google Workspace", subtitle: "admin@valutrix.com", date: "Today", icon: <span className="font-bold text-xs">G</span> },
    { title: "GitHub Enterprise", subtitle: "thugbunny", date: "Yesterday", icon: <span className="font-bold text-xs">GH</span> },
    { title: "AWS Root Console", subtitle: "root-account", date: "2d ago", icon: <span className="font-bold text-xs">AW</span> },
    { title: "Slack", subtitle: "team-chat", date: "1w ago", icon: <span className="font-bold text-xs">SL</span> },
    { title: "Linear", subtitle: "project-management", date: "1w ago", icon: <span className="font-bold text-xs">LI</span> },
    { title: "Vercel", subtitle: "deployment", date: "2w ago", icon: <span className="font-bold text-xs">VE</span> },
  ],
  notes: [
    { title: "WiFi Office Guest", subtitle: "Network Credentials", date: "Today", icon: <FileTextIcon /> },
    { title: "Server Recovery Keys", subtitle: "Critical Infrastructure", date: "1mo ago", icon: <FileTextIcon /> },
  ],
  cards: [
    { title: "Chase Business", subtitle: "•••• 4242", date: "2d ago", icon: <CreditCardIcon /> },
    { title: "Amex Platinum", subtitle: "•••• 1001", date: "1mo ago", icon: <CreditCardIcon /> },
  ],
  identities: [
    { title: "John Doe (Work)", subtitle: "San Francisco, CA", date: "3mo ago", icon: <UserIcon /> },
    { title: "John Doe (Personal)", subtitle: "Austin, TX", date: "1y ago", icon: <UserIcon /> },
  ],
};
