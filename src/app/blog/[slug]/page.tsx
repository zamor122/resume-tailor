import React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getPostBySlug } from "@/app/utils/blog";
import { BlogArticleStructuredData } from "@/app/components/StructuredData";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const SITE_URL = "https://airesumetailor.com";

function estimateReadingMinutes(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return { title: "Post Not Found" };
  }
  const url = `${SITE_URL}/blog/${slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.published_at,
      modifiedTime: post.created_at,
      siteName: "AI Resume Tailor",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return (
      <section
        className="max-w-[65ch] mx-auto px-4 sm:px-6 py-16"
        aria-label="Blog post not found"
      >
        <p className="text-gray-500 dark:text-gray-400">Post not found.</p>
        <nav aria-label="Breadcrumb">
          <Link
            href="/blog"
            className="mt-4 inline-block text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            ← Back to Blog
          </Link>
        </nav>
      </section>
    );
  }

  const readingMinutes = estimateReadingMinutes(post.body);
  const formattedDate = new Date(post.published_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <>
      <BlogArticleStructuredData
        title={post.title}
        description={post.description}
        slug={slug}
        publishedAt={post.published_at}
        modifiedAt={post.created_at}
      />
      <section
        className="blog-post-page"
        aria-label="Blog post"
      >
        <nav
          aria-label="Breadcrumb"
          className="max-w-[65ch] mx-auto px-4 sm:px-6 pt-8 pb-4"
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            <span aria-hidden>←</span>
            Back to Blog
          </Link>
        </nav>

        <article
          className="max-w-[65ch] mx-auto px-4 sm:px-6 pb-16"
          itemScope
          itemType="https://schema.org/Article"
        >
          <header className="blog-post-header">
            <h1
              className="blog-post-title"
              itemProp="headline"
            >
              {post.title}
            </h1>
            <div className="blog-post-meta">
              <time
                dateTime={post.published_at}
                itemProp="datePublished"
                className="blog-post-date"
              >
                {formattedDate}
              </time>
              <span className="text-gray-400 dark:text-gray-500" aria-hidden>·</span>
              <span className="blog-post-reading-time" aria-label={`${readingMinutes} min read`}>
                {readingMinutes} min read
              </span>
            </div>
          </header>

          <div className="blog-prose" itemProp="articleBody">
            <ReactMarkdown>{post.body}</ReactMarkdown>
          </div>

          <aside
            className="blog-post-cta"
            aria-label="Call to action"
          >
            <p className="blog-post-cta-text">
              Ready to tailor your resume for your next role?
            </p>
            <Link
              href="/#tailorResume"
              className="blog-post-cta-button"
            >
              Get Started
            </Link>
          </aside>
        </article>
      </section>
    </>
  );
}
