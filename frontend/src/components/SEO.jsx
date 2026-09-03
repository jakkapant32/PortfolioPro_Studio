import { Helmet } from 'react-helmet-async';
import { siteConfig } from '../config/site';

export default function SEO({ title, description, keywords, path = '' }) {
  const fullTitle = title
    ? `${title} | ${siteConfig.name}`
    : `รับทำ Portfolio Website | ${siteConfig.name}`;

  const defaultDescription =
    'บริการรับออกแบบ Portfolio Website และเว็บไซต์องค์กร เพิ่มโอกาสในการสมัครงานและสร้างภาพลักษณ์ดิจิทัล';

  const defaultKeywords =
    'รับทำ Portfolio Website, เว็บไซต์สมัครงาน, เว็บ Portfolio นักศึกษา, รับทำเว็บไซต์องค์กร, Website Developer Thailand';

  const canonical = `${siteConfig.siteUrl}${path}`;

  return (
    <Helmet>
      <html lang="th" />
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta name="keywords" content={keywords || defaultKeywords} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={`${siteConfig.siteUrl}/logo-icon.png`} />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
}
