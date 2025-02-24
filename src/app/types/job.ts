export interface Job {
  title: string;
  link: string;
  snippet: string;
  source: string;
  location?: string | null;
  isRemote?: boolean;
  salary?: string | null;
  postedDate: string | null;
  company?: string | null;
}

export interface Location {
  city: string;
  region: string;
  country: string;
}

export interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  pagemap?: {
    metatags?: Array<{
      'og:published_time'?: string;
      'article:published_time'?: string;
    }>;
    organization?: Array<{
      name?: string;
    }>;
  };
} 