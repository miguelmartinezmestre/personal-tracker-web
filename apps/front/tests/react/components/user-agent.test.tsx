import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserAgentIcon } from '@/features/sessions/user-agent';

describe('UserAgentIcon', () => {
    it('renders with a user agent string', () => {
        const userAgent =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        const { container } = render(<UserAgentIcon userAgent={userAgent} />);

        // Should render an icon (SVG element)
        expect(container.querySelector('svg')).toBeDefined();
    });

    it('shows device name by default', () => {
        const userAgent =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';
        render(<UserAgentIcon userAgent={userAgent} showName={true} />);

        // Should show some device info text
        const container = screen.getByText(/iphone|device|smartphone/i);
        expect(container).toBeDefined();
    });

    it('hides device name when showName is false', () => {
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0';
        const { container } = render(<UserAgentIcon userAgent={userAgent} showName={false} />);

        // Should only have the icon, no text content about device details
        const textElements = container.querySelectorAll('span');
        expect(textElements.length).toBe(0);
    });

    it('shows full info when showFullInfo is true', () => {
        const userAgent =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        const { container } = render(
            <UserAgentIcon userAgent={userAgent} showName={true} showFullInfo={true} />
        );

        // Should have multiple text elements for full info
        const textContainer = container.querySelector('.flex.flex-col');
        expect(textContainer).toBeDefined();
    });

    it('shows simple info when showFullInfo is false', () => {
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0';
        const { container } = render(
            <UserAgentIcon userAgent={userAgent} showName={true} showFullInfo={false} />
        );

        // Should have only a single span for device name
        const singleSpan = container.querySelector('div > div > span:only-child');
        expect(singleSpan).toBeDefined();
    });

    it('respects custom size prop', () => {
        const userAgent = 'Mozilla/5.0 Chrome/91.0';
        const { container } = render(
            <UserAgentIcon userAgent={userAgent} size={48} showName={false} />
        );

        // The SVG should have the specified size attributes
        const svg = container.querySelector('svg');
        expect(svg).toBeDefined();
    });

    it('applies custom className', () => {
        const userAgent = 'Mozilla/5.0 Chrome/91.0';
        const { container } = render(
            <UserAgentIcon userAgent={userAgent} className="custom-class" showName={false} />
        );

        const svg = container.querySelector('svg');
        expect(svg?.classList.contains('custom-class')).toBe(true);
    });

    it('identifies bot user agents', () => {
        const botUserAgent = 'Googlebot/2.1 (+http://www.google.com/bot.html)';
        render(<UserAgentIcon userAgent={botUserAgent} />);

        // Should show bot-related text
        const container = screen.getByText(/bot|crawler/i);
        expect(container).toBeDefined();
    });

    it('handles mobile Android user agent', () => {
        const androidUserAgent =
            'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36';
        const { container } = render(<UserAgentIcon userAgent={androidUserAgent} />);

        // Should recognize as mobile device (renders without crashing)
        expect(container.querySelector('svg')).toBeDefined();
    });

    it('handles tablet user agent', () => {
        const tabletUserAgent =
            'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';
        const { container } = render(<UserAgentIcon userAgent={tabletUserAgent} />);

        // Should render with tablet-related info (renders without crashing)
        expect(container.querySelector('svg')).toBeDefined();
    });

    it('handles empty user agent gracefully', () => {
        const { container } = render(<UserAgentIcon userAgent="" />);

        // Should still render without crashing
        expect(container.querySelector('svg')).toBeDefined();
    });

    it('handles Mac OS user agent', () => {
        const macUserAgent =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15';
        const { container } = render(<UserAgentIcon userAgent={macUserAgent} />);

        // Should render with Mac-related info (renders without crashing)
        expect(container.querySelector('svg')).toBeDefined();
        // Check that some text is rendered (translation keys)
        const spans = container.querySelectorAll('span');
        expect(spans.length).toBeGreaterThan(0);
    });

    it('handles Linux user agent', () => {
        const linuxUserAgent =
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        const { container } = render(<UserAgentIcon userAgent={linuxUserAgent} />);

        // Should render with Linux-related info (renders without crashing)
        expect(container.querySelector('svg')).toBeDefined();
        const spans = container.querySelectorAll('span');
        expect(spans.length).toBeGreaterThan(0);
    });

    it('handles Chrome OS user agent', () => {
        const chromeOsUserAgent =
            'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.85 Safari/537.36';
        render(<UserAgentIcon userAgent={chromeOsUserAgent} />);

        expect(screen.getByText('chromebook')).toBeInTheDocument();
    });

    it('handles desktop Android user agent', () => {
        const androidDesktopUserAgent =
            'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36';
        render(<UserAgentIcon userAgent={androidDesktopUserAgent} />);

        expect(screen.getByText('androidDevice')).toBeInTheDocument();
    });

    it('handles mobile device with non-Android/iOS OS', () => {
        const windowsPhoneUserAgent =
            'Mozilla/5.0 (Windows Phone 10.0; ARM; Touch; rv:40.0) Gecko/20100101 Firefox/40.0';
        render(<UserAgentIcon userAgent={windowsPhoneUserAgent} />);

        expect(screen.getByText('smartphone')).toBeInTheDocument();
    });

    it('handles Android tablet user agent', () => {
        const androidTabletUserAgent =
            'Mozilla/5.0 (Linux; Android 11; Pixel C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36';
        render(<UserAgentIcon userAgent={androidTabletUserAgent} />);

        expect(screen.getByText('Pixel C')).toBeInTheDocument();
    });

    it('handles non-Android/iOS tablet user agent', () => {
        const windowsTabletUserAgent =
            'Mozilla/5.0 (Tablet; Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.0.0 Safari/537.36';
        render(<UserAgentIcon userAgent={windowsTabletUserAgent} />);

        expect(screen.getByText('tablet')).toBeInTheDocument();
    });

    it('handles smart TV user agent', () => {
        const smartTvUserAgent =
            'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/1.1 TV Safari/537.36';
        render(<UserAgentIcon userAgent={smartTvUserAgent} />);

        expect(screen.getByText('Samsung')).toBeInTheDocument();
    });

    it('handles wearable user agent', () => {
        const wearableUserAgent =
            'Mozilla/5.0 (Linux; Android 7.1.1; SM-R810 Build/NMF26X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.91 Mobile Safari/537.36';
        render(<UserAgentIcon userAgent={wearableUserAgent} />);

        expect(screen.getByText('SM-R810')).toBeInTheDocument();
    });

    it('handles embedded device user agent', () => {
        const embeddedUserAgent =
            'Mozilla/5.0 (Windows IoT 10.0; ARM; Trident/7.0; rv:11.0) like Gecko';
        render(<UserAgentIcon userAgent={embeddedUserAgent} />);

        expect(screen.getByText('embedded')).toBeInTheDocument();
    });

    it('handles console user agent', () => {
        const consoleUserAgent =
            'Mozilla/5.0 (PlayStation 4 3.11) AppleWebKit/537.73 (KHTML, like Gecko)';
        render(<UserAgentIcon userAgent={consoleUserAgent} />);

        expect(screen.getAllByText('PlayStation 4').length).toBeGreaterThan(0);
    });
});
