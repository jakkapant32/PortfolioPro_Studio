import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useBlogPosts } from '../hooks/useContent';

export default function Blog() {
  const blogPosts = useBlogPosts();
  return (
    <>
      <SEO
        title="บทความ"
        description="บทความความรู้เรื่อง Portfolio, การสมัครงาน และการสร้างภาพลักษณ์ดิจิทัลจาก PortfolioPro Studio"
        keywords="Portfolio สำคัญอย่างไร, เว็บไซต์สมัครงาน, เทคนิคเพิ่มโอกาสได้งาน"
      />

      <header className="page-header">
        <div className="container">
          <div className="section-label">
            <svg><use href="#icon-file" /></svg>
            Blog
          </div>
          <h1 className="page-title">บทความและความรู้</h1>
          <p className="page-desc">
            เคล็ดลับการสร้าง Portfolio การสมัครงาน และการพัฒนาตัวเองในสายงานดิจิทัล
          </p>
        </div>
      </header>

      <section className="blog-section">
        <div className="container">
          <div className="blog-grid">
            {blogPosts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="blog-card">
                <div className="blog-card-img">
                  <img src={post.image} alt={post.title} loading="lazy" />
                </div>
                <div className="blog-card-body">
                  <span className="blog-card-tag">{post.tag}</span>
                  <div className="blog-card-date">{post.date}</div>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
