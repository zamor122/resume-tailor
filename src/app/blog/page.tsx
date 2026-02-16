import React from "react";
import Link from "next/link";
import { getAllPosts } from "@/app/utils/blog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog - AI Resume Tailor",
  description:
    "Tips and guides on resume tailoring, ATS optimization, and job search. Learn how to tailor your resume for each role and get more interviews.",
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Blog
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
        Tips and guides on resume tailoring, ATS optimization, and job search.
      </p>

      {posts.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No posts yet. Check back soon—we publish new content regularly.
        </p>
      ) : (
        <ul className="space-y-8">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="block group"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(post.published_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                  {post.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-16 text-center">
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold rounded-xl transition-all"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
