import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Spectra',
    },
    links: [
      {
        text: 'Home',
        url: '/',
      },
      {
        text: 'Dashboard',
        url: '/dashboard',
      },
      {
        text: 'SDK',
        url: '/sdk',
      },
    ],
  };
}
