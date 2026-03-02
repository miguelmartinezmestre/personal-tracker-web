import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserAgentIcon } from './user-agent';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const labels: Record<string, string> = {
      device: 'Device',
      iphone: 'iPhone',
      androidPhone: 'Android Phone',
      smartphone: 'Smartphone',
      ipad: 'iPad',
      androidTablet: 'Android Tablet',
      tablet: 'Tablet',
      smartTv: 'Smart TV',
      wearable: 'Wearable',
      embedded: 'Embedded Device',
      gameConsole: 'Game Console',
      windowsPc: 'Windows PC',
      mac: 'Mac',
      linuxPc: 'Linux PC',
      chromebook: 'Chromebook',
      androidDevice: 'Android Device',
      botCrawler: 'Bot / Crawler',
      unknownOs: 'Unknown OS',
      unknownBrowser: 'Unknown Browser',
    };

    if (key === 'descriptionTemplate') {
      return `${values?.device} ${values?.os} ${values?.browser}`;
    }

    return labels[key] ?? key;
  },
}));

describe('UserAgentIcon', () => {
  it('renders desktop Windows information', () => {
    render(
      <UserAgentIcon userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36" />
    );

    expect(screen.getByText('Windows PC')).toBeInTheDocument();
    expect(screen.getByText(/Chrome/i)).toBeInTheDocument();
  });

  it('renders iPhone information for iOS mobile UA', () => {
    render(
      <UserAgentIcon userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" />
    );

    expect(screen.getByText('iPhone')).toBeInTheDocument();
  });

  it('renders bot label for crawler user agents', () => {
    render(<UserAgentIcon userAgent="Googlebot/2.1 (+http://www.google.com/bot.html)" />);

    expect(screen.getByText('Bot / Crawler')).toBeInTheDocument();
  });
});
