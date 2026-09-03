import { useSiteConfig } from '../hooks/useContent';

export default function LineChatButton() {
  const siteConfig = useSiteConfig();
  const href = siteConfig.lineUrl || 'https://lin.ee/WTC1UGK';
  const label = siteConfig.lineId || 'Line';

  return (
    <a
      href={href}
      className="line-chat-btn"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`แชท Line ${label}`}
      title={`แชท Line ${label}`}
    >
      <svg className="line-chat-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M19.8 10.1c0-3.7-3.7-6.7-8.3-6.7S3.2 6.4 3.2 10.1c0 3.3 2.9 6.1 6.9 6.6.27.06.64.18.73.42.08.22.05.57 0 .8l-.2 1.2c-.06.35-.3 1.37 1.2.75 1.5-.62 8.1-4.77 8.1-9.07zM9.1 12.4H7.6c-.27 0-.48-.2-.48-.46V9.1c0-.26.21-.46.48-.46s.48.2.48.46v2.36h1.02c.27 0 .48.2.48.46s-.21.48-.48.48zm2.4-.46c0 .26-.21.46-.48.46s-.48-.2-.48-.46V9.1c0-.26.21-.46.48-.46s.48.2.48.46v2.84zm3.1.46h-2c-.27 0-.48-.2-.48-.46V9.1c0-.26.21-.46.48-.46h2c.27 0 .48.2.48.46s-.21.46-.48.46h-1.52v.5h1.52c.27 0 .48.2.48.46s-.21.46-.48.46h-1.52v.5h1.52c.27 0 .48.2.48.46s-.21.48-.48.48zm3.1-.46c0 .26-.21.46-.48.46h-1.1c-.27 0-.48-.2-.48-.46V9.1c0-.26.21-.46.48-.46s.48.2.48.46v2.36h.62c.27 0 .48.2.48.46z"
        />
      </svg>
      <span className="line-chat-label">แชท Line</span>
    </a>
  );
}
