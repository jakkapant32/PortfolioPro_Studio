import { useEffect, useState } from 'react';
import { portfolioItems as fallbackPortfolio, getPortfolioBySlug as fallbackBySlug } from '../data/portfolio';
import { blogPosts as fallbackBlog } from '../data/blog';
import { siteConfig as fallbackSite } from '../config/site';

import { API_URL } from '../config/api';

export function usePortfolio() {
  const [items, setItems] = useState(fallbackPortfolio);
  useEffect(() => {
    fetch(`${API_URL}/api/portfolio`)
      .then((r) => r.json())
      .then((d) => { if (d.items?.length) setItems(d.items); })
      .catch(() => {});
  }, []);
  return items;
}

export function usePortfolioItem(slug) {
  const [item, setItem] = useState(() => fallbackBySlug(slug));
  useEffect(() => {
    if (!slug) return;
    fetch(`${API_URL}/api/portfolio/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.slug) setItem(d); else setItem(fallbackBySlug(slug)); })
      .catch(() => setItem(fallbackBySlug(slug)));
  }, [slug]);
  return item;
}

export function useBlogPosts() {
  const [posts, setPosts] = useState(fallbackBlog);
  useEffect(() => {
    fetch(`${API_URL}/api/blog`)
      .then((r) => r.json())
      .then((d) => { if (d.items?.length) setPosts(d.items); })
      .catch(() => {});
  }, []);
  return posts;
}

export function useBlogPost(slug) {
  const [post, setPost] = useState(() => fallbackBlog.find((p) => p.slug === slug));
  useEffect(() => {
    if (!slug) return;
    fetch(`${API_URL}/api/blog/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.slug) setPost(d);
        else setPost(fallbackBlog.find((p) => p.slug === slug));
      })
      .catch(() => setPost(fallbackBlog.find((p) => p.slug === slug)));
  }, [slug]);
  return post;
}

export function useSiteConfig() {
  const [config, setConfig] = useState(fallbackSite);
  useEffect(() => {
    fetch(`${API_URL}/api/site-config`)
      .then((r) => r.json())
      .then((d) => { if (d?.email) setConfig({ ...fallbackSite, ...d }); })
      .catch(() => {});
  }, []);
  return config;
}
