import { Job } from '../types/job';

interface JobListProps {
  jobs: Job[];
  loading: boolean;
}

export default function JobList({ jobs, loading }: JobListProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          No jobs found. Try adjusting your search terms.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job, index) => (
        <div 
          key={index} 
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 
                     hover:border-green-500 transition-colors bg-white dark:bg-gray-800 
                     shadow-sm hover:shadow-md"
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                <a 
                  href={job.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  {job.title}
                </a>
              </h3>
              {job.company && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {job.company}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                {job.source}
              </span>
              {job.location && (
                <span className="text-sm text-gray-500">
                  {job.location}
                </span>
              )}
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-2">{job.snippet}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {job.isRemote && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                Remote
              </span>
            )}
            {job.salary && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                {job.salary}
              </span>
            )}
            {job.postedDate && (
              <span className="text-xs text-gray-500">
                Posted: {new Date(job.postedDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 