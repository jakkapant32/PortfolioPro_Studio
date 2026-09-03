import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { useBlogPost } from '../hooks/useContent';

export default function BlogPost() {
  const { slug } = useParams();
  const post = useBlogPost(slug);

  if (!post) {
    return (
      <div className="container blog-post">
        <h1>ไม่พบบทความ</h1>
        <Link to="/blog" className="btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
          กลับไปหน้าบทความ
        </Link>
      </div>
    );
  }

  return (
    <>
      <SEO title={post.title} description={post.excerpt} />

      <article className="container blog-post">
        <div className="blog-post-header">
          <span className="blog-card-tag">{post.tag}</span>
          <h1>{post.title}</h1>
          <div className="blog-post-meta">
            <span>{post.date}</span>
            <span>PortfolioPro Studio</span>
          </div>
        </div>
        <div className="blog-post-content" dangerouslySetInnerHTML={{ __html: post.content }} />
        <div style={{ marginTop: 48 }}>
          <Link to="/blog" className="btn-secondary">
            ← กลับไปหน้าบทความ
          </Link>
        </div>
      </article>
    </>
  );
}
