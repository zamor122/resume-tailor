import React from "react";
import Link from "next/link";
import { getAllPosts } from "@/app/utils/blog";
import BlogCtaBanner from "@/app/components/BlogCtaBanner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Career & ATS Optimization Field Manual - AI Resume Tailor",
  description:
    "Tactical guides on resume tailoring, ATS parsing algorithms, and Google X-Y-Z formula rewriting. Learn how to beat recruiter filters.",
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1C2028] py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header HUD */}
        <div className="neo-box bg-[#F4F1EA] p-6 sm:p-8 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="neo-tag bg-[#FF5722] text-white text-[10px] px-2.5 py-0.5 font-mono font-bold uppercase tracking-wider">
              FIELD DISPATCHES
            </span>
            <span className="text-xs font-mono text-gray-500">
              UPDATED WEEKLY • ATS LABS
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-[#1C2028] mb-3">
            The Resume Engineering Manual
          </h1>
          <p className="text-sm sm:text-base text-gray-700 font-sans max-w-2xl leading-relaxed">
            Data-backed breakdowns on Applicant Tracking Systems, keyword alignment algorithms, and proven bullet formulas to land more interviews.
          </p>
        </div>

        {/* Top CTA Banner */}
        <BlogCtaBanner
          title="Audit Your Resume in Real-Time"
          subtitle="Before applying to your next role, see the exact keywords recruiters and ATS algorithms look for."
          buttonText="⚡ START FREE AUDIT"
        />

        {/* Posts Grid / List */}
        {posts.length === 0 ? (
          <div className="neo-box bg-white p-8 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl text-center">
            <p className="text-gray-600 font-mono text-sm">
              No field dispatches published yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="neo-box bg-white p-6 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#1C2028] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-500">
                    <time dateTime={post.published_at}>
                      {new Date(post.published_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                    <span className="neo-tag bg-[#FAF7F0] text-gray-700 text-[10px] px-2 py-0.5">
                      GUIDE
                    </span>
                  </div>

                  <h2 className="text-lg font-bold font-mono text-[#1C2028] leading-snug hover:text-[#FF5722] transition-colors">
                    <Link href={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h2>

                  <p className="text-xs sm:text-sm text-gray-600 font-sans line-clamp-3 leading-relaxed">
                    {post.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-200 flex items-center justify-between">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-xs font-mono font-bold text-[#FF5722] hover:underline flex items-center gap-1"
                  >
                    <span>READ MANUAL</span>
                    <span>→</span>
                  </Link>
                  <span className="text-[11px] font-mono text-gray-400">
                    5 min read
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Bottom CTA Banner */}
        <div className="pt-6">
          <BlogCtaBanner
            title="Ready to Boost Your ATS Score?"
            subtitle="Join over 10,000+ job seekers who tailor their resumes with TailorBot MK-II."
            buttonText="⚡ OPTIMIZE MY RESUME NOW"
          />
        </div>
      </div>
    </div>
  );
}
