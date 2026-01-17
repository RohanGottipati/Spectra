'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MenuIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

export function FloatingHeader() {
	const [open, setOpen] = React.useState(false);
	const { user, signOut } = useAuth();
	const router = useRouter();

	const handleLogout = async () => {
		await signOut();
		router.push('/');
		router.refresh();
	};

	const links = [
		{
			label: 'Docs',
			href: '/docs',
		},
		{
			label: 'SDK',
			href: '/sdk',
		},
	];

	return (
		<div className="relative w-full">
			{/* Spectra logo in top left */}
			<Link 
				href="/" 
				className="absolute top-3 left-10 z-50 font-mono font-bold text-xl text-slate-900 hover:text-slate-700 transition-colors"
			>
				spectra
			</Link>

			{/* Centered navbar for Docs, SDK, Logout */}
			<header
				className={cn(
					'sticky top-5 z-50 mx-auto',
					'w-full max-w-md rounded-lg border shadow',
					'bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur-lg',
				)}
			>
				<nav className="mx-auto flex items-center justify-center p-3 relative">
					<div className="flex items-center gap-3">
						<div className="hidden items-center gap-3 lg:flex">
							{links.map((link) => (
								<Link
									key={link.href}
									className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'text-base px-4 py-2' })}
									href={link.href}
								>
									{link.label}
								</Link>
							))}
							<button 
								onClick={handleLogout}
								className={buttonVariants({ variant: 'default', size: 'lg', className: 'text-base px-4 py-2' })}
							>
								Logout
							</button>
						</div>
					</div>
					<div className="absolute right-4 flex items-center gap-2">
						<Sheet open={open} onOpenChange={setOpen}>
							<Button
								size="icon"
								variant="outline"
								onClick={() => setOpen(!open)}
								className="lg:hidden"
							>
								<MenuIcon className="size-4" />
							</Button>
							<SheetContent
								className="bg-background/95 supports-[backdrop-filter]:bg-background/80 gap-0 backdrop-blur-lg"
								showClose={false}
								side="left"
							>
								<div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
									{links.map((link) => (
										<Link
											key={link.href}
											className={buttonVariants({
												variant: 'ghost',
												className: 'justify-start',
											})}
											href={link.href}
										>
											{link.label}
										</Link>
									))}
								</div>
								<SheetFooter>
									<Button variant="outline">Sign In</Button>
									<Button>Get Started</Button>
								</SheetFooter>
							</SheetContent>
					</Sheet>
				</div>
			</nav>
		</header>
		</div>
	);
}
