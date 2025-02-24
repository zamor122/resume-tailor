import {GoogleSearchItem, Job} from "@/app/types/job";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export async function GET(req: NextRequest) {
  try {
    // Validate environment variables first
    if (!GOOGLE_CSE_ID || !GOOGLE_API_KEY) {
      console.error('Missing required environment variables:', {
        hasCseId: !!GOOGLE_CSE_ID,
        hasApiKey: !!GOOGLE_API_KEY
      });
      throw new Error('Missing API configuration');
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query) {
      return new NextResponse(
        JSON.stringify({ 
          error: "Search query is required",
          debug: { message: "No query parameter provided" }
        }),
        { status: 400 }
      );
    }

    // Construct Google API URL with more flexible search parameters
    const url = new URL('https://customsearch.googleapis.com/customsearch/v1');
    url.searchParams.append('key', GOOGLE_API_KEY);
    url.searchParams.append('cx', GOOGLE_CSE_ID);
    
    // Add job-specific terms to the query if they're not already present
    const queryTerms = query.toLowerCase();
    const searchQuery = `${query} ${!queryTerms.includes('job') ? 'jobs' : ''} site:(linkedin.com OR indeed.com OR glassdoor.com)`;
    
    url.searchParams.append('q', searchQuery);
    url.searchParams.append('num', '10'); // Number of results

    console.log('Searching with query:', searchQuery);

    // Make the request to Google
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return new NextResponse(
        JSON.stringify({
          error: "Failed to fetch job listings",
          debug: {
            status: response.status,
            statusText: response.statusText,
            googleError: errorText
          }
        }),
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      // Try a more relaxed search if no results found
      url.searchParams.set('q', query + ' jobs');
      const retryResponse = await fetch(url.toString());
      const retryData = await retryResponse.json();
      
      if (!retryData.items) {
        return new NextResponse(
          JSON.stringify({ 
            jobs: [],
            debug: { message: "No results found", data: retryData }
          })
        );
      }
      data.items = retryData.items;
    }

    // Transform and clean up the job listings
    const jobs = data.items.map((item: GoogleSearchItem) => {
      // Extract location from title or snippet if available
      const locationMatch = 
        item.title.match(/in ([^-]+)(?:-|$)/) || 
        item.snippet.match(/in ([^-]+)(?:-|$)/);
      
      // Determine if job is remote
      const isRemote = 
        item.title.toLowerCase().includes('remote') || 
        item.snippet.toLowerCase().includes('remote');

      // Clean up the job title
      const title = item.title
        .replace(/\s*\([^)]*\)/g, '') // Remove parentheses and content
        .replace(/\s*-\s*.+$/, '')    // Remove everything after dash
        .replace(/jobs?(\s|$)/i, '')  // Remove "jobs" or "job"
        .replace(/\s*\|.*$/, '')      // Remove everything after |
        .trim();

      // Extract salary if available
      const salaryMatch = 
        item.snippet.match(/\$[\d,]+ ?- ?\$[\d,]+/) || 
        item.snippet.match(/\$[\d,]+\/year/) ||
        item.snippet.match(/\$[\d,]+\+?/);

      return {
        title,
        link: item.link,
        snippet: item.snippet,
        source: item.displayLink.includes('linkedin.com') ? 'LinkedIn' :
                item.displayLink.includes('indeed.com') ? 'Indeed' :
                item.displayLink.includes('glassdoor.com') ? 'Glassdoor' : 'Other',
        location: locationMatch ? locationMatch[1].trim() : (isRemote ? 'Remote' : null),
        isRemote,
        salary: salaryMatch ? salaryMatch[0] : null,
        postedDate: item.pagemap?.metatags?.[0]?.['og:published_time'] || 
                   item.pagemap?.metatags?.[0]?.['article:published_time'] ||
                   null,
        company: item.pagemap?.organization?.[0]?.name || 
                item.title.match(/at ([^-]+)(?:-|$)/)?.[1]?.trim() || 
                null
      };
    });

    // Filter out duplicate job listings
    const uniqueJobs = jobs.filter((job: Job, index: number, self: Job[]) =>
      index === self.findIndex((j) => 
        j.title === job.title && j.company === job.company
      )
    );

    return new NextResponse(
      JSON.stringify({ jobs: uniqueJobs }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API Route Error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: "Failed to fetch job listings",
        debug: {
          message: error instanceof Error ? error.message : "Unknown error",
          type: error instanceof Error ? error.constructor.name : typeof error
        }
      }),
      { status: 500 }
    );
  }
} 