import React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getPostBySlug } from "@/app/utils/blog";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return { title: "Post Not Found" };
  }
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <p className="text-gray-500 dark:text-gray-400">Post not found.</p>
        <Link href="/blog" className="mt-4 inline-block text-cyan-600 dark:text-cyan-400 hover:underline">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link
        href="/blog"
        className="text-sm text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 mb-6 inline-block"
      >
        ← Back to Blog
      </Link>

      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        {post.title}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        {new Date(post.published_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <article className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-cyan-600 dark:prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown>{post.body}</ReactMarkdown>
      </article>

      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
          Ready to tailor your resume for your next role?
        </p>
        <Link
          href="/#tailorResume"
          className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold rounded-xl transition-all"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
