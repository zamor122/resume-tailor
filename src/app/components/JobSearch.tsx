import { useState, useEffect } from 'react';
import JobList from './JobList';
import { Job, Location } from '../types/job';

export default function JobSearch() {
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Fetch user's location when the checkbox is checked
  useEffect(() => {
    if (useCurrentLocation) {
      setLocationLoading(true);
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          const newLocation = {
            city: data.city,
            region: data.region,
            country: data.country_name
          };
          setUserLocation(newLocation);
          setLocation(`${newLocation.city}, ${newLocation.region}`);
        })
        .catch(err => {
          console.error('Error fetching location:', err);
          setError('Failed to get your location');
          setUseCurrentLocation(false);
        })
        .finally(() => {
          setLocationLoading(false);
        });
    }
  }, [useCurrentLocation]); // Only depend on useCurrentLocation

  const searchJobs = async () => {
    if (!jobTitle.trim()) {
      setError('Please enter a job title');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Construct search query with location if available
      const locationQuery = useCurrentLocation && userLocation 
        ? `${userLocation.city}, ${userLocation.region}`
        : location.trim();
      
      const searchQuery = `${jobTitle.trim()} ${locationQuery} job position`.trim();
      console.log('Client - Searching with query:', searchQuery);

      const url = `/api/jobs?q=${encodeURIComponent(searchQuery)}`;
      console.log('Client - Fetching from URL:', url);

      const response = await fetch(url);
      console.log('Client - Response status:', response.status);

      const data = await response.json();
      console.log('Client - Full response data:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('Client - Error details:', data.debug);
        throw new Error(data.error + (data.debug ? `: ${JSON.stringify(data.debug)}` : ''));
      }
      
      setJobs(data.jobs);
      
      if (data.jobs.length === 0) {
        console.log('Client - No jobs found in response');
        setError('No jobs found. Try adjusting your search terms.');
      } else {
        console.log('Client - Found jobs:', data.jobs.length);
      }
    } catch (err) {
      console.error('Client - Error during search:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationToggle = (checked: boolean) => {
    setUseCurrentLocation(checked);
    if (!checked) {
      setLocation('');
      setUserLocation(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card">
        <div className="space-y-4">
          <div>
            <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Job Title
            </label>
            <input
              id="jobTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer, Product Manager, Marketing Specialist, Data Analyst"
              className="w-full px-4 py-2 h-10 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-400 focus:outline-none"
              onKeyPress={(e) => e.key === 'Enter' && searchJobs()}
            />
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <div className="space-y-2">
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={useCurrentLocation}
                placeholder="e.g. Remote, New York, London"
                className={`w-full px-4 py-2 h-10 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-400 focus:outline-none
                         ${useCurrentLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
                onKeyDown={(e) => e.key === 'Enter' && searchJobs()}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useLocation"
                  checked={useCurrentLocation}
                  onChange={(e) => handleLocationToggle(e.target.checked)}
                  className="h-4 w-4 text-green-500 rounded border-gray-300 focus:ring-green-400"
                />
                <label htmlFor="useLocation" className="text-sm text-gray-600 dark:text-gray-400">
                  {locationLoading ? 'Getting your location...' : 'Use my current location'}
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={searchJobs}
            disabled={loading || !jobTitle.trim()}
            className={`w-full h-10 px-6 rounded-lg font-medium transition-colors
              ${loading || !jobTitle.trim() 
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600 text-white'}`}
          >
            {loading ? 'Searching...' : 'Search Jobs'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <JobList jobs={jobs} loading={loading} />
    </div>
  );
} 