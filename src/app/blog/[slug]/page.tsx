import React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getPostBySlug } from "@/app/utils/blog";
import { BlogArticleStructuredData } from "@/app/components/StructuredData";
import BlogCtaBanner from "@/app/components/BlogCtaBanner";
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
    title: `${post.title} - AI Resume Tailor Field Manual`,
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
      <div className="min-h-screen bg-[#FAF7F0] text-[#1C2028] py-16 px-4">
        <section
          className="max-w-2xl mx-auto neo-box bg-[#F4F1EA] p-8 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl text-center"
          aria-label="Blog post not found"
        >
          <span className="text-4xl block mb-2">🔍</span>
          <h1 className="text-xl font-mono font-bold text-[#1C2028] mb-2">
            Dispatch Not Found
          </h1>
          <p className="text-sm text-gray-600 mb-6 font-mono">
            The requested manual page does not exist or has moved.
          </p>
          <nav aria-label="Breadcrumb">
            <Link
              href="/blog"
              className="neo-btn inline-block bg-[#1C2028] text-white px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider"
            >
              ← Return to Manual Index
            </Link>
          </nav>
        </section>
      </div>
    );
  }

  const readingMinutes = estimateReadingMinutes(post.body);
  const formattedDate = new Date(post.published_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1C2028] py-8 sm:py-12">
      <BlogArticleStructuredData
        title={post.title}
        description={post.description}
        slug={slug}
        publishedAt={post.published_at}
        modifiedAt={post.created_at}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Breadcrumb HUD */}
        <nav aria-label="Breadcrumb" className="flex items-center justify-between">
          <Link
            href="/blog"
            className="neo-tag bg-white hover:bg-[#F4F1EA] text-[#1C2028] text-xs font-mono font-bold px-3 py-1.5 border border-[#1C2028] inline-flex items-center gap-1.5 transition-colors"
          >
            <span aria-hidden>←</span>
            <span>FIELD MANUAL</span>
          </Link>
          <span className="text-xs font-mono text-gray-500">
            {readingMinutes} MIN READ
          </span>
        </nav>

        {/* Article Container */}
        <article
          className="neo-box bg-white p-6 sm:p-10 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl"
          itemScope
          itemType="https://schema.org/Article"
        >
          <header className="mb-8 pb-6 border-b-2 border-[#1C2028]">
            <div className="flex items-center gap-2 mb-3">
              <span className="neo-tag bg-[#FF5722] text-white text-[10px] px-2.5 py-0.5 font-mono font-bold uppercase tracking-wider">
                TACTICAL GUIDE
              </span>
              <time
                dateTime={post.published_at}
                itemProp="datePublished"
                className="text-xs font-mono text-gray-500"
              >
                {formattedDate}
              </time>
            </div>

            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-mono text-[#1C2028] leading-tight tracking-tight mb-4"
              itemProp="headline"
            >
              {post.title}
            </h1>

            <p className="text-sm sm:text-base text-gray-600 font-sans leading-relaxed">
              {post.description}
            </p>
          </header>

          <div
            className="prose prose-slate max-w-none text-[#1C2028] font-sans leading-relaxed space-y-4"
            itemProp="articleBody"
          >
            <ReactMarkdown>{post.body}</ReactMarkdown>
          </div>

          {/* High-Converting Embedded TailorBot CTA Banner */}
          <BlogCtaBanner
            title="Put This Guide Into Practice"
            subtitle="Let TailorBot MK-II scan your target job description and rewrite your resume in 15 seconds."
            buttonText="⚡ RUN FREE RESUME AUDIT"
          />
        </article>
      </div>
    </div>
  );
}
